import { IEnvironment } from "./IEnvironment";
import { DebounceEventOptions, IpcInvokeResult } from "../Ipc";
export type PropertyObject = {
    [key: string]: string | boolean | number | PropertyObject;
};
export type IpcMessageType = string | number | boolean | PropertyObject;
export type HandleListenerResult = Promise<void | IpcMessageType> | void | IpcMessageType;
export interface IpcMessageReceiveEvent {
    identifier: string;
    value: IpcMessageType;
    senderEnvId: string;
}
export interface IIpc {
    scriptEnv: IEnvironment;
    send(identifier: string, value: IpcMessageType, targetEnvId: string): void;
    send(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): void;
    broadcast(identifier: string, value: IpcMessageType): void;
    on(eventName: string, listener: (arg: IpcMessageReceiveEvent) => void): void;
    once(eventName: string, listener: (arg: IpcMessageReceiveEvent) => void): void;
    debounce(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void, options: DebounceEventOptions): void;
    invoke(identifier: string, value: IpcMessageType, targetEnvId: string): Promise<IpcInvokeResult>;
    invoke(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): Promise<IpcInvokeResult[]>;
    handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult): void;
    handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult, senderEnvFilter: string[]): void;
}
