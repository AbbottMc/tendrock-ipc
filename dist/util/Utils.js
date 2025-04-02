export class Utils {
    static splitString(str, maxLength = 2047) {
        const result = [];
        let start = 0;
        while (start < str.length) {
            result.push(str.slice(start, start + maxLength));
            start += maxLength;
        }
        return result;
    }
}
