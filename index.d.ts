import { CommandResult } from '@minecraft/server';

export type DataMap = {
	[key: string]: string | boolean | number | DataMap;
};
export type RepeaterMessageReceiveEvent = {
	identifier: string;
	value: string | number | boolean | DataMap;
};
declare class TenonRepeater {
	envId: string;
	private _overworld;
	constructor(envId: string);
	private convertDataMessage;
	monit(listener: (arg: RepeaterMessageReceiveEvent) => void): void;
	send(envId: string, identifier: string, value: string | number | boolean | DataMap): Promise<CommandResult>;
}
declare class Repeater {
	private _repeaterMap;
	constructor();
	require(scriptEnvId: string): TenonRepeater;
}
export declare const repeater: Repeater;

export {};
