export class ClassEnum {
    static register(name, value) {
        this.Values.set(name, value);
        return value;
    }
}
ClassEnum.Values = new Map();
