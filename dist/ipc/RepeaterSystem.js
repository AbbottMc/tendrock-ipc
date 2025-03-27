import { system, world } from '@minecraft/server';
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
export class RepeaterSystem {
    constructor(envId) {
        this._broadcastId = 'tenon_broadcast';
        this._overworld = world.getDimension(MinecraftDimensionTypes.Overworld);
        this.envId = envId;
    }
    convertDataMessage(rawDataMessage) {
        const senderEnvId = rawDataMessage.split(':')[0];
        const dataMessage = rawDataMessage.substring(senderEnvId.length + 1);
        const ret = JSON.parse(dataMessage);
        ret.senderEnvId = senderEnvId;
        return ret;
    }
    monit(listener) {
        system.afterEvents.scriptEventReceive.subscribe(({ sourceBlock, id, sourceType, sourceEntity, message, initiator }) => {
            if (!id)
                return;
            let rawDataMessage;
            if (id.startsWith(this.envId + ":")) {
                rawDataMessage = id.substring(this.envId.length + 1);
            }
            else if (id.startsWith(this._broadcastId + ':')) {
                rawDataMessage = id.substring(this._broadcastId.length + 1);
            }
            if (!rawDataMessage)
                return;
            listener(this.convertDataMessage(rawDataMessage));
        });
    }
    send(envId, identifier, value) {
        this._overworld.runCommand(`scriptevent ${envId}:${this.envId}:${JSON.stringify({ identifier, value })}`);
    }
    broadcast(identifier, value) {
        this._overworld.runCommand(`scriptevent ${this._broadcastId}:${this.envId}:${JSON.stringify({ identifier, value })}`);
    }
}
