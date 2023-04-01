import {world} from '@minecraft/server'

world.events.playerSpawn.subscribe(({player}) => {
  player.sendMessage('cscs');
});