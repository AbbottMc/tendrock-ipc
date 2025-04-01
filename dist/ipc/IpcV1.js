import { system } from "@minecraft/server";
import { IpcPacketType, IpcVersion } from "../lib";
import { AsyncUtils } from "../util/AsyncUtils";
import { Serializers } from "../ref";
export class IpcV1 {
    constructor(scriptEnv) {
        this._serializer = Serializers.V1;
        this.scriptEnv = scriptEnv;
    }
    static register(identifier, uuid) {
        return new IpcV1({ identifier, uuid });
    }
    postMessage(message, options) {
        const id = this._serializer.serializeToScriptEventId(options);
        system.sendScriptEvent(id, message);
    }
    postMessagePieces(messages, options) {
        messages.forEach((message, index) => {
            options.metadata.packet_number = messages.length - 1 - index;
            const id = this._serializer.serializeToScriptEventId(options);
            system.sendScriptEvent(id, message);
        });
    }
    postByParamOptions(value, options, messages) {
        messages !== null && messages !== void 0 ? messages : (messages = this._serializer.serializeData(value, options.metadata.encoding));
        if (typeof messages === 'string') {
            this.postMessage(messages, options);
        }
        else {
            this.postMessagePieces(messages, options);
        }
    }
    post(packetType, identifier, value, targetEnvId) {
        this.postByParamOptions(value, {
            senderEnvId: this.scriptEnv.identifier, targetEnvId,
            header: { version: IpcVersion.V1 },
            metadata: {
                packet_type: packetType, packet_id: identifier
            }
        });
    }
    postToAll(packetType, identifier, value, targetEnvIdList) {
        const messages = this._serializer.serializeData(value, 'json');
        const options = {
            senderEnvId: this.scriptEnv.identifier,
            header: { version: IpcVersion.V1 },
            metadata: {
                packet_type: packetType, packet_id: identifier
            },
            targetEnvId: undefined
        };
        if (typeof messages === 'string') {
            this._serializer.serializeAllToScriptEventId(targetEnvIdList, options).forEach((id) => system.sendScriptEvent(id, messages));
        }
        else {
            targetEnvIdList.forEach((targetEnvId) => {
                options.targetEnvId = targetEnvId;
                this.postMessagePieces(messages, options);
            });
        }
    }
    listenScriptEvent(listener) {
        const thisEnvId = this.scriptEnv.identifier;
        const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
            const { id, message } = event;
            if (!id)
                return;
            const { headerStr, metadataStr, senderEnvId, targetEnvId } = this._serializer.deserializeScriptEventId(id);
            if (!senderEnvId)
                return;
            listener({ headerStr, metadataStr, senderEnvId, targetEnvId, message });
        }, { namespaces: [thisEnvId, IpcV1.BroadcastEnvId] });
        return () => {
            system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        };
    }
    assertNotBroadcastEnvId(targetEnvId, errorMessage) {
        if (!targetEnvId)
            return;
        if (targetEnvId === IpcV1.BroadcastEnvId) {
            throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
        }
    }
    assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (!targetEnvIds)
            return;
        if (targetEnvIds.includes(IpcV1.BroadcastEnvId)) {
            throw new Error(`${errorMessage}! Env id list can not include Broadcast Env Id`);
        }
    }
    assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (typeof targetEnvIds === "string") {
            this.assertNotBroadcastEnvId(targetEnvIds, errorMessage);
        }
        else {
            this.assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage);
        }
    }
    send(identifier, value, targetEnvIds) {
        this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Send message failed");
        if (typeof targetEnvIds === "string") {
            this.post(IpcPacketType.Message, identifier, value, targetEnvIds);
            return;
        }
        if (targetEnvIds.length === 0)
            return;
        this.postToAll(IpcPacketType.Message, identifier, value, targetEnvIds);
    }
    broadcast(identifier, value) {
        this.post(IpcPacketType.Message, identifier, value, IpcV1.BroadcastEnvId);
    }
    _mergeMessagePackets(messagePackets) {
        return messagePackets.reduce((acc, cur) => acc + cur);
    }
    _getFullMessage(message, metadata, msgPackets) {
        if (metadata.packet_number === undefined) {
            return message;
        }
        msgPackets.push(message);
        if (metadata.packet_number === 0) {
            return this._mergeMessagePackets(msgPackets);
        }
        else {
            return undefined;
        }
    }
    deserializeMetadata(metadataStr, packetType, packetId) {
        const metadata = this._serializer.deserializeMetadata(metadataStr);
        if (metadata.packet_type !== packetType)
            return { metadata, skipByMetadata: true };
        if (!metadata.packet_id || metadata.packet_id !== packetId)
            return { metadata, skipByMetadata: true };
        return { metadata, skipByMetadata: false };
    }
    deserializeHeader(headerStr, version) {
        const header = this._serializer.deserializeHeader(headerStr);
        if (header.version !== version)
            return { header, skipByHeader: true };
        return { header, skipByHeader: false };
    }
    on(identifier, listener) {
        const msgPackets = [];
        return this.listenScriptEvent((event) => {
            const { senderEnvId, headerStr, metadataStr, message } = event;
            // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);
            const header = this._serializer.deserializeHeader(headerStr);
            if (header.version !== IpcVersion.V1)
                return;
            const metadata = this._serializer.deserializeMetadata(metadataStr);
            if (metadata.packet_type !== IpcPacketType.Message)
                return;
            if (!metadata.packet_id || metadata.packet_id !== identifier)
                return;
            const fullMessage = this._getFullMessage(message, metadata, msgPackets);
            if (fullMessage === undefined)
                return;
            listener({
                packetId: metadata.packet_id,
                value: this._serializer.deserializeData(fullMessage, metadata.encoding),
                senderEnvId
            });
            msgPackets.length = 0;
        });
    }
    once(identifier, listener) {
        const dispose = this.on(identifier, (event) => {
            listener(event);
            dispose();
        });
        return dispose;
    }
    debounce(identifier, listener, options) {
        const { merge, leading = false, delayTicks } = options;
        let lastEvent;
        let timeoutId;
        const trigger = (event) => {
            listener(event);
            lastEvent = undefined;
        };
        this.on(identifier, (event) => {
            const currentEvent = merge(event, lastEvent);
            if (leading && !timeoutId) {
                trigger(currentEvent);
            }
            else {
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
    invoke(identifier, value, targetEnvIds) {
        this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Invoke method failed");
        const result = new Promise((resolve, reject) => {
            const thisEnvId = this.scriptEnv.identifier;
            let resolveTimes = 0;
            const invokeResults = [];
            const msgPackets = [];
            const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
                const { id, message } = event;
                if (!id)
                    return;
                const { headerStr, metadataStr, senderEnvId } = this._serializer.deserializeScriptEventId(id);
                if (!senderEnvId)
                    return;
                const { header, skipByHeader } = this.deserializeHeader(headerStr, IpcVersion.V1);
                if (skipByHeader)
                    return;
                const { metadata, skipByMetadata } = this.deserializeMetadata(metadataStr, IpcPacketType.InvokeResult, identifier);
                if (skipByMetadata)
                    return;
                const fullMessage = this._getFullMessage(message, metadata, msgPackets);
                if (fullMessage === undefined)
                    return;
                const resolvePromise = (results) => {
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
                }
                else {
                    invokeResults.push(result);
                }
                resolveTimes++;
                if (resolveTimes >= targetEnvIds.length) {
                    resolvePromise(invokeResults);
                }
            }, { namespaces: [thisEnvId, IpcV1.BroadcastEnvId] });
        });
        if (typeof targetEnvIds === "string") {
            this.post(IpcPacketType.Invoke, identifier, value, targetEnvIds);
        }
        else {
            this.postToAll(IpcPacketType.Invoke, identifier, value, targetEnvIds);
        }
        return result;
    }
    handle(identifier, listener, senderEnvFilter) {
        this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
        const thisEnvId = this.scriptEnv.identifier;
        const msgPackets = [];
        return this.listenScriptEvent((event) => {
            const { senderEnvId, headerStr, metadataStr, message } = event;
            if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId))
                return;
            const { header, skipByHeader } = this.deserializeHeader(headerStr, IpcVersion.V1);
            if (skipByHeader)
                return;
            const { metadata, skipByMetadata } = this.deserializeMetadata(metadataStr, IpcPacketType.Invoke, identifier);
            if (skipByMetadata)
                return;
            const fullMessage = this._getFullMessage(message, metadata, msgPackets);
            if (fullMessage === undefined)
                return;
            const invokeRetPromise = AsyncUtils.awaitIfAsync(listener(this._serializer.deserializeData(fullMessage, metadata.encoding)));
            invokeRetPromise.then((retValue) => {
                this.postByParamOptions(retValue, {
                    senderEnvId: thisEnvId, targetEnvId: senderEnvId,
                    header: { version: IpcVersion.V1 },
                    metadata: {
                        packet_type: IpcPacketType.InvokeResult, packet_id: identifier
                    }
                });
            });
            msgPackets.length = 0;
        });
    }
    ;
}
IpcV1.BroadcastEnvId = 'ipc_broadcast';
//# sourceMappingURL=IpcV1.js.map