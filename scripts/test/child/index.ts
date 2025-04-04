import {IpcV1} from "../../ipc";
import {world} from "@minecraft/server";

const ipc = IpcV1.register('child', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

ipc.on('test:test_message', (event) => {
  world.sendMessage(`Received message: "${event.value}" from "${event.senderEnvId}"`);
});

ipc.on('test:test_large_message', (event) => {
  console.log(`Received large message: "${JSON.stringify(event.value)}" from "${event.senderEnvId}"`);
});

ipc.handle('test:test_invoke', (testData: { message: string, num1: number, num2: number }) => {
  world.sendMessage(`Invoke function output: "${testData.message}"`);
  return testData.num1 + testData.num2;
});
