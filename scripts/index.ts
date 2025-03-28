import {Ipc} from "./ipc/Ipc";
import {world} from "@minecraft/server";
import {MinecraftBlockTypes} from "@minecraft/vanilla-data";

const ipc = Ipc.register('industrialcraft2', '054f9427-466c-4cf2-9887-797b2f7869ec');

world.afterEvents.playerPlaceBlock.subscribe(({block}) => {
  if (block.matches(MinecraftBlockTypes.OakLog)) {
    ipc.send('test:test_message', 'test message!', 'child');
    world.sendMessage('Test message sent.');
  } else {
    ipc.invoke('test:test_invoke', {
      message: 'This is a cross-pack invoke!', num1: 2, num2: 5
    }, 'child').then((result) => {
      const {value} = result;
      world.sendMessage(`Invoke Calculate Result: 2 + 5 = ${value}`);
    });
  }
});
