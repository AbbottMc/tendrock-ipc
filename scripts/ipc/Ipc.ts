import {IEnvironment} from "./api/IEnvironment";
import {HandleListenerResult, IIpc, IpcMessageReceiveEvent, IpcMessageType} from "./api/IIpc";
import {Dimension, system, world} from "@minecraft/server";
import {MinecraftDimensionTypes} from "@minecraft/vanilla-data";
import {IpcMode} from "../lib/IpcMode";
import {IpcUtils} from "../util/IpcUtils";
import {SerializeCommandParamOptions, SerializerUtils} from "../util/SerializerUtils";
import {AsyncUtils} from "../util/AsyncUtils";

export interface DebounceEventOptions {
  merge: (event: IpcMessageReceiveEvent, last?: IpcMessageReceiveEvent) => any,
  delayTicks: number,
  leading?: boolean
}

export interface IpcListenScriptEventEvent {
  metadataStr: string
  senderEnvId: string
  targetEnvId: string
  message: string
}

export interface IpcInvokeResult {
  value: IpcMessageType;
  envId: string;
}


export class Ipc implements IIpc {
  public readonly scriptEnv: IEnvironment;
  private _overworld: Dimension;

  constructor(scriptEnv: IEnvironment) {
    this.scriptEnv = scriptEnv;
    this._overworld = world.getDimension(MinecraftDimensionTypes.Overworld);
  }

  public static register(identifier: string, uuid: string) {
    return new Ipc({identifier, uuid});
  }

  private executeCommand(commandStr: string) {
    console.log(commandStr);
    this._overworld.runCommand(commandStr);
  }

  private postByParamOptions(options: SerializeCommandParamOptions) {
    this.executeCommand(SerializerUtils.serialize(options));
  }

  private post(mode: IpcMode, identifier: string, value: IpcMessageType, targetEnvId: string) {
    this.postByParamOptions({
      senderEnvId: this.scriptEnv.identifier, targetEnvId, value,
      metadata: {
        mode, identifier
      }
    })
  }

  private postToAll(mode: IpcMode, identifier: string, value: IpcMessageType, targetEnvIdList: string[]) {
    SerializerUtils.serializeAll(targetEnvIdList, {
      senderEnvId: this.scriptEnv.identifier, value,
      metadata: {
        mode, identifier
      }
    }).forEach((commandStr) => this.executeCommand(commandStr));
  }

  private listenScriptEvent(listener: (arg: IpcListenScriptEventEvent) => void) {
    const thisEnvId = this.scriptEnv.identifier;
    const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
      const {id, message} = event;
      if (!id) return;
      const {metadataStr, senderEnvId, targetEnvId} = SerializerUtils.deserializeScriptEventId(id);
      if (!senderEnvId) return;
      listener({metadataStr, senderEnvId, targetEnvId, message});
    }, {namespaces: [thisEnvId, IpcUtils.BroadcastEnvId]});

    return () => {
      system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
    };
  }

  public send(identifier: string, value: IpcMessageType, targetEnvId: string): void;
  public send(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): void;
  public send(identifier: string, value: IpcMessageType, targetEnvIds: string | string[]): void {
    if (typeof targetEnvIds === "string") {
      this.post(IpcMode.Message, identifier, value, targetEnvIds);
      return;
    }
    if (targetEnvIds.length === 0) return;
    this.postToAll(IpcMode.Message, identifier, value, targetEnvIds);
  }

  public broadcast(identifier: string, value: IpcMessageType): void {
    this.post(IpcMode.Message, identifier, value, IpcUtils.BroadcastEnvId);
  }

  public on(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void {
    return this.listenScriptEvent((event) => {
      const {senderEnvId, metadataStr, message} = event;
      console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);

      const metadata = SerializerUtils.deserializeMetadata(metadataStr);
      if (metadata.mode !== IpcMode.Message) return;
      if (!metadata.identifier || metadata.identifier !== identifier) return;

      listener({
        identifier: metadata.identifier,
        value: SerializerUtils.deserializeData(message),
        senderEnvId
      });
    });
  }

  public once(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void {
    const dispose = this.on(identifier, (event) => {
      listener(event);
      dispose();
    });
    return dispose;
  }

  public debounce(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void, options: DebounceEventOptions) {
    const {merge, leading = false, delayTicks} = options;
    let lastEvent: IpcMessageReceiveEvent | undefined;
    let timeoutId: number | undefined;
    const trigger = (event: IpcMessageReceiveEvent) => {
      listener(event);
      lastEvent = undefined;
    };

    this.on(identifier, (event) => {
      const currentEvent = merge(event, lastEvent);
      if (leading && !timeoutId) {
        trigger(currentEvent);
      } else {
        if (timeoutId) {
          system.clearRun(timeoutId);
        }
        timeoutId = system.runTimeout(() => {
          trigger(currentEvent);
          timeoutId = undefined;
        }, delayTicks);
        lastEvent = currentEvent;
      }
    });

    return this;
  }

  public invoke(identifier: string, value: IpcMessageType, targetEnvId: string): Promise<IpcInvokeResult>;
  public invoke(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): Promise<IpcInvokeResult[]>;
  public invoke(identifier: string, value: IpcMessageType, targetEnvIds: string | string[]): Promise<IpcInvokeResult | IpcInvokeResult[]> {
    const result = new Promise<IpcInvokeResult | IpcInvokeResult[]>((resolve, reject) => {
      const thisEnvId = this.scriptEnv.identifier;
      let resolveTimes = 0;
      const invokeResults: IpcInvokeResult[] = [];
      const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
        const {id, message} = event;
        if (!id) return;
        const {metadataStr, senderEnvId} = SerializerUtils.deserializeScriptEventId(id);
        if (!senderEnvId) return;

        const metadata = SerializerUtils.deserializeMetadata(metadataStr);
        if (metadata.mode !== IpcMode.InvokeResult) return;

        if (!metadata.identifier || metadata.identifier !== identifier) return;
        // if (senderEnvId === thisEnvId) {
        //   reject();
        //   return;
        // }
        const result = {
          value: SerializerUtils.deserializeData(message),
          envId: senderEnvId
        };
        if (typeof targetEnvIds === 'string') {
          resolve(result);
          system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        } else {
          invokeResults.push(result);
        }
        resolveTimes++;
        if (resolveTimes >= targetEnvIds.length) {
          resolve(invokeResults);
          system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        }
      }, {namespaces: [thisEnvId, IpcUtils.BroadcastEnvId]});
    });
    if (typeof targetEnvIds === "string") {
      this.post(IpcMode.Invoke, identifier, value, targetEnvIds)
    } else {
      this.postToAll(IpcMode.Invoke, identifier, value, targetEnvIds);
    }
    return result;
  }

  public handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult): void;
  public handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult, senderEnvFilter: string[]): void;
  public handle(identifier: string, listener: (arg: IpcMessageType) => HandleListenerResult, senderEnvFilter?: string[]): (() => void) {
    const thisEnvId = this.scriptEnv.identifier;
    return this.listenScriptEvent((event) => {
      const {senderEnvId, metadataStr, message} = event;
      if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId)) return;

      const metadata = SerializerUtils.deserializeMetadata(metadataStr);
      if (metadata.mode !== IpcMode.Invoke) return;
      if (!metadata.identifier || metadata.identifier !== identifier) return;

      const invokeRetPromise = AsyncUtils.awaitIfAsync<IpcMessageType | undefined>(listener(SerializerUtils.deserializeData(message)));
      invokeRetPromise.then((retValue) => {
        this.postByParamOptions({
          senderEnvId: thisEnvId, targetEnvId: senderEnvId, value: retValue,
          metadata: {
            mode: IpcMode.InvokeResult, identifier: identifier
          }
        });
      });
    });
  };
}

