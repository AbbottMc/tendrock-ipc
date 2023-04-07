export declare type DataMap = {
	[key: string]: string | boolean | number | DataMap;
};
export declare type RepeaterMessageReceiveEvent = {
	identifier: string;
	value: string | number | boolean | DataMap;
	senderEnvId: string;
};
export declare class RepeaterSystem {
	envId: string;
	private _overworld;
	private _broadcastId;
	constructor(envId: string);
	private convertDataMessage;
	monit(listener: (arg: RepeaterMessageReceiveEvent) => void): void;
	send(envId: string, identifier: string, value: string | number | boolean | DataMap): void;
	broadcast(identifier: string, value: string | number | boolean | DataMap): void;
}
declare class Repeater {
	private _repeaterMap;
	constructor();
	register(scriptEnvId: string): RepeaterSystem;
}
export declare const repeater: Repeater;

export {};
