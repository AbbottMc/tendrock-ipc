import { DeserializeScriptEventIdResult, EncodingType, IHeader, IMetadata, ISerializer, SerializeScriptEventIdOptions } from "../api";
export declare class SerializerV1 implements ISerializer {
    private assertV1Encoding;
    serializeData(data: any, encoding: EncodingType): string;
    deserializeData(data: string, encoding: EncodingType): any;
    serializeHeader(header: IHeader): string;
    deserializeHeader(headerStr: string): IHeader;
    serializeMetadata(metadata: IMetadata): string;
    deserializeMetadata(metadataStr: string): IMetadata;
    serializeToScriptEventId(options: SerializeScriptEventIdOptions): string;
    serializeAllToScriptEventId(targetEnvIdList: string[], options: Omit<SerializeScriptEventIdOptions, "targetEnvId">): string[];
    deserializeScriptEventId(scriptEventId: string): DeserializeScriptEventIdResult;
}
