import { IpcMessageType, PropertyObject } from "../ipc/api/IIpc";
import { IpcMode } from "../lib/IpcMode";
export interface IMetadata extends PropertyObject {
    mode: IpcMode;
    identifier: string;
}
export interface SerializeCommandParamOptions {
    senderEnvId: string;
    targetEnvId: string;
    metadata: IMetadata;
    value?: IpcMessageType;
}
export interface DeserializeScriptEventIdResult {
    senderEnvId: string;
    targetEnvId: string;
    metadataStr: string;
}
export declare class SerializerUtils {
    static serializeData(data: any): string;
    static deserializeData(data: string): any;
    /**
     * Serialize metadata to string
     * @param metadata
     */
    static serializeMetadata(metadata: PropertyObject): string;
    /**
     * Deserialize metadata from string
     * @param metadataStr
     */
    static deserializeMetadata(metadataStr: string): IMetadata;
    static serialize(options: SerializeCommandParamOptions): string;
    static serializeAll(targetEnvIdList: string[], options: Omit<SerializeCommandParamOptions, 'targetEnvId'>): string[];
    static deserializeScriptEventId(scriptEventId: string): DeserializeScriptEventIdResult;
}
