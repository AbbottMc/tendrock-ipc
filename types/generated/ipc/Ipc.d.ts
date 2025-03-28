import { HandleListenerResult, IEnvironment, IIpc, IpcMessageReceiveEvent, IpcMessageType } from "./api";
export interface DebounceEventOptions {
    merge: (event: IpcMessageReceiveEvent, last?: IpcMessageReceiveEvent) => any;
    delayTicks: number;
    leading?: boolean;
}
export interface IpcListenScriptEventEvent {
    metadataStr: string;
    senderEnvId: string;
    targetEnvId: string;
    message: string;
}
export interface IpcInvokeResult {
    value: IpcMessageType;
    envId: string;
}
export declare class Ipc implements IIpc {
    readonly scriptEnv: IEnvironment;
    constructor(scriptEnv: IEnvironment);
    static register(identifier: string, uuid: string): Ipc;
    private postByParamOptions;
    private post;
    private postToAll;
    private listenScriptEvent;
    private assertNotBroadcastEnvId;
    private assertNotIncludeBroadcastEnvId;
    private assertNotBeOrIncludeBroadcastEnvId;
    send(identifier: string, value: IpcMessageType, targetEnvId: string): void;
    send(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): void;
    broadcast(identifier: string, value: IpcMessageType): void;
    on(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void;
    once(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void): () => void;
    debounce(identifier: string, listener: (arg: IpcMessageReceiveEvent) => void, options: DebounceEventOptions): this;
    invoke(identifier: string, value: IpcMessageType, targetEnvId: string): Promise<IpcInvokeResult>;
    invoke(identifier: string, value: IpcMessageType, targetEnvIdList: string[]): Promise<IpcInvokeResult[]>;
    handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult): void;
    handle(identifier: string, listener: (...args: IpcMessageType[]) => HandleListenerResult, senderEnvFilter: string[]): void;
}
