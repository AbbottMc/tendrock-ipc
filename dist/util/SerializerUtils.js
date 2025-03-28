export class SerializerUtils {
    static serializeData(data) {
        return JSON.stringify(data);
    }
    static deserializeData(data) {
        return JSON.parse(data);
    }
    /**
     * Serialize metadata to string
     * @param metadata
     */
    static serializeMetadata(metadata) {
        return JSON.stringify(metadata).replaceAll(':', '$[tc]');
    }
    /**
     * Deserialize metadata from string
     * @param metadataStr
     */
    static deserializeMetadata(metadataStr) {
        return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
    }
    static serialize(options) {
        const { senderEnvId, targetEnvId, metadata, value } = options;
        const id = `${targetEnvId}:${senderEnvId}-${this.serializeMetadata(metadata)}`;
        const message = value ? this.serializeData(value) : '';
        // scriptevent <targetEnvId>:<senderEnvId>-<metadata> <dataMessage>
        // scriptevent "ic2:ntrs-{\"mode\"$[tc]\"<IpcMode>\",\"identifier\"$[tc]\"<NamespacedIdentifier>\"}" "Hello Tendrock!"
        return { id, message };
    }
    static serializeAll(targetEnvIdList, options) {
        const { senderEnvId, metadata, value } = options;
        const metadataStr = this.serializeMetadata(metadata);
        const message = value ? this.serializeData(value) : '';
        return targetEnvIdList.map(targetEnvId => {
            const id = `${targetEnvId}:${senderEnvId}-${metadataStr}`;
            return { id, message };
        });
    }
    static deserializeScriptEventId(scriptEventId) {
        const envIdPair = scriptEventId.split('-')[0];
        const metadataStr = scriptEventId.substring(envIdPair.length + 1);
        const [targetEnvId, senderEnvId] = envIdPair.split(':');
        return {
            senderEnvId,
            targetEnvId,
            metadataStr
        };
    }
}
//# sourceMappingURL=SerializerUtils.js.map