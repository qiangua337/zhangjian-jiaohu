export class GestureFeedback {
  constructor(){this.reset(0);}
  reset(time){this.startedAt=time;this.lastSeen=null;this.darkSince=null;}
  update({time,hasHands,luminance=null}){
    if(hasHands){this.lastSeen=time;this.darkSince=null;return{state:'tracking',title:'已识别到你的手',hint:'握紧聚合，张开散开；保持指尖完整入镜'};}
    if(this.lastSeen!==null&&time-this.lastSeen<900)return{state:'reacquiring',title:'正在重新寻找你的手',hint:'保持手掌在镜头前，动作可以慢一点'};
    const dark=Number.isFinite(luminance)&&luminance<.14;
    if(!dark)this.darkSince=null;else if(this.darkSince===null)this.darkSince=time;
    if(this.darkSince!==null&&time-this.darkSince>=2200)return{state:'dim',title:'画面偏暗，试着补一点光',hint:'让光照到手掌；也可以直接用触屏或鼠标探索'};
    const since=this.lastSeen??this.startedAt;
    if(time-since>=12000)return{state:'waiting',title:'还没有识别到手',hint:'试着靠近镜头、完整露出指尖，或选择直接探索'};
    if(time-since>=3500)return{state:'searching',title:'把手举到镜头前',hint:'手掌正对镜头，保持指尖完整入镜；光线亮一点会更准'};
    return{state:'ready',title:'摄像头已开启',hint:'举起一只手，就能开始控制作品'};
  }
}
