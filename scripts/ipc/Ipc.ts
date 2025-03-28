import {HandleListenerResult, IEnvironment, IIpc, IpcMessageReceiveEvent, IpcMessageType} from "./api";
import {system} from "@minecraft/server";
import {IpcMode} from "../lib";
import {SerializeCommandParamOptions, SerializerUtils} from "../util";
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
  private static BroadcastEnvId = 'ipc_broadcast';
  public readonly scriptEnv: IEnvironment;

  constructor(scriptEnv: IEnvironment) {
    this.scriptEnv = scriptEnv;
  }

  public static register(identifier: string, uuid: string) {
    return new Ipc({identifier, uuid});
  }

  private postByParamOptions(options: SerializeCommandParamOptions) {
    const {id, message} = SerializerUtils.serialize(options);
    system.sendScriptEvent(id, message);
  }

  private post(mode: IpcMode, identifier: string, value: IpcMessageType, targetEnvId: string) {
    this.postByParamOptions({
      senderEnvId: this.scriptEnv.identifier, targetEnvId, value,
      metadata: {
        mode, identifier
      }
    });
  }

  private postToAll(mode: IpcMode, identifier: string, value: IpcMessageType, targetEnvIdList: string[]) {
    SerializerUtils.serializeAll(targetEnvIdList, {
      senderEnvId: this.scriptEnv.identifier, value,
      metadata: {
        mode, identifier
      }
    }).forEach(({id, message}) => system.sendScriptEvent(id, message));
  }

  private listenScriptEvent(listener: (arg: IpcListenScriptEventEvent) => void) {
    const thisEnvId = this.scriptEnv.identifier;
    const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
      const {id, message} = event;
      if (!id) return;
      const {metadataStr, senderEnvId, targetEnvId} = SerializerUtils.deserializeScriptEventId(id);
      if (!senderEnvId) return;
      listener({metadataStr, senderEnvId, targetEnvId, message});
    }, {namespaces: [thisEnvId, Ipc.BroadcastEnvId]});

    return () => {
      system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
    };
  }

  private assertNotBroadcastEnvId(targetEnvId: string, errorMessage: string) {
    if (!targetEnvId) return;
    if (targetEnvId === Ipc.BroadcastEnvId) {
      throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
    }
  }

  private assertNotIncludeBroadcastEnvId(targetEnvIds: string[], errorMessage: string) {
    if (!targetEnvIds) return;
    if (targetEnvIds.includes(Ipc.BroadcastEnvId)) {
      throw new Error(`${errorMessage}! Env id list can not include Broadcast Env Id`);
    }
  }

  private assertNotBeOrIncludeBroadcastEnvId(targetEnvIds: string | string[], errorMessage: string) {
    if (typeof targetEnvIds === "string") {
      this.assertNotBroadcastEnvId(targetEnvIds, errorMessage);
    } else {
      this.assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage);
    }
  }

  public send(identifier: string, value: IpcMessageType, targetEnvId: string): void;
  public send(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): void;
  public send(identifier: string, value: IpcMessageType, targetEnvIds: string | string[]): void {
    this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Send message failed");
    if (typeof targetEnvIds === "string") {
      this.post(IpcMode.Message, identifier, value, targetEnvIds);
      return;
    }
    if (targetEnvIds.length === 0) return;
    this.postToAll(IpcMode.Message, identifier, value, targetEnvIds);
  }

  public broadcast(identifier: string, value: IpcMessageType): void {
    this.post(IpcMode.Message, identifier, value, Ipc.BroadcastEnvId);
  }

  public on(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void {
    return this.listenScriptEvent((event) => {
      const {senderEnvId, metadataStr, message} = event;
      // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);

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
    this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Invoke method failed");
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
      }, {namespaces: [thisEnvId, Ipc.BroadcastEnvId]});
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
    this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
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

