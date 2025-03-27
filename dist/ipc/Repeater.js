import { RepeaterSystem } from './RepeaterSystem';
export class Repeater {
    constructor() {
        this._repeaterMap = new Map();
    }
    register(scriptEnvId) {
        if (this._repeaterMap.has(scriptEnvId)) {
            return this._repeaterMap.get(scriptEnvId);
        }
        return new RepeaterSystem(scriptEnvId);
    }
}
