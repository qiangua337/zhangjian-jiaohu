export function gestureInstruction(hands,{grabbing=false,frozen=false,world}={}){
  if(hands.length>1)return{title:'双手已识别',hint:'拉开或靠拢双手，调整场景大小'};
  const pose=hands[0]?.pose;
  if(pose==='palm'&&world==='flower')return{title:'手掌已张开',hint:'慢慢舒展让花绽放，再张大一些，花瓣会散开'};
  const messages={palm:['手掌已张开','正在展开，慢慢握拳可以收拢'],fist:['已握拳，正在聚合','慢慢张开手掌，让作品散开'],pinch:grabbing?['已抓住照片','移动指尖拖动，松开后欣赏']:['正在拖动作品','保持捏合移动，松开结束拖动'],point:['食指已识别','移动指尖，画出一条星尘'],victory:['保持胜利手势','进度完成后切换作品，松开可以再次触发'],thumb:['保持竖拇指',frozen?'进度完成后继续动画':'进度完成后定格动画']};
  return messages[pose]?{title:messages[pose][0],hint:messages[pose][1]}:null;
}
