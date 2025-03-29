import { PropertyObject } from "./IIpc";
import { IpcPacketType, IpcVersion } from "../lib";
export type EncodingType = 'json' | undefined;
export interface IMetadata extends PropertyObject {
    packet_type: IpcPacketType;
    packet_id: string;
    encoding?: EncodingType;
    security?: {
        signature: string;
        cipher: 'aes-256';
    };
}
export interface IHeader {
    version: IpcVersion;
}
export interface SerializeScriptEventIdOptions {
    senderEnvId: string;
    targetEnvId: string;
    header: IHeader;
    metadata: IMetadata;
}
export interface DeserializeScriptEventIdResult {
    senderEnvId: string;
    targetEnvId: string;
    headerStr: string;
    metadataStr: string;
}
export interface ScriptEventParams {
    id: string;
    message: string;
}
export interface ISerializer {
    serializeData(data: any, encoding?: EncodingType): string;
    deserializeData(data: string, encoding?: EncodingType): any;
    serializeHeader(header: IHeader, encoding?: EncodingType): string;
    deserializeHeader(headerStr: string, encoding?: EncodingType): IHeader;
    serializeMetadata(metadata: PropertyObject, encoding?: EncodingType): string;
    deserializeMetadata(metadataStr: string, encoding?: EncodingType): IMetadata;
    serializeAllToScriptEventId(targetEnvIdList: string[], options: Omit<SerializeScriptEventIdOptions, 'targetEnvId'>): string[];
    serializeToScriptEventId(options: SerializeScriptEventIdOptions): string;
    deserializeScriptEventId(scriptEventId: string): DeserializeScriptEventIdResult;
}
