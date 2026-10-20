export class Resonance {
  constructor(){this.reset();}
  reset(){this.age=10;this.energy=0;this.lastTrigger=-Infinity;this.armed=true;}
  trigger(time){if(time-this.lastTrigger<450)return false;this.lastTrigger=time;this.age=0;this.energy=1;return true;}
  observe(openness,time){if(openness<.25)this.armed=true;if(this.armed&&openness>.72){this.armed=false;return this.trigger(time);}return false;}
  step(delta){this.age+=Math.max(0,delta);this.energy=Math.exp(-this.age*2.6);if(this.energy<.004)this.energy=0;return this.energy;}
}
