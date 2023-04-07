import {Dimension, MinecraftDimensionTypes, system, world} from '@minecraft/server'

export type DataMap = { [key: string]: string | boolean | number | DataMap };
export type RepeaterMessageReceiveEvent = { identifier: string, value: string | number | boolean | DataMap, senderEnvId: string };

export class RepeaterSystem {

  envId: string;
  private _overworld: Dimension;
  private _broadcastId = 'tenon_broadcast';

  constructor(envId: string) {
    this._overworld = world.getDimension(MinecraftDimensionTypes.overworld);
    this.envId = envId;
  }

  private convertDataMessage(rawDataMessage: string) {
    const senderEnvId = rawDataMessage.split(':')[0];
    const dataMessage = rawDataMessage.substring(senderEnvId.length + 1);
    const ret = JSON.parse(dataMessage);
    ret.senderEnvId = senderEnvId;
    return ret;
  }

  monit(listener: (arg: RepeaterMessageReceiveEvent) => void) {
    system.events.scriptEventReceive.subscribe(({sourceBlock, id, sourceType, sourceEntity, message, initiator}) => {
      if (!id) return;
      let rawDataMessage: string;
      if (id.startsWith(this.envId + ":")) {
        rawDataMessage = id.substring(this.envId.length + 1);
      } else if (id.startsWith(this._broadcastId + ':')) {
        rawDataMessage = id.substring(this._broadcastId.length + 1);
      }
      if (!rawDataMessage) return;
      listener(this.convertDataMessage(rawDataMessage));
    });
  }

  send(envId: string, identifier: string, value: string | number | boolean | DataMap): void {
    this._overworld.runCommand(`scriptevent ${envId}:${this.envId}:${JSON.stringify({identifier, value})}`);
  }

  broadcast(identifier: string, value: string | number | boolean | DataMap) {
    this._overworld.runCommand(`scriptevent ${this._broadcastId}:${this.envId}:${JSON.stringify({identifier, value})}`);
  }
}