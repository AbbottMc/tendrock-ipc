export declare class ClassEnum {
    protected static Values: Map<string, ClassEnum>;
    protected static register<T extends ClassEnum>(name: string, value: T): T;
}
