export const THEATER_CHAPTERS=[
  {world:'saturn',name:'引力之外',line:'星环松开，宇宙开始流动。',act:'第一幕'},
  {world:'heart',name:'万千次心动',line:'从一颗完整的心，到漫天独立的心动。',act:'第二幕'},
  {world:'tree',name:'把时光点亮',line:'让留在枝头的记忆，成为一场金色星雨。',act:'第三幕'},
  {world:'flower',name:'一念，盛放',line:'从安静的花苞，走向自由的花雨。',act:'第四幕'},
  {world:'ocean',name:'向微光深处',line:'不必追赶，让微光慢慢游向你。',act:'第五幕'},
];
export const CHAPTER_DURATION=16;
export const THEATER_LENGTH=THEATER_CHAPTERS.length*CHAPTER_DURATION;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const ease=t=>{const v=clamp(t,0,1);return v*v*(3-2*v);};

export function theaterFrame(seconds){
  const elapsed=clamp(Number.isFinite(seconds)?seconds:0,0,THEATER_LENGTH),index=Math.min(THEATER_CHAPTERS.length-1,Math.floor(elapsed/CHAPTER_DURATION)),phase=elapsed-index*CHAPTER_DURATION;
  const morph=phase<2.5?0:phase<9.5?ease((phase-2.5)/7):phase<12.5?1:1-ease((phase-12.5)/3.5);
  return{...THEATER_CHAPTERS[index],index,seconds:elapsed,progress:elapsed/THEATER_LENGTH,chapterProgress:phase/CHAPTER_DURATION,morph,stage:phase<2.5?'凝望':phase<9.5?'舒展':phase<12.5?'漫游':'回归',yaw:-.23+phase/CHAPTER_DURATION*.46,pitch:Math.sin(phase/CHAPTER_DURATION*Math.PI)*.08,finished:elapsed>=THEATER_LENGTH};
}

export class TheaterTimeline{
  constructor(){this.seconds=0;this.active=false;this.paused=false;}
  start(index=0){this.active=true;this.paused=false;this.seconds=clamp(Number.isFinite(index)?Math.floor(index):0,0,THEATER_CHAPTERS.length-1)*CHAPTER_DURATION;return this.snapshot();}
  seek(index){if(this.active)this.seconds=clamp(Number.isFinite(index)?Math.floor(index):0,0,THEATER_CHAPTERS.length-1)*CHAPTER_DURATION;return this.snapshot();}
  pause(value=!this.paused){if(this.active)this.paused=Boolean(value);return this.snapshot();}
  stop(){this.active=false;this.paused=false;return this.snapshot();}
  advance(delta,{hidden=false,blocked=false}={}){if(this.active){if(hidden||blocked)this.paused=true;if(!this.paused)this.seconds=clamp(this.seconds+clamp(Number.isFinite(delta)?delta:0,0,.1),0,THEATER_LENGTH);}return this.snapshot();}
  snapshot(){return{...theaterFrame(this.seconds),active:this.active,paused:this.paused};}
}
