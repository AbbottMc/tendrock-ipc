import {RepeaterSystem} from './RepeaterSystem'

export class Repeater {
  private _repeaterMap: Map<string, RepeaterSystem>;

  constructor() {
    this._repeaterMap = new Map<string, RepeaterSystem>();
  }

  register(scriptEnvId: string) {
    if (this._repeaterMap.has(scriptEnvId)) {
      return this._repeaterMap.get(scriptEnvId);
    }
    return new RepeaterSystem(scriptEnvId);
  }
}
export const repeater = new Repeater();