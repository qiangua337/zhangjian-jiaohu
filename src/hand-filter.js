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
      const hand={...raw,pinch,pose};
      if(previous){
        const old=previous.hand,dt=Math.max(0,time-previous.time);
        const travel=Math.hypot(raw.x-old.x,raw.y-old.y);
        const tau=blend(88,30,Math.min(1,travel/.13));
        const positionAlpha=1-Math.exp(-dt/tau),shapeAlpha=1-Math.exp(-dt/52);
        const tipTravel=Math.hypot(raw.pointer.x-old.pointer.x,raw.pointer.y-old.pointer.y);
        const tipAlpha=1-Math.exp(-dt/blend(72,25,Math.min(1,tipTravel/.10)));
        hand.x=blend(old.x,raw.x,positionAlpha);hand.y=blend(old.y,raw.y,positionAlpha);
        hand.openness=blend(old.openness,raw.openness,shapeAlpha);
        hand.pointer=point(old.pointer,raw.pointer,tipAlpha);hand.grab=point(old.grab,raw.grab,tipAlpha);
        hand.roll=old.roll+Math.atan2(Math.sin(raw.roll-old.roll),Math.cos(raw.roll-old.roll))*positionAlpha;
      }
      next.push({hand,time,candidate,since});
    }
    this.previous=next.length?next:this.previous.filter(item=>time-item.time<220);
    return next.map(item=>item.hand);
  }
}
