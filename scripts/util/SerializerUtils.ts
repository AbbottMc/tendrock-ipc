import {IpcMessageType, PropertyObject} from "../ipc/api/IIpc";
import {IpcMode} from "../lib/IpcMode";


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

export class SerializerUtils {
  static serializeData(data: any): string {
    return JSON.stringify(data);
  }

  public static deserializeData(data: string): any {
    return JSON.parse(data);
  }

  /**
   * Serialize metadata to string
   * @param metadata
   */
  public static serializeMetadata(metadata: PropertyObject): string {
    return JSON.stringify(metadata).replaceAll(':', '$[tc]');
  }

  /**
   * Deserialize metadata from string
   * @param metadataStr
   */
  public static deserializeMetadata(metadataStr: string): IMetadata {
    return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
  }

  public static serialize(options: SerializeCommandParamOptions) {
    const {senderEnvId, targetEnvId, metadata, value} = options;
    const id = `${targetEnvId}:${senderEnvId}-${this.serializeMetadata(metadata)}`
    const message = value ? this.serializeData(value) : '';

    // scriptevent <targetEnvId>:<senderEnvId>-<metadata> <dataMessage>
    // scriptevent "ic2:ntrs-{\"mode\"$[tc]\"<IpcMode>\",\"identifier\"$[tc]\"<NamespacedIdentifier>\"}" "Hello Tendrock!"
    return {id, message}
  }

  public static serializeAll(targetEnvIdList: string[], options: Omit<SerializeCommandParamOptions, 'targetEnvId'>) {
    const {senderEnvId, metadata, value} = options;
    const metadataStr = this.serializeMetadata(metadata);
    const message = value ? this.serializeData(value) : '';
    return targetEnvIdList.map(targetEnvId => {
      const id = `${targetEnvId}:${senderEnvId}-${metadataStr}`;
      return {id, message}
    });
  }

  public static deserializeScriptEventId(scriptEventId: string): DeserializeScriptEventIdResult {
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


