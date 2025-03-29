export class ClassEnum {
  protected static Values: Map<string, ClassEnum> = new Map();

  protected static register<T extends ClassEnum>(name: string, value: T): T {
    this.Values.set(name, value);
    return value;
  }
}