import {TenonRepeater} from './TenonRepeater'

export class Repeater {
  private _repeaterMap: Map<string, TenonRepeater>;

  constructor() {
    this._repeaterMap = new Map<string, TenonRepeater>();
  }

  require(scriptEnvId: string) {
    if (this._repeaterMap.has(scriptEnvId)) {
      return this._repeaterMap.get(scriptEnvId);
    }
    return new TenonRepeater(scriptEnvId);
  }
}