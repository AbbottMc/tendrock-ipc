import {CommandResult, Dimension, MinecraftDimensionTypes, ScriptEventCommandMessageEvent, system, world} from '@minecraft/server'

export type DataMap = { [key: string]: string | boolean | number | DataMap };
export type RepeaterMessageReceiveEvent = { identifier: string, value: string | number | boolean | DataMap };

export class TenonRepeater {

  envId: string;
  private _overworld: Dimension;

  constructor(envId: string) {
    this._overworld = world.getDimension(MinecraftDimensionTypes.overworld);
    this.envId = envId;
  }

  private convertDataMessage(dataMessage: string) {
    return JSON.parse(dataMessage);
  }

  monit(listener: (arg: RepeaterMessageReceiveEvent) => void) {
    system.events.scriptEventReceive.subscribe(({sourceBlock, id, sourceType, sourceEntity, message, initiator}) => {
      if (!id.startsWith(this.envId)) {
        return;
      }
      const dataMessage = message.substring(this.envId.length + 1);
      listener(this.convertDataMessage(dataMessage));
    });
  }

  send(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult> {
    return this._overworld.runCommandAsync(`scriptevent ${envId}:${JSON.stringify({identifier, value})}`);
  }
}