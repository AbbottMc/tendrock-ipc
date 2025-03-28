import { system } from "@minecraft/server";
import { IpcMode } from "../lib";
import { SerializerUtils } from "../util";
import { AsyncUtils } from "../util/AsyncUtils";
export class Ipc {
    constructor(scriptEnv) {
        this.scriptEnv = scriptEnv;
    }
    static register(identifier, uuid) {
        return new Ipc({ identifier, uuid });
    }
    postByParamOptions(options) {
        const { id, message } = SerializerUtils.serialize(options);
        system.sendScriptEvent(id, message);
    }
    post(mode, identifier, value, targetEnvId) {
        this.postByParamOptions({
            senderEnvId: this.scriptEnv.identifier, targetEnvId, value,
            metadata: {
                mode, identifier
            }
        });
    }
    postToAll(mode, identifier, value, targetEnvIdList) {
        SerializerUtils.serializeAll(targetEnvIdList, {
            senderEnvId: this.scriptEnv.identifier, value,
            metadata: {
                mode, identifier
            }
        }).forEach(({ id, message }) => system.sendScriptEvent(id, message));
    }
    listenScriptEvent(listener) {
        const thisEnvId = this.scriptEnv.identifier;
        const scriptEvenCallback = system.afterEvents.scriptEventReceive.subscribe((event) => {
            const { id, message } = event;
            if (!id)
                return;
            const { metadataStr, senderEnvId, targetEnvId } = SerializerUtils.deserializeScriptEventId(id);
            if (!senderEnvId)
                return;
            listener({ metadataStr, senderEnvId, targetEnvId, message });
        }, { namespaces: [thisEnvId, Ipc.BroadcastEnvId] });
        return () => {
            system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        };
    }
    assertNotBroadcastEnvId(targetEnvId, errorMessage) {
        if (!targetEnvId)
            return;
        if (targetEnvId === Ipc.BroadcastEnvId) {
            throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
        }
    }
    assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (!targetEnvIds)
            return;
        if (targetEnvIds.includes(Ipc.BroadcastEnvId)) {
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
            this.post(IpcMode.Message, identifier, value, targetEnvIds);
            return;
        }
        if (targetEnvIds.length === 0)
            return;
        this.postToAll(IpcMode.Message, identifier, value, targetEnvIds);
    }
    broadcast(identifier, value) {
        this.post(IpcMode.Message, identifier, value, Ipc.BroadcastEnvId);
    }
    on(identifier, listener) {
        return this.listenScriptEvent((event) => {
            const { senderEnvId, metadataStr, message } = event;
            // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);
            const metadata = SerializerUtils.deserializeMetadata(metadataStr);
            if (metadata.mode !== IpcMode.Message)
                return;
            if (!metadata.identifier || metadata.identifier !== identifier)
                return;
            listener({
                identifier: metadata.identifier,
                value: SerializerUtils.deserializeData(message),
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
                const { metadataStr, senderEnvId } = SerializerUtils.deserializeScriptEventId(id);
                if (!senderEnvId)
                    return;
                const metadata = SerializerUtils.deserializeMetadata(metadataStr);
                if (metadata.mode !== IpcMode.InvokeResult)
                    return;
                if (!metadata.identifier || metadata.identifier !== identifier)
                    return;
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
                }
                else {
                    invokeResults.push(result);
                }
                resolveTimes++;
                if (resolveTimes >= targetEnvIds.length) {
                    resolve(invokeResults);
                    system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
                }
            }, { namespaces: [thisEnvId, Ipc.BroadcastEnvId] });
        });
        if (typeof targetEnvIds === "string") {
            this.post(IpcMode.Invoke, identifier, value, targetEnvIds);
        }
        else {
            this.postToAll(IpcMode.Invoke, identifier, value, targetEnvIds);
        }
        return result;
    }
    handle(identifier, listener, senderEnvFilter) {
        this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
        const thisEnvId = this.scriptEnv.identifier;
        return this.listenScriptEvent((event) => {
            const { senderEnvId, metadataStr, message } = event;
            if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId))
                return;
            const metadata = SerializerUtils.deserializeMetadata(metadataStr);
            if (metadata.mode !== IpcMode.Invoke)
                return;
            if (!metadata.identifier || metadata.identifier !== identifier)
                return;
            const invokeRetPromise = AsyncUtils.awaitIfAsync(listener(SerializerUtils.deserializeData(message)));
            invokeRetPromise.then((retValue) => {
                this.postByParamOptions({
                    senderEnvId: thisEnvId, targetEnvId: senderEnvId, value: retValue,
                    metadata: {
                        mode: IpcMode.InvokeResult, identifier: identifier
                    }
                });
            });
        });
    }
    ;
}
Ipc.BroadcastEnvId = 'ipc_broadcast';
//# sourceMappingURL=Ipc.js.map