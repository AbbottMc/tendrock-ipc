import { DebounceEventOptions, HandleListenerResult, IEnvironment, IIpc, IpcInvokeResult, IpcMessageReceiveEvent, IpcMessageType } from "../api";
export declare class IpcV1 implements IIpc {
    private static BroadcastEnvId;
    readonly scriptEnv: IEnvironment;
    private readonly _serializer;
    constructor(scriptEnv: IEnvironment);
    static register(identifier: string, uuid: string): IpcV1;
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
