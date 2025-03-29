import {
  DeserializeScriptEventIdResult, EncodingType, IHeader, IMetadata, ISerializer, SerializeScriptEventIdOptions
} from "../api";

export class SerializerV1 implements ISerializer {
  private assertV1Encoding(encoding: EncodingType) {
    if (encoding && encoding !== 'json') {
      throw new Error(`Invalid encoding type: ${encoding} for V1 serializer`);
    }
  }

  serializeData(data: any, encoding: EncodingType): string {
    this.assertV1Encoding(encoding);
    return JSON.stringify(data);
  }

  deserializeData(data: string, encoding: EncodingType): any {
    this.assertV1Encoding(encoding);
    return JSON.parse(data);
  }

  serializeHeader(header: IHeader): string {
    return JSON.stringify(header).replaceAll(':', '$[tc]');
  }

  deserializeHeader(headerStr: string): IHeader {
    return JSON.parse(headerStr.replaceAll('$[tc]', ':'));
  }

  serializeMetadata(metadata: IMetadata): string {
    return JSON.stringify(metadata).replaceAll(':', '$[tc]');
  }

  deserializeMetadata(metadataStr: string): IMetadata {
    return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
  }

  serializeToScriptEventId(options: SerializeScriptEventIdOptions): string {
    const {senderEnvId, targetEnvId, header, metadata} = options;
    const headerStr = this.serializeHeader(header);
    const metadataStr = this.serializeMetadata(metadata);
    return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
  }

  serializeAllToScriptEventId(targetEnvIdList: string[], options: Omit<SerializeScriptEventIdOptions, "targetEnvId">): string[] {
    const {senderEnvId, metadata, header} = options;
    const headerStr = this.serializeHeader(header);
    const metadataStr = this.serializeMetadata(metadata);
    return targetEnvIdList.map(targetEnvId => {
      return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
    });
  }

  deserializeScriptEventId(scriptEventId: string): DeserializeScriptEventIdResult {
    const envIdPair = scriptEventId.split('-')[0];
    const headerAndMetadataStr = scriptEventId.substring(envIdPair.length + 1);
    const headerStr = headerAndMetadataStr.split('-')[0];
    const metadataStr = headerAndMetadataStr.substring(headerStr.length + 1);

    const [targetEnvId, senderEnvId] = envIdPair.split(':');
    return {
      senderEnvId,
      targetEnvId,
      headerStr,
      metadataStr
    };
  }
}