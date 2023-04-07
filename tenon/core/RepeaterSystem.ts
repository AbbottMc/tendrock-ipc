import {CommandResult, Dimension, MinecraftDimensionTypes, system, world} from '@minecraft/server'

export type DataMap = { [key: string]: string | boolean | number | DataMap };
export type RepeaterMessageReceiveEvent = { identifier: string, value: string | number | boolean | DataMap };

export class RepeaterSystem {

  envId: string;
  private _overworld: Dimension;
  private _broadcastId = 'tenon_broadcast';

  constructor(envId: string) {
    this._overworld = world.getDimension(MinecraftDimensionTypes.overworld);
    this.envId = envId;
  }

  private convertDataMessage(dataMessage: string) {
    return JSON.parse(dataMessage);
  }

  monit(listener: (arg: RepeaterMessageReceiveEvent) => void) {
    system.events.scriptEventReceive.subscribe(({sourceBlock, id, sourceType, sourceEntity, message, initiator}) => {
      let dataMessage: string;
      if (id.startsWith(this.envId + ":")) {
        dataMessage = message.substring(this.envId.length + 1);
      } else if (id.startsWith(this._broadcastId + ':')) {
        dataMessage = message.substring(this._broadcastId.length + 1);
      }
      if (!dataMessage) {
        return;
      }
      listener(this.convertDataMessage(dataMessage));
    });
  }

  send(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult> {
    return this._overworld.runCommandAsync(`scriptevent ${envId}:${JSON.stringify({identifier, value})}`);
  }

  broadcast(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult> {
    return this._overworld.runCommandAsync(`scriptevent ${this._broadcastId}:${JSON.stringify({identifier, value})}`);
  }
}