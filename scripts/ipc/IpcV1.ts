import {
  DebounceEventOptions, HandleListenerResult, IEnvironment, IIpc, IMetadata, IpcInvokeResult, IpcListenScriptEventEvent,
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

  private postMessage(message: string, options: SerializeScriptEventIdOptions) {
    const id = this._serializer.serializeToScriptEventId(options);
    system.sendScriptEvent(id, message);
  }

  private postMessagePieces(messages: string[], options: SerializeScriptEventIdOptions) {
    messages.forEach((message, index) => {
      options.metadata.packet_number = messages.length - 1 - index;
      const id = this._serializer.serializeToScriptEventId(options);
      system.sendScriptEvent(id, message);
    });
  }

  private postByParamOptions(value: IpcMessageType, options: SerializeScriptEventIdOptions, messages?: string | string[]) {
    messages ??= this._serializer.serializeData(value, options.metadata.encoding);
    if (typeof messages === 'string') {
      this.postMessage(messages, options);
    } else {
      this.postMessagePieces(messages, options);
    }
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
    const messages = this._serializer.serializeData(value, 'json');
    const options: SerializeScriptEventIdOptions = {
      senderEnvId: this.scriptEnv.identifier,
      header: {version: IpcVersion.V1},
      metadata: {
        packet_type: packetType, packet_id: identifier
      },
      targetEnvId: undefined
    };
    if (typeof messages === 'string') {
      this._serializer.serializeAllToScriptEventId(targetEnvIdList, options).forEach((id) => system.sendScriptEvent(id, messages));
    } else {
      targetEnvIdList.forEach((targetEnvId) => {
        options.targetEnvId = targetEnvId;
        this.postMessagePieces(messages, options);
      });
    }
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

  private _mergeMessagePackets(messagePackets: string[]) {
    return messagePackets.reduce((acc, cur) => acc + cur);
  }

  private _getFullMessage(message: string, metadata: IMetadata, msgPackets: string[]) {
    if (metadata.packet_number === undefined) {
      return message;
    }
    msgPackets.push(message);
    if (metadata.packet_number === 0) {
      return this._mergeMessagePackets(msgPackets);
    } else {
      return undefined;
    }
  }

  private deserializeMetadata(metadataStr: string, packetType: IpcPacketType, packetId: string) {
    const metadata = this._serializer.deserializeMetadata(metadataStr);
    if (metadata.packet_type !== packetType) return {metadata, skipByMetadata: true};

    if (!metadata.packet_id || metadata.packet_id !== packetId) return {metadata, skipByMetadata: true};

    return {metadata, skipByMetadata: false};
  }

  private deserializeHeader(headerStr: string, version: IpcVersion) {
    const header = this._serializer.deserializeHeader(headerStr);
    if (header.version !== version) return {header, skipByHeader: true};
    return {header, skipByHeader: false};
  }

  public on(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void {
    const msgPackets: string[] = [];
    return this.listenScriptEvent((event) => {
      const {senderEnvId, headerStr, metadataStr, message} = event;
      // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);

      const header = this._serializer.deserializeHeader(headerStr);
      if (header.version !== IpcVersion.V1) return;

      const metadata = this._serializer.deserializeMetadata(metadataStr);
      if (metadata.packet_type !== IpcPacketType.Message) return;
      if (!metadata.packet_id || metadata.packet_id !== identifier) return;

      const fullMessage = this._getFullMessage(message, metadata, msgPackets);
      if (fullMessage === undefined) return;

      listener({
        packetId: metadata.packet_id,
        value: this._serializer.deserializeData(fullMessage, metadata.encoding),
        senderEnvId
      });
      msgPackets.length = 0;
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
      const msgPackets: string[] = [];
      const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
        const {id, message} = event;
        if (!id) return;
        const {headerStr, metadataStr, senderEnvId} = this._serializer.deserializeScriptEventId(id);
        if (!senderEnvId) return;

        const {header, skipByHeader} = this.deserializeHeader(headerStr, IpcVersion.V1);
        if (skipByHeader) return;

        const {metadata, skipByMetadata} = this.deserializeMetadata(
          metadataStr, IpcPacketType.InvokeResult, identifier
        );
        if (skipByMetadata) return;

        const fullMessage = this._getFullMessage(message, metadata, msgPackets);
        if (fullMessage === undefined) return;

        const resolvePromise = (results: IpcInvokeResult | IpcInvokeResult[]) => {
          resolve(results);
          msgPackets.length = 0;
          system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        };
        const result = {
          value: this._serializer.deserializeData(fullMessage, metadata.encoding),
          envId: senderEnvId
        };
        if (typeof targetEnvIds === 'string') {
          resolvePromise(result);
        } else {
          invokeResults.push(result);
        }
        resolveTimes++;
        if (resolveTimes >= targetEnvIds.length) {
          resolvePromise(invokeResults);
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
    const msgPackets: string[] = [];
    return this.listenScriptEvent((event) => {
      const {senderEnvId, headerStr, metadataStr, message} = event;
      if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId)) return;

      const {header, skipByHeader} = this.deserializeHeader(headerStr, IpcVersion.V1);
      if (skipByHeader) return;

      const {metadata, skipByMetadata} = this.deserializeMetadata(metadataStr, IpcPacketType.Invoke, identifier);
      if (skipByMetadata) return;

      const fullMessage = this._getFullMessage(message, metadata, msgPackets);
      if (fullMessage === undefined) return;

      const invokeRetPromise = AsyncUtils.awaitIfAsync<IpcMessageType | undefined>(listener(this._serializer.deserializeData(fullMessage, metadata.encoding)));
      invokeRetPromise.then((retValue) => {
        this.postByParamOptions(retValue, {
          senderEnvId: thisEnvId, targetEnvId: senderEnvId,
          header: {version: IpcVersion.V1},
          metadata: {
            packet_type: IpcPacketType.InvokeResult, packet_id: identifier
          }
        });
      });
      msgPackets.length = 0;
    });
  };
}

