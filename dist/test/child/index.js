import { IpcV1 } from "../../ipc/IpcV1";
import { world } from "@minecraft/server";
const ipc = IpcV1.register('child', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
ipc.on('test:test_message', (event) => {
    world.sendMessage(`Received message: "${event.value}" from "${event.senderEnvId}"`);
});
ipc.handle('test:test_invoke', (testData) => {
    world.sendMessage(`Invoke function output: "${testData.message}"`);
    return testData.num1 + testData.num2;
});
//# sourceMappingURL=index.js.map