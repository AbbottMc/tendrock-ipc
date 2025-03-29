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
    postByParamOptions(value, options) {
        const id = this._serializer.serializeToScriptEventId(options);
        const message = this._serializer.serializeData(value, options.metadata.encoding);
        system.sendScriptEvent(id, message);
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
        const message = this._serializer.serializeData(value, 'json');
        this._serializer.serializeAllToScriptEventId(targetEnvIdList, {
            senderEnvId: this.scriptEnv.identifier,
            header: { version: IpcVersion.V1 },
            metadata: {
                packet_type: packetType, packet_id: identifier
            }
        }).forEach((id) => system.sendScriptEvent(id, message));
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
    on(identifier, listener) {
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
            listener({
                packetId: metadata.packet_id,
                value: this._serializer.deserializeData(message, metadata.encoding),
                senderEnvId
            });
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
            const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
                const { id, message } = event;
                if (!id)
                    return;
                const { headerStr, metadataStr, senderEnvId } = this._serializer.deserializeScriptEventId(id);
                if (!senderEnvId)
                    return;
                const header = this._serializer.deserializeHeader(headerStr);
                if (header.version !== IpcVersion.V1)
                    return;
                const metadata = this._serializer.deserializeMetadata(metadataStr);
                if (metadata.packet_type !== IpcPacketType.InvokeResult)
                    return;
                if (!metadata.packet_id || metadata.packet_id !== identifier)
                    return;
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
                }
                else {
                    invokeResults.push(result);
                }
                resolveTimes++;
                if (resolveTimes >= targetEnvIds.length) {
                    resolve(invokeResults);
                    system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
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
        return this.listenScriptEvent((event) => {
            const { senderEnvId, headerStr, metadataStr, message } = event;
            if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId))
                return;
            const header = this._serializer.deserializeHeader(headerStr);
            if (header.version !== IpcVersion.V1)
                return;
            const metadata = this._serializer.deserializeMetadata(metadataStr);
            if (metadata.packet_type !== IpcPacketType.Invoke)
                return;
            if (!metadata.packet_id || metadata.packet_id !== identifier)
                return;
            const invokeRetPromise = AsyncUtils.awaitIfAsync(listener(this._serializer.deserializeData(message, metadata.encoding)));
            invokeRetPromise.then((retValue) => {
                this.postByParamOptions(retValue, {
                    senderEnvId: thisEnvId, targetEnvId: senderEnvId,
                    header: { version: IpcVersion.V1 },
                    metadata: {
                        packet_type: IpcPacketType.InvokeResult, packet_id: identifier
                    }
                });
            });
        });
    }
    ;
}
IpcV1.BroadcastEnvId = 'ipc_broadcast';
//# sourceMappingURL=IpcV1.js.map