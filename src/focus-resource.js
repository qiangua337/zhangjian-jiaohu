// Only the currently viewed photo owns a larger texture. Late decodes are discarded.
export class FocusResource{
  constructor({load,apply,reset,report=()=>{}}){Object.assign(this,{load,apply,reset,report});this.sequence=0;this.active=null;this.value=null;}
  clear(){this.sequence++;this.controller?.abort();this.controller=null;if(this.active&&this.value){this.reset(this.active);this.value.dispose();}this.active=null;this.value=null;this.report('idle');}
  async select(item){
    if(this.active===item)return;
    this.clear();if(!item?.source)return;
    const sequence=this.sequence;this.active=item;this.controller=new AbortController();this.report('loading');
    try{const value=await this.load(item,this.controller.signal);if(sequence!==this.sequence){value.dispose();return;}this.value=value;this.apply(item,value);this.report('ready');}
    catch{if(sequence===this.sequence)this.report('fallback');}
  }
}

export class PhotoClock{
  constructor(interval=5000){this.interval=interval;this.stop();}
  start(time){this.playing=true;this.due=time+this.interval;}
  stop(){this.playing=false;this.due=0;}
  tick(time,{focused=true,count=2,visible=true,blocked=false}={}){
    if(!focused||count<2||!visible||blocked){this.stop();return false;}
    if(!this.playing||time<this.due)return false;
    this.due=time+this.interval;return true;
  }
}

export function swipeDirection({dx,dy,duration,pointers=1}){
  return pointers===1&&duration<700&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6?(dx<0?1:-1):0;
}
