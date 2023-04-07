import {Repeater} from './tenon/core/Repeater'

export {RepeaterSystem} from './tenon/core/RepeaterSystem';
export const repeater = new Repeater();

const repeaterSystem = repeater.register('cs');
repeaterSystem.monit(({value, identifier})=>{

});