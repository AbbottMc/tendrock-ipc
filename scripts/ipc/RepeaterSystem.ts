import {Dimension, system, world} from '@minecraft/server'
import {MinecraftDimensionTypes} from "@minecraft/vanilla-data";

export type DataMap = { [key: string]: string | boolean | number | DataMap };
export type RepeaterMessageReceiveEvent = { identifier: string, value: string | number | boolean | DataMap, senderEnvId: string };

export class RepeaterSystem {

  envId: string;
  private _overworld: Dimension;
  private _broadcastId = 'tenon_broadcast';

  constructor(envId: string) {
    this._overworld = world.getDimension(MinecraftDimensionTypes.Overworld);
    this.envId = envId;
  }

  private convertDataMessage(rawDataMessage: string, senderEnvId: string) {
    const dataMessage = rawDataMessage.substring(senderEnvId.length + 1);
    const ret = JSON.parse(dataMessage.replaceAll('$[tc]', ':'));
    ret.senderEnvId = senderEnvId;
    return ret;
  }

  monit(listener: (arg: RepeaterMessageReceiveEvent) => void) {
    system.afterEvents.scriptEventReceive.subscribe(({sourceBlock, id, sourceType, sourceEntity, message, initiator}) => {
      if (!id) return;
      let rawDataMessage: string, senderEnvId: string;
      if (id.startsWith(this.envId + ":")) {
        rawDataMessage = id.substring(this.envId.length + 1);
      } else if (id.startsWith(this._broadcastId + ':')) {
        rawDataMessage = id.substring(this._broadcastId.length + 1);
        senderEnvId = rawDataMessage.split('-')[0];
        if (senderEnvId !== this.envId) return;
      }
      if (!rawDataMessage || !senderEnvId) return;
      listener(this.convertDataMessage(rawDataMessage, senderEnvId));
    });
  }

  private processDataStr(identifier: string, value: string | number | boolean | DataMap) {
    const rawDataStr = JSON.stringify(JSON.stringify({identifier, value}).replaceAll(':', '$[tc]'));
    return rawDataStr.substring(1, rawDataStr.length - 1);
  }

  send(envId: string, identifier: string, value: string | number | boolean | DataMap): void {
    this._overworld.runCommand(`scriptevent "${envId}:${this.envId}-${this.processDataStr(identifier, value)}"`);
  }

  broadcast(identifier: string, value: string | number | boolean | DataMap) {
    this._overworld.runCommand(`scriptevent "${this._broadcastId}:${this.envId}-${this.processDataStr(identifier, value)}"`);
  }
}