import { Utils } from "../util/Utils";
export class SerializerV1 {
    assertV1Encoding(encoding) {
        if (encoding && encoding !== 'json') {
            throw new Error(`Invalid encoding type: ${encoding} for V1 serializer`);
        }
    }
    serializeData(data, encoding) {
        this.assertV1Encoding(encoding);
        const result = JSON.stringify(data);
        if (result.length > 2047) {
            return Utils.splitString(result, 2047);
        }
        else {
            return result;
        }
    }
    deserializeData(data, encoding) {
        this.assertV1Encoding(encoding);
        return JSON.parse(data);
    }
    serializeHeader(header) {
        return JSON.stringify(header).replaceAll(':', '$[tc]');
    }
    deserializeHeader(headerStr) {
        return JSON.parse(headerStr.replaceAll('$[tc]', ':'));
    }
    serializeMetadata(metadata) {
        return JSON.stringify(metadata).replaceAll(':', '$[tc]');
    }
    deserializeMetadata(metadataStr) {
        return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
    }
    serializeToScriptEventId(options) {
        const { senderEnvId, targetEnvId, header, metadata } = options;
        const headerStr = this.serializeHeader(header);
        const metadataStr = this.serializeMetadata(metadata);
        return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
    }
    serializeAllToScriptEventId(targetEnvIdList, options) {
        const { senderEnvId, metadata, header } = options;
        const headerStr = this.serializeHeader(header);
        const metadataStr = this.serializeMetadata(metadata);
        return targetEnvIdList.map(targetEnvId => {
            return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
        });
    }
    deserializeScriptEventId(scriptEventId) {
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
//# sourceMappingURL=SerializerV1.js.map