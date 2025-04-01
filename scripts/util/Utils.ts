export class Utils {
  static splitString(str: string, maxLength: number = 2047): string[] {
    const result: string[] = [];
    let start = 0;

    while (start < str.length) {
      result.push(str.slice(start, start + maxLength));
      start += maxLength;
    }

    return result;
  }
}