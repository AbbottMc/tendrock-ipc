import {
  DebounceEventOptions, HandleListenerResult, IEnvironment, IIpc, IpcInvokeResult, IpcListenScriptEventEvent,
  IpcMessageReceiveEvent, IpcMessageType, SerializeScriptEventIdOptions
} from "../api";
import {system} from "@minecraft/server";
import {IpcPacketType, IpcVersion} from "../lib";
import {AsyncUtils} from "../util/AsyncUtils";
import {Serializers} from "../ref";

export class IpcV1 implements IIpc {
  private static BroadcastEnvId = 'ipc_broadcast';
  public readonly scriptEnv: IEnvironment;
  private readonly _serializer = Serializers.V1;

  constructor(scriptEnv: IEnvironment) {
    this.scriptEnv = scriptEnv;
  }

  public static register(identifier: string, uuid: string) {
    return new IpcV1({identifier, uuid});
  }

  private postByParamOptions(value: IpcMessageType, options: SerializeScriptEventIdOptions) {
    const id = this._serializer.serializeToScriptEventId(options);
    const message = this._serializer.serializeData(value, options.metadata.encoding);
    system.sendScriptEvent(id, message);
  }

  private post(packetType: IpcPacketType, identifier: string, value: IpcMessageType, targetEnvId: string) {
    this.postByParamOptions(value, {
      senderEnvId: this.scriptEnv.identifier, targetEnvId,
      header: {version: IpcVersion.V1},
      metadata: {
        packet_type: packetType, packet_id: identifier
      }
    });
  }

  private postToAll(packetType: IpcPacketType, identifier: string, value: IpcMessageType, targetEnvIdList: string[]) {
    const message = this._serializer.serializeData(value, 'json');
    this._serializer.serializeAllToScriptEventId(targetEnvIdList, {
      senderEnvId: this.scriptEnv.identifier,
      header: {version: IpcVersion.V1},
      metadata: {
        packet_type: packetType, packet_id: identifier
      }
    }).forEach((id) => system.sendScriptEvent(id, message));
  }

  private listenScriptEvent(listener: (arg: IpcListenScriptEventEvent) => void) {
    const thisEnvId = this.scriptEnv.identifier;
    const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
      const {id, message} = event;
      if (!id) return;
      const {headerStr, metadataStr, senderEnvId, targetEnvId} = this._serializer.deserializeScriptEventId(id);
      if (!senderEnvId) return;
      listener({headerStr, metadataStr, senderEnvId, targetEnvId, message});
    }, {namespaces: [thisEnvId, IpcV1.BroadcastEnvId]});

    return () => {
      system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
    };
  }

  private assertNotBroadcastEnvId(targetEnvId: string, errorMessage: string) {
    if (!targetEnvId) return;
    if (targetEnvId === IpcV1.BroadcastEnvId) {
      throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
    }
  }

  private assertNotIncludeBroadcastEnvId(targetEnvIds: string[], errorMessage: string) {
    if (!targetEnvIds) return;
    if (targetEnvIds.includes(IpcV1.BroadcastEnvId)) {
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
      this.post(IpcPacketType.Message, identifier, value, targetEnvIds);
      return;
    }
    if (targetEnvIds.length === 0) return;
    this.postToAll(IpcPacketType.Message, identifier, value, targetEnvIds);
  }

  public broadcast(identifier: string, value: IpcMessageType): void {
    this.post(IpcPacketType.Message, identifier, value, IpcV1.BroadcastEnvId);
  }

  public on(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void {
    return this.listenScriptEvent((event) => {
      const {senderEnvId, headerStr, metadataStr, message} = event;
      // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);

      const header = this._serializer.deserializeHeader(headerStr);
      if (header.version !== IpcVersion.V1) return;

      const metadata = this._serializer.deserializeMetadata(metadataStr);
      if (metadata.packet_type !== IpcPacketType.Message) return;
      if (!metadata.packet_id || metadata.packet_id !== identifier) return;

      listener({
        packetId: metadata.packet_id,
        value: this._serializer.deserializeData(message, metadata.encoding),
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
        const {headerStr, metadataStr, senderEnvId} = this._serializer.deserializeScriptEventId(id);
        if (!senderEnvId) return;

        const header = this._serializer.deserializeHeader(headerStr);
        if (header.version !== IpcVersion.V1) return;

        const metadata = this._serializer.deserializeMetadata(metadataStr);
        if (metadata.packet_type !== IpcPacketType.InvokeResult) return;

        if (!metadata.packet_id || metadata.packet_id !== identifier) return;
        // if (senderEnvId === thisEnvId) {
        //   reject();
        //   return;
        // }
        const result = {
          value: this._serializer.deserializeData(message, metadata.encoding),
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
      }, {namespaces: [thisEnvId, IpcV1.BroadcastEnvId]});
    });
    if (typeof targetEnvIds === "string") {
      this.post(IpcPacketType.Invoke, identifier, value, targetEnvIds)
    } else {
      this.postToAll(IpcPacketType.Invoke, identifier, value, targetEnvIds);
    }
    return result;
  }

  public handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult): void;
  public handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult, senderEnvFilter: string[]): void;
  public handle(identifier: string, listener: (arg: IpcMessageType) => HandleListenerResult, senderEnvFilter?: string[]): (() => void) {
    this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
    const thisEnvId = this.scriptEnv.identifier;
    return this.listenScriptEvent((event) => {
      const {senderEnvId, headerStr, metadataStr, message} = event;
      if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId)) return;

      const header = this._serializer.deserializeHeader(headerStr);
      if (header.version !== IpcVersion.V1) return;

      const metadata = this._serializer.deserializeMetadata(metadataStr);
      if (metadata.packet_type !== IpcPacketType.Invoke) return;
      if (!metadata.packet_id || metadata.packet_id !== identifier) return;

      const invokeRetPromise = AsyncUtils.awaitIfAsync<IpcMessageType | undefined>(listener(this._serializer.deserializeData(message, metadata.encoding)));
      invokeRetPromise.then((retValue) => {
        this.postByParamOptions(retValue, {
          senderEnvId: thisEnvId, targetEnvId: senderEnvId,
          header: {version: IpcVersion.V1},
          metadata: {
            packet_type: IpcPacketType.InvokeResult, packet_id: identifier
          }
        });
      });
    });
  };
}

