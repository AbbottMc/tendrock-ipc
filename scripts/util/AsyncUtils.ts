export class AsyncUtils {
  static async awaitIfAsync<T>(target: any): Promise<T> {
    if (target instanceof Promise) {
      return await target;
    } else {
      return target;
    }
  }
}