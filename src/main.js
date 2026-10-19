import './immersive.css';
import './dialogs.css';
import { WORLD_INFO } from './worlds.js';
import { Experience } from './experience.js';
import { GestureCamera } from './gestures.js';
import { preparePhoto } from './photos.js';

const icons={
  orbit:'<ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r="5"/>',
  camera:'<path d="M7 6l2-3h6l2 3h3a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="12" cy="13" r="4"/>',
  photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
  help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 016 0c0 2-3 2-3 5m0 4h.01"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  close:'<path d="M6 6l12 12M6 18L18 6"/>',
  sound:'<path d="M11 4L5 9H2v6h3l6 5zM16 8a6 6 0 010 8m3-11a10 10 0 010 14"/>',
  mute:'<path d="M11 4L5 9H2v6h3l6 5zM17 9l5 6m-5 0l5-6"/>',
  hand:'<path d="M7 11V5a1.5 1.5 0 013 0v6-8a1.5 1.5 0 013 0v8-6a1.5 1.5 0 013 0v7-3a1.5 1.5 0 013 0v6c0 4-2 7-6 7h-1c-3 0-5-2-6-4l-3-5a1.5 1.5 0 012-2l3 3"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="M6 3l15 9-15 9z"/>',
  refresh:'<path d="M21 8a9 9 0 10.4 7M21 3v6h-6"/>',
  download:'<path d="M12 3v12m-4-4l4 4 4-4M4 16v5h16v-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M4 12l5 5L20 6"/>',
  arrow:'<path d="M4 12h15m-5-5l5 5-5 5"/>',
  heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 2 11 8 16 6-5 13-11 8-16z"/>',
  tree:'<path d="M12 2L5 10h4l-6 7h7v5h4v-5h7l-6-7h4z"/>',
  flower:'<circle cx="12" cy="12" r="2"/><path d="M12 9c-7-10 7-10 0 0m3 2c10-7 10 7 0 0m-2 4c7 10-7 10 0 0m-4-2c-10 7-10-7 0 0"/>',
  ocean:'<path d="M3 11a9 9 0 0118 0zM6 12c-3 4 3 5 0 9m6-9c-3 4 3 5 0 9m6-9c-3 4 3 5 0 9"/>',
  focus:'<path d="M8 3H5a2 2 0 00-2 2v3m13-5h3a2 2 0 012 2v3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3"/><circle cx="12" cy="12" r="3"/>',
  fist:'<path d="M6 10V8a2 2 0 014 0v3M10 9V7a2 2 0 014 0v4M14 9V8a2 2 0 014 0v4M18 10a2 2 0 014 0v5a7 7 0 01-7 7h-4a6 6 0 01-5-3l-3-5a2 2 0 013-2l4 3"/>',
  pinch:'<path d="M6 18c-3-1-4-5-2-7l5-7a2 2 0 013 2L9 11m0 0 7-3a2 2 0 012 3l-5 3m-4-3-3 4m7-1 6-1a2 2 0 011 4l-7 4H9"/>',
  point:'<path d="M9 12V4a2 2 0 014 0v7l5 1c2 0 3 2 3 4l-1 5H9l-5-6a2 2 0 013-2l2 2"/>',
  victory:'<path d="M8 13 5 5a2 2 0 014-1l3 7 3-8a2 2 0 014 1l-3 10m-8-1-2 1a2 2 0 00-1 3l4 5h7c3-2 4-6 2-8l-5-3m-5 2 5 4"/>',
  thumb:'<path d="M8 10l4-7c1-2 4-1 3 2l-1 5h5c2 0 3 2 2 4l-2 7H8zM3 10h5v11H3z"/>',
  zoom:'<path d="M8 3H3v5m0-5 6 6m7 12h5v-5m0 5-6-6M3 16v5h5m13-13V3h-5"/>',
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.orbit)+'</svg>';}
const app=document.getElementById('app');
app.innerHTML=`
  <div id="scene" class="scene"></div>
  <div class="scene-vignette" aria-hidden="true"></div>
  <div class="ambient-number" id="world-number" aria-hidden="true">01</div>
  <header class="topbar">
    <a class="brand" href="#" aria-label="掌间交互，回到初始视角"><span class="brand-symbol">${icon('orbit')}</span><span>掌间交互<small>让想象，随手发生</small></span></a>
    <div class="top-actions">
      <span class="live-mark"><i></i>沉浸式手势艺术</span>
      <button id="focus-button" class="text-button" type="button" aria-label="沉浸观看" title="沉浸观看" aria-pressed="false">${icon('focus')}<span>沉浸观看</span></button>
      <button class="text-button guide-open" type="button">${icon('help')}<span>使用指南</span></button>
      <button id="sound-button" class="icon-button" type="button" aria-label="开启氛围音" title="开启氛围音">${icon('mute')}</button>
      <button id="fullscreen-button" class="icon-button" type="button" aria-label="全屏体验" title="全屏体验">${icon('expand')}</button>
    </div>
  </header>
  <main class="experience-ui">
    <section class="world-intro" aria-label="当前作品">
      <p class="eyebrow"><span class="eyebrow-line"></span><span>掌间万象</span><b id="intro-number">01</b><span class="eyebrow-total">/ 05</span></p>
      <p class="work-tag" id="intro-world">星际引力</p>
      <h1 id="world-title">把宇宙，
握在掌间。</h1>
      <p id="world-description" class="world-description">张开手掌，让一颗星球化作漫游的星系。</p>
      <div class="gesture-pair"><span>${icon('fist')}握紧聚合</span><i></i><span>${icon('hand')}张开散开</span></div>
    </section>
    <section class="deck-upper" aria-label="开启手势体验">
      <div class="gesture-tip"><span class="tip-icon">${icon('hand')}</span><div><strong id="camera-status">伸出手，让世界回应你</strong><span id="gesture-tip-text">也可直接拖动、缩放探索</span></div><span id="confirmation-progress" class="confirmation-progress" hidden></span></div>
      <div class="deck-actions"><button id="camera-button" class="camera-button" type="button">${icon('camera')}<span>开启摄像头</span>${icon('arrow')}</button><button id="photos-button" class="photo-button" type="button" aria-label="加入照片（可选）" title="加入照片（可选）">${icon('photo')}<span>加入照片<small>可选</small></span><b id="photo-count" hidden>0</b></button></div>
      <p class="start-sequence">开启镜头<span>·</span>选择作品<span>·</span>可选加入照片</p>
    </section>
    <button id="demo-button" class="demo-button" type="button" aria-label="观看自动演绎" aria-pressed="false">${icon('play')}<span>观看自动演绎</span><i></i></button>
    <div class="scene-caption"><span id="world-name">星际引力</span><span id="world-caption-sub">由你的双手，定义形态</span></div>
    <button id="tools-toggle" class="tools-toggle" type="button" aria-label="展开场景操作" aria-expanded="false" aria-controls="scene-tools"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
    <div id="scene-tools" class="scene-tools" aria-label="场景操作">
      <button id="spread-button" type="button" aria-label="展开或聚合" title="展开或聚合">${icon('hand')}<span>展开</span></button>
      <button id="freeze-button" type="button" aria-label="定格场景" title="定格或继续">${icon('pause')}<span>定格</span></button>
      <button id="reset-button" type="button" aria-label="恢复默认视角" title="恢复默认视角">${icon('refresh')}<span>复位</span></button>
      <button id="save-button" type="button" aria-label="保存场景图片" title="保存画面">${icon('download')}<span>保存</span></button>
    </div>
    <div class="world-stepper"><button id="prev-world" type="button" aria-label="上一件作品">${icon('arrow')}</button><span>切换作品</span><button id="next-world" type="button" aria-label="下一件作品">${icon('arrow')}</button></div>
    <section class="morph-panel" aria-label="形态控制"><div class="morph-heading"><span>指尖的距离，世界的形状</span><output id="morph-percent">0%</output></div><div class="morph-control"><input id="morph-range" type="range" min="0" max="100" step="1" value="0" aria-label="调节造型聚散程度"></div><div class="morph-ends"><span id="morph-from">聚合</span><span id="morph-to">漫游</span></div><p class="world-note" id="morph-note">一颗星球，等待你的引力</p></section>
    <section id="camera-panel" class="camera-panel" aria-label="摄像头预览" hidden><div class="camera-preview"><video id="camera-video" autoplay muted playsinline></video><canvas id="camera-overlay" width="320" height="240" aria-hidden="true"></canvas><span class="camera-corner tl"></span><span class="camera-corner tr"></span><span class="camera-corner bl"></span><span class="camera-corner br"></span></div><div class="camera-panel-footer"><span id="pose-label">等待手势</span><button id="hide-camera" type="button" aria-label="收起摄像头预览">收起</button></div></section>
    <button id="show-camera" class="show-camera" type="button" hidden>${icon('camera')}显示预览</button>
    <div id="hand-cursor" class="hand-cursor" aria-hidden="true" hidden><span></span><i></i></div>
    <div id="photo-focus" class="photo-focus" hidden><span>正在欣赏你的照片</span><button id="close-photo" type="button">收回照片 ${icon('close')}</button></div>
    <section class="control-deck" aria-label="选择作品"><div class="collection-heading"><span>五个世界，随心而至</span><span><b id="collection-index">01</b> / 05</span></div><nav class="world-dock" aria-label="系统造型">${WORLD_INFO.map((world,index)=>`<button type="button" class="world-button ${index===0?'active':''}" data-world="${world.id}" aria-pressed="${index===0}" aria-label="${world.name}"><span class="world-thumb" aria-hidden="true"><img data-preview="${world.id}" alt=""><span class="world-mini">${icon({saturn:'orbit',heart:'heart',tree:'tree',flower:'flower',ocean:'ocean'}[world.id])}</span></span><span class="world-button-text"><small>${world.number}</small><strong>${world.name}</strong></span><i></i></button>`).join('')}</nav></section>
    <footer class="bottom-meta"><span><i></i>影像仅在本机处理</span><div><label for="quality-select">画质</label><select id="quality-select" aria-label="选择渲染画质"><option value="auto">自动适配</option><option value="high">精致画质</option><option value="low">流畅优先</option></select></div></footer>
  </main>
  <div id="loading" class="loading-overlay"><span class="loading-orbit">${icon('orbit')}</span><p>万象，即将与你相遇。</p><small>正在唤醒光影与形态</small><i></i></div>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  <dialog id="guide-dialog" class="dialog guide-dialog" aria-labelledby="guide-title">
    <button class="dialog-close" type="button" aria-label="关闭使用说明">${icon('close')}</button>
    <p class="dialog-eyebrow">欢迎来到掌间交互</p><h2 id="guide-title">三步，把世界握在掌间。</h2><p class="dialog-description">用一只手，就能开始。手机和电脑都可以。</p>
    <div class="steps"><div><span>一</span><section><h3>开启摄像头</h3><p>允许浏览器使用前置摄像头，把手举到画面中。</p></section>${icon('camera')}</div><div><span>二</span><section><h3>选择喜欢的造型</h3><p>星环、爱心、圣诞树、花朵、水母，随时切换。</p></section>${icon('orbit')}</div><div><span>三</span><section><h3>加入你的照片 <small>可选</small></h3><p>照片会悬浮在造型中，也能被你捏合抓取。不加照片也能完整体验。</p></section>${icon('photo')}</div></div>
    <div class="guide-gestures"><h3>你的手，可以这样玩</h3><div class="gesture-grid">${[['hand','张开手掌','展开、散开'],['fist','握紧拳头','收拢、聚合'],['refresh','移动手掌','转动作品'],['pinch','捏合指尖','抓取照片'],['point','伸出食指','画出星尘'],['victory','保持胜利手势','约一秒后切换造型'],['thumb','保持竖拇指','约一秒后定格、继续'],['zoom','双手拉开靠拢','放大、缩小']].map(([symbol,title,text])=>`<div>${icon(symbol)}<strong>${title}</strong><span>${text}</span></div>`).join('')}</div><p class="guide-footnote">切换与定格需要短暂保持手势。手机也可用单指拖动、双指缩放。点击画面右侧的「⋯」，可以展开、定格、复位或保存作品。</p></div>
    <div class="dialog-actions"><button class="primary-button" id="guide-camera" type="button">${icon('camera')}开启摄像头，开始体验</button><button class="secondary-button" id="guide-explore" type="button">先看看系统造型 ${icon('arrow')}</button></div>
    <p class="privacy-note">只需摄像头权限，不使用麦克风。照片和摄像头画面不会上传到服务器。</p>
  </dialog>
  <dialog id="photos-dialog" class="dialog photos-dialog" aria-labelledby="photos-title"><button class="dialog-close" type="button" aria-label="关闭照片管理">${icon('close')}</button><p class="dialog-eyebrow">让这个世界，有你的故事</p><h2 id="photos-title">加入你的照片。</h2><p class="dialog-description">可选步骤。照片会加入当前造型，随你聚合、散开；捏合照片可拿到眼前查看。</p><label class="upload-zone" id="upload-zone" for="photo-input">${icon('plus')}<strong>选择照片，或将照片拖到这里</strong><span>支持多张照片，最多二十四张</span><input id="photo-input" type="file" accept="image/*" multiple></label><p id="photo-upload-status" class="photo-upload-status" role="status" aria-live="polite"></p><div id="photo-grid" class="photo-grid"></div><div class="photo-dialog-footer"><span>照片仅用于本次体验，刷新后会清空。</span><button id="clear-photos" class="secondary-button" type="button" hidden>清空照片</button></div><button class="primary-button photos-done" id="photos-done" type="button">回到世界 ${icon('arrow')}</button></dialog>
`;

const $=selector=>app.querySelector(selector);
let experience,camera,toastTimer,audioContext,audioNodes=[],soundOn=false,cameraPreviewHidden=false,uploading=false,lastRangeInput=0,lastMotionValue=-1,lastMotionNote='';
const guide=$('#guide-dialog'),photosDialog=$('#photos-dialog');
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},4300);}
function readStorage(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeStorage(key,value){try{localStorage.setItem(key,value);}catch{}}
function renderWorld(world){
  app.style.setProperty('--accent',world.color);app.dataset.world=world.id;app.dataset.tools='no';$('#tools-toggle').setAttribute('aria-expanded','false');$('#tools-toggle').setAttribute('aria-label','展开场景操作');
  $('#world-title').textContent=world.title;$('#world-description').textContent=world.description;$('#world-name').textContent=world.name;$('#world-number').textContent=world.number;$('#collection-index').textContent=world.number;
  $('#intro-number').textContent=world.number;$('#intro-world').textContent=world.name;$('#morph-from').textContent=world.id==='flower'?'花苞':'聚合';$('#morph-to').textContent=world.id==='flower'?'飘散':'漫游';
  $('.world-intro').classList.remove('world-enter');requestAnimationFrame(()=>$('.world-intro').classList.add('world-enter'));
  app.querySelectorAll('[data-world]').forEach(button=>{const active=button.dataset.world===world.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $('#spread-button span').textContent='展开';writeStorage('掌间交互造型',world.id);
}
function renderPhotoList(){app.dataset.tools='no';$('#tools-toggle').setAttribute('aria-expanded','false');$('#tools-toggle').setAttribute('aria-label','展开场景操作');const container=$('#photo-grid');container.replaceChildren();experience.photos.forEach(photo=>{const item=document.createElement('div');item.className='photo-tile';const image=document.createElement('img');image.src=photo.thumbnail;image.alt=photo.name;const button=document.createElement('button');button.type='button';button.innerHTML=icon('close');button.setAttribute('aria-label','移除照片：'+photo.name);button.addEventListener('click',()=>{experience.removePhoto(photo.id);renderPhotoList();});item.append(image,button);container.append(item);});$('#photo-count').textContent=experience.photos.length;$('#photo-count').hidden=experience.photos.length===0;$('#clear-photos').hidden=experience.photos.length===0;$('#world-caption-sub').textContent=experience.photos.length?'已加入 '+experience.photos.length+' 张珍藏照片':'由你的双手，定义形态';}
async function importPhotos(files){
  if(uploading)return;uploading=true;const list=Array.from(files).filter(file=>file.type.startsWith('image/')||/\.(heic|heif|avif|jpg|jpeg|png|webp)$/i.test(file.name));if(!list.length){toast('请选择照片文件。');uploading=false;return;}
  const available=24-experience.photos.length,selected=list.slice(0,available);if(!selected.length){toast('最多加入二十四张照片，请先移除几张。');uploading=false;return;}
  let count=0,errors=0;$('#upload-zone').classList.add('busy');
  for(const file of selected){$('#photo-upload-status').textContent='正在准备照片 '+(count+errors+1)+' / '+selected.length;try{const data=await preparePhoto(file);experience.addPhoto(data);count++;renderPhotoList();}catch(error){errors++;console.warn('Photo could not be decoded',error);}}
  $('#upload-zone').classList.remove('busy');uploading=false;$('#photo-input').value='';$('#photo-upload-status').textContent='已加入 '+count+' 张照片'+(errors?'，有 '+errors+' 张未能读取，请尝试其他图片格式。':'。回到场景，试着捏合一张照片。');if(list.length>available)toast('本次加入了前 '+available+' 张，最多支持二十四张。');
}
function closeGuide(){guide.close();writeStorage('掌间交互已阅读引导','是');}
function updateCameraStatus({state,text}){
  const active=['ready','loading'].includes(state),pending=['permission','loading'].includes(state);
  app.dataset.camera=active?'on':pending?'loading':'off';$('#camera-status').textContent=text;
  $('#camera-button span').textContent=active?'关闭摄像头':pending?'取消开启':'开启摄像头';
  $('#guide-camera').innerHTML=icon('camera')+(active?'回到手势体验':'开启摄像头，开始体验');$('#camera-button').classList.toggle('is-on',active);$('#camera-panel').hidden=!active||cameraPreviewHidden;$('#show-camera').hidden=!active||!cameraPreviewHidden;
  if(state==='off'||state==='error'){$('#hand-cursor').hidden=true;$('#gesture-tip-text').textContent='单指拖动、双指缩放，也可以点击游玩';$('#confirmation-progress').hidden=true;}
}
const poseNames={palm:'张开手掌',fist:'握紧拳头',pinch:'捏合抓取',point:'食指画星尘',victory:'保持手势，切换造型',thumb:'保持手势，定格或继续'};
function handleHands({hands,confirmation,time}){
  experience.processHands(hands,time);
  const hand=hands[0],cursor=$('#hand-cursor');cursor.hidden=!hand;
  if(hand){const point=hand.pinch?hand.grab:hand.pose==='point'?hand.pointer:{x:hand.x,y:hand.y};cursor.style.left=point.x*100+'%';cursor.style.top=point.y*100+'%';cursor.classList.toggle('pinching',hand.pinch);$('#pose-label').textContent=hands.length>1?'双手缩放':poseNames[hand.pose];$('#camera-status').textContent='手势已连接';$('#gesture-tip-text').textContent=hands.length>1?'双手拉开或靠拢，控制场景大小':poseNames[hand.pose];}
  else if(camera.running){$('#pose-label').textContent='把手举到画面中';$('#camera-status').textContent='摄像头已开启';$('#gesture-tip-text').textContent='把一只手举到肩膀前，让指尖完整入镜';}
  const progress=$('#confirmation-progress');progress.hidden=!confirmation.progress;progress.style.setProperty('--progress',confirmation.progress);
  if(confirmation.action==='next'){experience.nextWorld();renderPhotoList();toast('已切换到'+experience.current.name);}
  if(confirmation.action==='freeze'){const frozen=experience.toggleFreeze();updateFreezeButton(frozen);toast(frozen?'场景已定格，保持竖拇指可继续。':'世界继续流动。');}
}
function updateFreezeButton(frozen){$('#freeze-button').innerHTML=icon(frozen?'play':'pause')+'<span>'+(frozen?'继续':'定格')+'</span>';$('#freeze-button').setAttribute('aria-label',frozen?'继续场景动画':'定格场景');}
const motionNotes={saturn:['一颗星球，等待你的引力','星环，正在缓缓解开','让群星沿轨道漫游'],heart:['所有心动，聚在一起','松开一点，让心动流转','每一颗，都是独立的小心动'],tree:['把回忆，珍藏成一棵树','星光正在离开枝头','让星饰与记忆缓缓环绕'],flower:['花苞，等你轻轻松手','花瓣正在层层舒展','让花瓣随你的手飞舞'],ocean:['静静呼吸的一片微光','水母正在向远处游散','一群微光，自在漂游']};
function renderMotion({fraction,expanded,world}){
  const value=Math.round(Math.max(0,Math.min(1,fraction))*100);if(value!==lastMotionValue){lastMotionValue=value;if(performance.now()-lastRangeInput>500)$('#morph-range').value=value;$('#morph-range').style.setProperty('--fill',value+'%');$('#morph-percent').textContent=value+'%';}
  const note=motionNotes[world][fraction<.2?0:fraction<.78?1:2];if(note!==lastMotionNote){lastMotionNote=note;$('#morph-note').textContent=note;}
  const label=expanded?'聚合':'展开';if($('#spread-button span').textContent!==label)$('#spread-button span').textContent=label;
}
function sceneError(error){console.error(error);$('#loading').hidden=false;$('#loading').classList.remove('ready');$('#loading').innerHTML='<span class="loading-orbit">'+icon('orbit')+'</span><p>这个世界暂时未能开启</p><small>请使用支持三维渲染的新版浏览器，或在浏览器设置中开启图形加速。</small><button type="button" class="primary-button" id="reload-button">重新尝试</button>';$('#reload-button').onclick=()=>location.reload();}
async function toggleCamera(){experience?.setDemo(false);if(camera.running||camera.starting)camera.stop();else await camera.start();}
function capture(){const link=document.createElement('a');link.href=experience.capture();link.download='掌间交互-'+experience.current.name+'.png';link.click();toast('已保存这一刻。');}
function toggleAudio(){
  if(!audioContext){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext){toast('当前浏览器暂不支持氛围音。');return;}audioContext=new AudioContext();const gain=audioContext.createGain();gain.gain.value=0;gain.connect(audioContext.destination);[130.81,196,261.63,329.63].forEach((frequency,index)=>{const oscillator=audioContext.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.detune.value=index*2-3;const voice=audioContext.createGain();voice.gain.value=.017/(index+1);oscillator.connect(voice);voice.connect(gain);oscillator.start();audioNodes.push(oscillator);});audioNodes.gain=gain;}
  audioContext.resume();soundOn=!soundOn;audioNodes.gain.gain.setTargetAtTime(soundOn?1:0,audioContext.currentTime,.8);$('#sound-button').innerHTML=icon(soundOn?'sound':'mute');$('#sound-button').setAttribute('aria-label',soundOn?'关闭氛围音':'开启氛围音');
}

try{
  experience=new Experience($('#scene'),{onReady(){requestAnimationFrame(()=>{$('#loading').classList.add('ready');setTimeout(()=>{$('#loading').hidden=true;},700);});},onWorld:world=>renderWorld(world),onPhotoFocus:photo=>{$('#photo-focus').hidden=!photo;app.dataset.photoFocus=photo?'yes':'no';},onQuality:mode=>{if(mode==='adaptive')toast('已为当前设备自动优化画面，让互动更流畅。');},onPreviews(previews){for(const [id,url] of Object.entries(previews)){const image=app.querySelector('[data-preview="'+id+'"]');image.src=url;image.parentElement.classList.add('ready');}},onMotion:renderMotion,onDemo(active){app.dataset.demo=active?'yes':'no';$('#demo-button').setAttribute('aria-pressed',String(active));$('#demo-button').setAttribute('aria-label',active?'停止自动演绎':'观看自动演绎');$('#demo-button').innerHTML=icon(active?'pause':'play')+'<span>'+(active?'停止自动演绎':'观看自动演绎')+'</span><i></i>';}});
  experience.ready.catch(sceneError);
  camera=new GestureCamera({video:$('#camera-video'),overlay:$('#camera-overlay'),onStatus:updateCameraStatus,onHands:handleHands,onError:toast});
  const saved=readStorage('掌间交互造型');if(WORLD_INFO.some(world=>world.id===saved))experience.setWorld(saved);renderWorld(experience.current);
  const quality=readStorage('掌间交互画质');if(['auto','high','low'].includes(quality)){$('#quality-select').value=quality;experience.setQuality(quality);}
}catch(error){sceneError(error);}

app.querySelectorAll('[data-world]').forEach(button=>button.addEventListener('click',()=>{experience?.setDemo(false);experience?.setWorld(button.dataset.world);renderPhotoList();}));
$('#camera-button').addEventListener('click',()=>toggleCamera());
$('#photos-button').addEventListener('click',()=>photosDialog.showModal());
app.querySelectorAll('.guide-open').forEach(button=>button.addEventListener('click',()=>guide.showModal()));
app.querySelectorAll('.dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>{if(dialog===guide)closeGuide();else dialog.close();});dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});});
$('#guide-camera').addEventListener('click',()=>{closeGuide();if(!camera.running&&!camera.starting)toggleCamera();});$('#guide-explore').addEventListener('click',closeGuide);
$('#photo-input').addEventListener('change',event=>importPhotos(event.target.files));$('#photos-done').addEventListener('click',()=>photosDialog.close());
$('#clear-photos').addEventListener('click',()=>{[...experience.photos].forEach(photo=>experience.removePhoto(photo.id));renderPhotoList();$('#photo-upload-status').textContent='照片已清空。';});
const drop=$('#upload-zone');['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragging');}));['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('dragging');if(name==='drop')importPhotos(event.dataTransfer.files);}));
$('#hide-camera').addEventListener('click',()=>{cameraPreviewHidden=true;$('#camera-panel').hidden=true;$('#show-camera').hidden=false;});$('#show-camera').addEventListener('click',()=>{cameraPreviewHidden=false;$('#camera-panel').hidden=false;$('#show-camera').hidden=true;});
$('#spread-button').addEventListener('click',()=>{experience.setDemo(false);$('#spread-button span').textContent=experience.toggleSpread()?'聚合':'展开';});
$('#morph-range').addEventListener('input',event=>{experience.setDemo(false);lastRangeInput=performance.now();experience.setMorph(Number(event.target.value)/100);event.target.style.setProperty('--fill',event.target.value+'%');});
$('#focus-button').addEventListener('click',()=>{const immersive=app.dataset.immersive!=='yes';app.dataset.immersive=immersive?'yes':'no';experience.immersive=immersive;experience.resize();const label=immersive?'返回操作':'沉浸观看';$('#focus-button').setAttribute('aria-pressed',String(immersive));$('#focus-button').setAttribute('aria-label',label);$('#focus-button').title=label;$('#focus-button span').textContent=label;});
$('#freeze-button').addEventListener('click',()=>{experience.setDemo(false);updateFreezeButton(experience.toggleFreeze());});$('#reset-button').addEventListener('click',()=>{experience.resetView();updateFreezeButton(false);$('#spread-button span').textContent='展开';});$('#save-button').addEventListener('click',capture);$('#close-photo').addEventListener('click',()=>experience.clearFocus());
$('#sound-button').addEventListener('click',toggleAudio);$('#quality-select').addEventListener('change',event=>{experience.setQuality(event.target.value);writeStorage('掌间交互画质',event.target.value);});
$('#fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('当前浏览器可通过“添加到主屏幕”获得更沉浸的体验。');}catch{toast('当前浏览器暂时无法进入全屏。');}});
$('.brand').addEventListener('click',event=>{event.preventDefault();experience?.resetView();updateFreezeButton(false);$('#spread-button span').textContent='展开';});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!guide.open&&!photosDialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#spread-button').click();}if(event.key==='Escape'&&experience?.focused)experience.clearFocus();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&soundOn){audioNodes.gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);}else if(soundOn)audioNodes.gain.gain.setTargetAtTime(1,audioContext.currentTime,.8);});
window.addEventListener('pagehide',()=>{camera?.stop();});

$('#demo-button').addEventListener('click',()=>{if(camera.running||camera.starting)camera.stop();experience.setDemo(!experience.demo);updateFreezeButton(false);});
$('#next-world').addEventListener('click',()=>{experience.setDemo(false);experience.nextWorld();renderPhotoList();});
$('#prev-world').addEventListener('click',()=>{experience.setDemo(false);const index=WORLD_INFO.findIndex(w=>w.id===experience.current.id);experience.setWorld(WORLD_INFO[(index+WORLD_INFO.length-1)%WORLD_INFO.length].id);renderPhotoList();});

$('#tools-toggle').addEventListener('click',()=>{const open=app.dataset.tools!=='yes';app.dataset.tools=open?'yes':'no';$('#tools-toggle').setAttribute('aria-expanded',String(open));$('#tools-toggle').setAttribute('aria-label',open?'收起场景操作':'展开场景操作');});
