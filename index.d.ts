import { CommandResult } from '@minecraft/server';

export type DataMap = {
	[key: string]: string | boolean | number | DataMap;
};
export type RepeaterMessageReceiveEvent = {
	identifier: string;
	value: string | number | boolean | DataMap;
};
export declare class RepeaterSystem {
	envId: string;
	private _overworld;
	private _broadcastId;
	constructor(envId: string);
	private convertDataMessage;
	monit(listener: (arg: RepeaterMessageReceiveEvent) => void): void;
	send(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult>;
	broadcast(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult>;
}
declare class Repeater {
	private _repeaterMap;
	constructor();
	register(scriptEnvId: string): RepeaterSystem;
}
export declare const repeater: Repeater;

export {};
