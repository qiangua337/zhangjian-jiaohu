const blend=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:blend(a.x,b.x,t),y:blend(a.y,b.y,t)});

export class HandSignalFilter {
  constructor(){this.reset();}
  reset(){this.previous=[];}
  update(hands,time){
    const available=this.previous.filter(item=>time-item.time<220),next=[];
    for(const raw of hands){
      let previous=null,best=.32;
      for(const item of available){const d=Math.hypot(item.hand.x-raw.x,item.hand.y-raw.y);if(d<best){previous=item;best=d;}}
      if(previous)available.splice(available.indexOf(previous),1);
      const ratio=Number.isFinite(raw.pinchRatio)?raw.pinchRatio:(raw.pinch ? 0.2 : 1);
      const wasPinching=previous?.hand.pinch||false;
      const pinch=wasPinching?ratio<.46&&!(raw.pose==='fist'&&raw.openness<.12):Boolean(raw.pinch&&ratio<.33);
      const wanted=pinch?'pinch':raw.pose==='pinch'?(raw.openness<.25?'fist':'palm'):raw.pose;
      let candidate=previous?.candidate,since=previous?.since;
      if(candidate!==wanted){candidate=wanted;since=time;}
      const immediate=!previous||pinch!==wasPinching||previous.hand.pose==='pinch';
      const pose=immediate||time-since>=80?wanted:previous.hand.pose;
      const alpha=previous?1-Math.exp(-Math.max(0,time-previous.time)/45):1;
      const hand={...raw,pinch,pose};
      if(previous){const old=previous.hand;hand.x=blend(old.x,raw.x,alpha);hand.y=blend(old.y,raw.y,alpha);hand.openness=blend(old.openness,raw.openness,alpha);hand.pointer=point(old.pointer,raw.pointer,alpha);hand.grab=point(old.grab,raw.grab,alpha);hand.roll=old.roll+Math.atan2(Math.sin(raw.roll-old.roll),Math.cos(raw.roll-old.roll))*alpha;}
      next.push({hand,time,candidate,since});
    }
    this.previous=next.length?next:this.previous.filter(item=>time-item.time<220);
    return next.map(item=>item.hand);
  }
}
