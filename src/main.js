import './dialogs.css';
import './exhibition.css';
import './exhibition-panels.css';
import './photo-viewer.css';
import './theater.css';
import {setupTheaterUI} from './theater-ui.js';
import {exhibitionMarkup} from './exhibition-ui.js';
import {LOOKS,readLook} from './presentation.js';
import {PHOTO_ARRANGEMENTS} from './photo-arrangement.js';
import {setupPhotoViewer} from './photo-viewer.js';
import {gestureInstruction} from './gesture-instruction.js';
import { WORLD_INFO } from './worlds.js';
import { Experience } from './experience.js';
import { GestureCamera } from './gestures.js';
import { preparePhoto } from './photos.js';
import {readSharedScene,sceneShareUrl} from './share-state.js';
import {setupSharing} from './sharing.js';
import {WORLD_STAGES} from './scene-layout.js';
import {sampleFiles,SAMPLE_ALBUM} from './sample-album.js';
import {aboutMarkup,FEEDBACK_TEMPLATE} from './about.js';

const icons={
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
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
  share:'<path d="M12 16V3m-4 4 4-4 4 4M5 12H3v9h18v-9h-2"/>',
  zoom:'<path d="M8 3H3v5m0-5 6 6m7 12h5v-5m0 5-6-6M3 16v5h5m13-13V3h-5"/>',
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.orbit)+'</svg>';}
const app=document.getElementById('app');
app.innerHTML=exhibitionMarkup(WORLD_INFO,icon)+`
  <dialog id="guide-dialog" class="dialog guide-dialog" aria-labelledby="guide-title">
    <button class="dialog-close" type="button" aria-label="关闭使用说明">${icon('close')}</button>
    <p class="dialog-eyebrow">欢迎来到掌间交互</p><h2 id="guide-title">三步，把世界握在掌间。</h2><p class="dialog-description">先看一场光影剧场，再用触屏、鼠标或手势接管。无需摄像头也能完整体验。</p>
    <div class="steps"><div><span>一</span><section><h3>先选一种玩法</h3><p>直接拖动、缩放即可探索。想用手势时，再开启摄像头。</p></section>${icon('camera')}</div><div><span>二</span><section><h3>选择喜欢的造型</h3><p>星环、爱心、圣诞树、花朵、水母，随时切换。</p></section>${icon('orbit')}</div><div><span>三</span><section><h3>加入你的照片 <small>可选</small></h3><p>可先用示例相册体验，再加入自己的照片。放大后点选缩略图、左右滑动，或开启每五秒切换的自动播放。</p></section>${icon('photo')}</div></div>
    <div class="guide-gestures"><h3>你的手，可以这样玩</h3><div class="gesture-grid">${[['hand','张开手掌','展开、散开'],['fist','握紧拳头','收拢、聚合'],['refresh','移动手掌','转动作品'],['pinch','捏合指尖','抓取照片'],['point','伸出食指','画出星尘'],['victory','保持胜利手势','约一秒后切换造型'],['thumb','保持竖拇指','约一秒后定格、继续'],['zoom','双手拉开靠拢','放大、缩小']].map(([symbol,title,text])=>`<div>${icon(symbol)}<strong>${title}</strong><span>${text}</span></div>`).join('')}</div><p class="guide-footnote">切换与定格需要短暂保持手势。轻触作品可唤起光波，完整张开手掌也会触发回应。手机可用单指拖动、双指缩放；三个观赏阶段可以直接选择。手机点击「随心塑形」旁的操作按钮，可以展开、定格、复位或保存作品。「光影剧场」会依次演出五个世界，可以点选章节、暂停、继续，或保存当前这一幕。</p></div>
    <div class="dialog-actions"><button class="primary-button" id="guide-camera" type="button">${icon('camera')}开启摄像头，开始体验</button><button class="secondary-button" id="guide-explore" type="button">先看看系统造型 ${icon('arrow')}</button></div>
    <p class="privacy-note">只需摄像头权限，不使用麦克风。照片和摄像头画面不会上传到服务器。</p>
  </dialog>
  <dialog id="photos-dialog" class="dialog photos-dialog" aria-labelledby="photos-title"><button class="dialog-close" type="button" aria-label="关闭照片管理">${icon('close')}</button><p class="dialog-eyebrow">让这个世界，有你的故事</p><h2 id="photos-title">加入你的照片。</h2><p class="dialog-description">1 张照片也能玩，建议先选 1～9 张。照片会保留完整构图，悬浮在作品周围，可轻触或捏合放大。</p><div class="sample-album-entry"><button id="sample-album" class="secondary-button" type="button">先用示例相册体验</button><span>使用本站三张光影作品图，无需提供私人照片</span></div><label class="upload-zone" id="upload-zone" for="photo-input">${icon('plus')}<strong>选择照片，或将照片拖到这里</strong><span>导入仅在本机处理，最多二十四张</span><input id="photo-input" type="file" accept="image/*" multiple></label><p id="photo-upload-status" class="photo-upload-status" role="status" aria-live="polite"></p><div id="photo-grid" class="photo-grid"></div><section id="photo-arrangement" class="photo-arrangement" hidden><h3>为照片选择一种排布</h3><div role="group" aria-label="相册排布">${Object.entries(PHOTO_ARRANGEMENTS).map(([value,name])=>`<button type="button" data-arrangement="${value}" aria-pressed="${value==='world'}">${name}</button>`).join('')}</div><p id="arrangement-note">照片会跟随所选作品，轻触任何一张即可欣赏。</p></section><div class="photo-dialog-footer"><span>照片仅用于本次体验，刷新后会清空。</span><button id="clear-photos" class="secondary-button" type="button" hidden>清空照片</button></div><div class="photo-dialog-actions"><button class="primary-button" id="photos-view" type="button" disabled>欣赏照片 ${icon('arrow')}</button><button class="secondary-button" id="photos-done" type="button">回到作品</button></div></dialog>
  <dialog id="share-dialog" class="dialog share-dialog" aria-labelledby="share-title"><button class="dialog-close" type="button" aria-label="关闭保存与分享">${icon('close')}</button><p class="dialog-eyebrow">留住你的这一刻</p><h2 id="share-title">把光影，带给更多人。</h2><img id="share-preview" class="share-preview" alt="当前作品画面"><p id="share-photo-note" class="dialog-description"></p><div class="share-options"><label for="export-format">保存格式 <select id="export-format" aria-label="选择保存图片格式"><option value="png">PNG · 保留细节</option><option value="webp">WebP · 文件更小</option></select></label><span id="export-meta"></span></div><div class="share-actions"><a id="download-image" class="primary-button" download target="_blank" rel="noopener">${icon('download')}保存图片</a><button id="share-image" class="secondary-button" type="button" hidden>${icon('share')}分享图片</button><button id="share-website" class="secondary-button" type="button" hidden>${icon('share')}分享体验链接</button><button id="copy-link" class="secondary-button" type="button">${icon('check')}复制体验链接</button></div><label class="share-link-label" for="share-link">链接保留作品、聚散与光影，不包含你的照片</label><input id="share-link" class="share-link" type="text" readonly aria-label="体验分享链接"></dialog>
  ${aboutMarkup()}
  <section id="recovery-panel" class="recovery-panel" role="status" aria-live="polite" hidden><span class="recovery-symbol">${icon('orbit')}</span><h2 id="recovery-title">三维画面暂时中断</h2><p id="recovery-text">正在等待画面恢复，你的照片仍保留在本页。</p><button id="reload-scene" class="primary-button" type="button">重新加载画面</button><small id="recovery-photo-warning"></small></section>
`;

const $=selector=>app.querySelector(selector);
let experience,camera,photoViewer,theaterUI,toastTimer,audioContext,audioNodes=[],soundOn=false,cameraPreviewHidden=false,uploading=false,importSequence=0,sampleController=null,lastMotionValue=-1,lastMotionWorld='',lastMotionNote='',lastProgressLabel='',lastGuidance='',lastProgressPhase='';
const guide=$('#guide-dialog'),photosDialog=$('#photos-dialog'),shareDialog=$('#share-dialog'),aboutDialog=$('#about-dialog'),catalogDialog=$('#catalog-dialog'),settingsDialog=$('#settings-dialog');
const sharedScene=readSharedScene(location.search);
const coarseInput=matchMedia('(pointer:coarse)').matches||innerWidth<760;
$('#explore-button span').textContent=coarseInput?'触屏探索':'直接探索';
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},4300);}
function readStorage(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeStorage(key,value){try{localStorage.setItem(key,value);}catch{}}
function renderLook(value){app.dataset.look=value;app.querySelectorAll('[data-look]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.look===value)));$('#look-note').textContent='当前光影：'+LOOKS[value].name+' · '+LOOKS[value].description;}
function renderDemo(active,detail){
  app.dataset.demo=active?'yes':'no';
  const label=active?'停止自动演绎':'观看自动演绎';
  $('#demo-button').setAttribute('aria-pressed',String(active));$('#demo-button').setAttribute('aria-label',label);$('#demo-button').innerHTML=icon(active?'pause':'play')+'<span>'+(active?'停止演绎':'单件演绎')+'</span>';
  if(active&&!camera?.running){$('#camera-status').textContent=detail.once?'先看一段演绎，随时接管':'正在自动演绎';$('#gesture-tip-text').textContent='直接拖动或开启手势，即可接管';}
  if(!active&&!camera?.running&&!camera?.starting){$('#camera-status').textContent='拖动旋转，轻触唤起光波';$('#gesture-tip-text').textContent='无需摄像头，也能完整体验';}
  if(detail.completed){writeStorage('掌间交互已体验','是');toast('演绎已结束，轮到你来塑造光影。');}
}
function renderTheater(frame){
  if(frame.active&&(camera?.running||camera?.starting))camera.stop();
  const changed=app.dataset.theater!==(frame.active?'yes':'no');app.dataset.theater=frame.active?'yes':'no';theaterUI?.render(frame);if(frame.active&&changed)updateFreezeButton(false);
  if(frame.completed)toast('五幕演出已结束，现在轮到你亲手探索。');
}
function revealSelectedWorld(){const dock=$('.world-dock'),active=dock.querySelector('.active');if(active)dock.scrollTo({left:active.offsetLeft-(dock.clientWidth-active.clientWidth)/2,behavior:'instant'});}
function renderWorld(world){
  $('.stage-presets').innerHTML=WORLD_STAGES[world.id].map(([name,value],i)=>'<button type="button" class="stage-button" data-stage="'+value+'" aria-label="'+name+'" aria-pressed="false"><i>0'+(i+1)+'</i>'+name+'</button>').join('');
  app.style.setProperty('--accent',world.color);app.dataset.world=world.id;app.dataset.tools='no';$('#tools-toggle').setAttribute('aria-expanded','false');$('#tools-toggle').setAttribute('aria-label','展开场景操作');
  $('#world-title').textContent=world.title;$('#world-description').textContent=world.description;$('#world-name').textContent=world.name;$('#world-number').textContent=world.number;$('#collection-index').textContent=world.number;
  $('#intro-number').textContent=world.number;$('#intro-world').textContent=world.name;$('#morph-from').textContent=world.id==='flower'?'花苞':'聚合';$('#morph-to').textContent=world.id==='flower'?'飘散':'漫游';
  $('.world-intro').classList.remove('world-enter');requestAnimationFrame(()=>$('.world-intro').classList.add('world-enter'));
  app.querySelectorAll('[data-world]').forEach(button=>{const active=button.dataset.world===world.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  requestAnimationFrame(revealSelectedWorld);
  $('#spread-button span').textContent='展开';writeStorage('掌间交互造型',world.id);
}
function updateAlbumButtons(){
  const complete=SAMPLE_ALBUM.every(sample=>experience.photos.some(photo=>photo.sampleId===sample.id));
  $('#sample-album').disabled=Boolean(sampleController)||uploading||complete||experience.photos.length>=24;
  $('#sample-album').textContent=sampleController?'正在准备示例相册':complete?'示例相册已加入':'先用示例相册体验';
  $('#photos-view').disabled=!experience.photos.length;
}
function renderPhotoFocus(photo){photoViewer?.render(photo);}
function renderPhotoList(){
  app.dataset.tools='no';$('#tools-toggle').setAttribute('aria-expanded','false');$('#tools-toggle').setAttribute('aria-label','展开场景操作');
  const container=$('#photo-grid');container.replaceChildren();
  experience.photos.forEach(photo=>{const item=document.createElement('div');item.className='photo-tile';const image=document.createElement('img');image.src=photo.thumbnail;image.alt=photo.name;const button=document.createElement('button');button.type='button';button.innerHTML=icon('close');button.setAttribute('aria-label','移除照片：'+photo.name);button.addEventListener('click',()=>{experience.removePhoto(photo.id);renderPhotoList();});item.append(image,button);container.append(item);});
  $('#photo-count').textContent=experience.photos.length;$('#photo-count').hidden=!experience.photos.length;$('#clear-photos').hidden=!experience.photos.length;$('#photo-arrangement').hidden=!experience.photos.length;
  $('#world-caption-sub').textContent=experience.photos.length?'已加入 '+experience.photos.length+' 张珍藏照片':'轻触作品，让微光回应';updateAlbumButtons();photoViewer?.render(experience.focused);
}
async function importPhotos(files,{signal}={}){
  if(uploading)return;
  const incoming=Array.from(files),list=incoming.filter(file=>(file.type.startsWith('image/')||/\.(heic|heif|avif|jpg|jpeg|png|webp)$/i.test(file.name))&&!(file.sampleId&&experience.photos.some(photo=>photo.sampleId===file.sampleId)));
  if(!list.length){$('#photo-upload-status').textContent=incoming.some(file=>file.sampleId)?'这些示例已经在相册中了。':'请选择照片文件。';return;}
  const available=24-experience.photos.length,selected=list.slice(0,available);if(!selected.length){$('#photo-upload-status').textContent='最多加入二十四张照片，请先移除几张。';return;}
  uploading=true;const sequence=++importSequence;updateAlbumButtons();let count=0,errors=0,firstError='';$('#upload-zone').classList.add('busy');
  try{for(const file of selected){if(signal?.aborted||sequence!==importSequence)break;$('#photo-upload-status').textContent='正在准备照片 '+(count+errors+1)+' / '+selected.length;try{const data=await preparePhoto(file);if(signal?.aborted||sequence!==importSequence){data.texture.dispose();break;}experience.addPhoto(data);count++;renderPhotoList();}catch(error){errors++;firstError||=error.message;console.warn('Photo could not be decoded',error);}}}
  finally{$('#upload-zone').classList.remove('busy');uploading=false;$('#photo-input').value='';updateAlbumButtons();}
  if(sequence!==importSequence)return;
  $('#photo-upload-status').textContent='已加入 '+count+' 张照片'+(errors?'，有 '+errors+' 张未能读取。'+firstError:'。可以开始欣赏，或回到作品中轻触照片。');if(list.length>available)toast('本次加入了前 '+available+' 张，最多支持二十四张。');
}
async function loadSamples(){
  if(sampleController||uploading)return;const controller=new AbortController();sampleController=controller;updateAlbumButtons();
  try{const files=await sampleFiles({signal:controller.signal});if(!controller.signal.aborted)await importPhotos(files,{signal:controller.signal});}
  catch(error){if(!controller.signal.aborted){$('#photo-upload-status').textContent='示例暂时未能加载，请重试或选择自己的照片。';}}
  finally{if(sampleController===controller)sampleController=null;updateAlbumButtons();}
}
function closeGuide(){guide.close();writeStorage('掌间交互已阅读引导','是');}
function setManualMode({announce=false}={}){
  experience?.setDemo(false);if(camera?.running||camera?.starting)camera.stop();app.dataset.input='manual';app.dataset.cameraState='off';
  $('#camera-status').textContent=coarseInput?'触屏探索已就绪':'鼠标探索已就绪';$('#gesture-tip-text').textContent=coarseInput?'单指转动、双指缩放；下方滑杆控制聚散':'拖动旋转、滚轮缩放；下方滑杆控制聚散';
  $('#explore-button span').textContent=coarseInput?'触屏探索':'直接探索';writeStorage('掌间交互已体验','是');
  if(announce){experience.renderer.domElement.focus({preventScroll:true});toast(coarseInput?'单指拖动旋转，双指缩放；滑杆可以控制聚散。':'拖动旋转，滚轮缩放；也可以调节下方的形态滑杆。');}
}
function updateCameraStatus({state,text}){
  const active=state==='ready',preview=['ready','loading'].includes(state),pending=['permission','loading'].includes(state);
  $('#camera-live').textContent=text;app.dataset.camera=active?'on':pending?'loading':'off';app.dataset.cameraState=state;$('#camera-status').textContent=text;
  $('#camera-button span').textContent=active?'关闭手势':pending?'取消开启':'开启手势';
  $('#guide-camera').innerHTML=icon('camera')+(active?'回到手势体验':'开启摄像头，开始体验');$('#camera-button').classList.toggle('is-on',active);$('#camera-panel').hidden=!preview||cameraPreviewHidden;$('#show-camera').hidden=!preview||!cameraPreviewHidden;
  if(active){app.dataset.input='gesture';$('#gesture-progress').hidden=true;lastGuidance='';$('#gesture-tip-text').textContent='举起一只手，保持指尖完整入镜';}
  if(state==='off'||state==='error'){app.dataset.tracking='off';lastGuidance='';$('#camera-panel').classList.remove('hand-found');$('#hand-cursor').hidden=true;$('#gesture-progress').hidden=true;$('#gesture-tip-text').textContent='随时可以选择直接探索';$('#confirmation-progress').hidden=true;}
}
function showCameraError(message){
  $('#camera-live').textContent=message;app.dataset.cameraState='error';$('#camera-status').textContent='手势暂未开启，可以重试或直接探索';$('#gesture-tip-text').textContent=message;$('#camera-button span').textContent='重试手势';toast(message);
}
function updateModelProgress({phase,ratio,loaded}){
  const meter=$('#gesture-progress');meter.hidden=false;if(phase!==lastProgressPhase){lastProgressPhase=phase;$('#camera-live').textContent=phase==='download'?'正在下载手势模型':'正在准备手势识别';}
  const label=phase==='download'?'下载手势模型'+(ratio===null?'':' · '+Math.round(ratio*100)+'%'):phase==='runtime'?'正在准备识别组件':phase==='adjusting'?'正在调整识别方式':'正在启动手势识别';
  if(label!==lastProgressLabel){lastProgressLabel=label;$('#camera-status').textContent=label;}
  if(phase==='download'&&ratio!==null)meter.value=ratio;else meter.removeAttribute('value');
  $('#gesture-tip-text').textContent=phase==='download'?'首次开启需要下载，之后会使用缓存；可随时取消':'无需等待也能先用触屏或鼠标探索';
  $('#camera-advice').textContent=phase==='download'?'正在下载识别资源。可以取消开启，先直接探索。':'正在准备识别，请稍候。';
}
function updateContext(state){
  const panel=$('#recovery-panel');
  if(state==='ready'){panel.hidden=true;if(soundOn)audioNodes.gain.gain.setTargetAtTime(1,audioContext.currentTime,.4);toast(experience?.photos.length?'画面已恢复，你的照片也已保留。':'画面已恢复，可以继续探索。');return;}
  app.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());camera?.stop();if(soundOn)audioNodes.gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);panel.hidden=false;
  $('#recovery-title').textContent=state==='restoring'?'正在重新点亮画面':state==='error'?'画面暂时未能恢复':'三维画面暂时中断';
  $('#recovery-text').textContent=state==='error'?'可以重新加载后继续体验。':'正在等待浏览器恢复三维画面，你可以稍等片刻。';
  $('#recovery-photo-warning').textContent=experience?.photos.length?'重新加载会清空本次加入的照片；自动恢复会保留它们。':'';
}
const poseNames={palm:'张开手掌',fist:'握紧拳头',pinch:'捏合抓取',point:'食指画星尘',victory:'保持手势，切换造型',thumb:'保持手势，定格或继续'};
function handleHands({hands,confirmation,guidance,time}){
  if(app.querySelector('dialog[open]')||!$('#recovery-panel').hidden){camera?.confirmation.reset();$('#hand-cursor').hidden=true;return;}
  experience.processHands(hands,time);
  const instruction=gestureInstruction(hands,{grabbing:Boolean(experience.grabbed),frozen:experience.frozen}),hand=hands[0],cursor=$('#hand-cursor');cursor.hidden=!hand;
  if(hand){const point=hand.pinch?hand.grab:hand.pose==='point'?hand.pointer:{x:hand.x,y:hand.y};cursor.style.left=point.x*100+'%';cursor.style.top=point.y*100+'%';cursor.classList.toggle('pinching',hand.pinch);$('#pose-label').textContent=instruction?.title||poseNames[hand.pose];$('#camera-status').textContent=instruction?.title||'手势已连接';$('#gesture-tip-text').textContent=instruction?.hint||poseNames[hand.pose];}
  else if(camera.running&&guidance){$('#pose-label').textContent=guidance.title;$('#camera-status').textContent=guidance.title;$('#gesture-tip-text').textContent=guidance.hint;}
  if(guidance){app.dataset.tracking=guidance.state;$('#camera-advice').textContent=instruction?.hint||guidance.hint;if(guidance.state==='tracking'&&lastGuidance!=='tracking'){$('#camera-panel').classList.remove('hand-found');requestAnimationFrame(()=>$('#camera-panel').classList.add('hand-found'));}if(lastGuidance!==guidance.state)$('#camera-live').textContent=guidance.title;lastGuidance=guidance.state;}
  const progress=$('#confirmation-progress');progress.hidden=!confirmation.progress;progress.style.setProperty('--progress',confirmation.progress);
  if(confirmation.action==='next'){experience.nextWorld();renderPhotoList();toast('已切换到'+experience.current.name);}
  if(confirmation.action==='freeze'){const frozen=experience.toggleFreeze();updateFreezeButton(frozen);toast(frozen?'场景已定格，保持竖拇指可继续。':'世界继续流动。');}
}
function updateFreezeButton(frozen){$('#freeze-button').innerHTML=icon(frozen?'play':'pause')+'<span>'+(frozen?'继续':'定格')+'</span>';$('#freeze-button').setAttribute('aria-label',frozen?'继续场景动画':'定格场景');}
const motionNotes={saturn:['一颗星球，等待你的引力','星环，正在缓缓解开','让群星沿轨道漫游'],heart:['所有心动，聚在一起','松开一点，让心动流转','每一颗，都是独立的小心动'],tree:['把回忆，珍藏成一棵树','星光正在离开枝头','让星饰与记忆缓缓环绕'],flower:['花苞，等你轻轻松手','花瓣正在层层舒展','让花瓣随你的手飞舞'],ocean:['静静呼吸的一片微光','水母正在向远处游散','一群微光，自在漂游']};
function renderMotion({fraction,controlFraction=fraction,expanded,world}){
  const value=Math.round(Math.max(0,Math.min(1,fraction))*100),control=Math.round(Math.max(0,Math.min(1,controlFraction))*100),range=$('#morph-range');
  if(Number(range.value)!==control)range.value=control;range.style.setProperty('--fill',control+'%');range.setAttribute('aria-valuetext','展开程度 '+control+'%');
  app.querySelectorAll('[data-stage]').forEach(button=>{const active=Math.abs(Number(button.dataset.stage)*100-control)<7;if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));});
  if(value!==lastMotionValue||world!==lastMotionWorld){lastMotionValue=value;lastMotionWorld=world;$('#morph-percent').textContent=world==='flower'?(value<15?'花苞':value<70?'绽放':'飘散'):(value<5?'已聚合':value>94?'已散开':'展开中');}
  const note=motionNotes[world][fraction<.2?0:fraction<.78?1:2];if(note!==lastMotionNote){lastMotionNote=note;$('#morph-note').textContent=note;}
  const label=expanded?'聚合':'展开';if($('#spread-button span').textContent!==label)$('#spread-button span').textContent=label;
}

function sceneError(error){console.error(error);$('#loading').hidden=false;$('#loading').classList.remove('ready');$('#loading').innerHTML='<span class="loading-orbit">'+icon('orbit')+'</span><p>这个世界暂时未能开启</p><small>请使用支持三维渲染的新版浏览器，或在浏览器设置中开启图形加速。</small><button type="button" class="primary-button" id="reload-button">重新尝试</button>';$('#reload-button').onclick=()=>location.reload();}
async function toggleCamera(){writeStorage('掌间交互已体验','是');experience?.setDemo(false);if(camera.running||camera.starting)camera.stop();else await camera.start();}
const sharing=setupSharing({dialog:shareDialog,toast,getCapture(format){if(experience.theater.active)experience.pauseTheater(true);else experience.setDemo(false);const dataUrl=experience.capture(format),extension=dataUrl.startsWith('data:image/webp')?'webp':'png';return{dataUrl,name:experience.current.name,filename:'掌间交互-'+experience.current.name+'.'+extension,photoCount:experience.theater.active?0:experience.focused?1:experience.photos.length,url:sceneShareUrl(experience.current.id,Math.round((experience.controlFraction||0)*100),experience.look)};}});
function capture(){photoViewer?.stop();experience.pauseTheater(true);sharing.open();}

function toggleAudio(){
  if(!audioContext){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext){toast('当前浏览器暂不支持氛围音。');return;}audioContext=new AudioContext();const gain=audioContext.createGain();gain.gain.value=0;gain.connect(audioContext.destination);[130.81,196,261.63,329.63].forEach((frequency,index)=>{const oscillator=audioContext.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.detune.value=index*2-3;const voice=audioContext.createGain();voice.gain.value=.017/(index+1);oscillator.connect(voice);voice.connect(gain);oscillator.start();audioNodes.push(oscillator);});audioNodes.gain=gain;}
  audioContext.resume();soundOn=!soundOn;audioNodes.gain.gain.setTargetAtTime(soundOn?1:0,audioContext.currentTime,.8);$('#sound-button').innerHTML=icon(soundOn?'sound':'mute');$('#sound-button').setAttribute('aria-label',soundOn?'关闭氛围音':'开启氛围音');
}

try{
  const requestedWorld=sharedScene.world||readStorage('掌间交互造型'),initialWorld=WORLD_INFO.some(world=>world.id===requestedWorld)?requestedWorld:'saturn';
  experience=new Experience($('#scene'),{initialWorld,look:readLook(new URLSearchParams(location.search).get('look')||readStorage('掌间交互光影')),getStageArea:()=>$('#stage-window').getBoundingClientRect(),onReady(){requestAnimationFrame(()=>{$('#loading').classList.add('ready');setTimeout(()=>{$('#loading').hidden=true;},400);});if(sharedScene.spread!==null)experience.setMorph(sharedScene.spread/100,{immediate:true});else if(!readStorage('掌间交互已体验')&&!experience.reducedMotion&&!navigator.connection?.saveData)experience.setDemo(true,{once:true});},onWorld:world=>renderWorld(world),onPhotoFocus:renderPhotoFocus,onPhotoDetail:state=>photoViewer?.detail(state),getPhotoArea:()=>({top:$('#photo-focus').getBoundingClientRect().bottom+18,bottom:$('#photo-strip').hidden?innerHeight-72:$('#photo-strip').getBoundingClientRect().top-16}),onQuality:mode=>{if(mode==='adaptive')toast('已为当前设备自动优化画面，让互动更流畅。');},onMotion:renderMotion,motionMode:readStorage('掌间交互动态偏好')||'auto',onInteraction:()=>setManualMode(),onContext:updateContext,onReducedMotion(reduce){app.dataset.reduced=reduce?'yes':'no';$('#motion-button').setAttribute('aria-pressed',String(reduce));$('#motion-button').textContent=reduce?'动态已减少':'减少动态';},onDemo:renderDemo,onTheater:renderTheater});
  experience.ready.catch(sceneError);
  experience.onResponse=world=>{$('#stage-live').textContent=world.name+'已回应';};
  camera=new GestureCamera({video:$('#camera-video'),overlay:$('#camera-overlay'),onStatus:updateCameraStatus,onHands:handleHands,onError:showCameraError,onProgress:updateModelProgress});
  photoViewer=setupPhotoViewer({root:app,getPhotos:()=>experience.photos,getFocused:()=>experience.focused,select:photo=>{if(camera.running||camera.starting)setManualMode();else experience.setDemo(false);experience.focusPhoto(photo);},close:()=>experience.clearFocus(),reduced:()=>experience.reducedMotion,canvas:experience.renderer.domElement,icon,onPlay:()=>setManualMode()});
  theaterUI=setupTheaterUI({root:app,experience,icon,capture});
  renderWorld(experience.current);renderLook(experience.look);
  const quality=readStorage('掌间交互画质');if(['auto','high','low'].includes(quality)){$('#quality-select').value=quality;experience.setQuality(quality);}
}catch(error){sceneError(error);}

app.querySelectorAll('[data-world]').forEach(button=>button.addEventListener('click',()=>{experience?.setDemo(false);experience?.setWorld(button.dataset.world);catalogDialog.close();renderPhotoList();}));
$('#camera-button').addEventListener('click',()=>toggleCamera());
$('#catalog-open').addEventListener('click',()=>{experience.setDemo(false);app.querySelectorAll('[data-artwork]').forEach(image=>{if(!image.hasAttribute('src'))image.src='/artworks/'+image.dataset.artwork+'-v4.webp';});catalogDialog.showModal();});
['#settings-open','#settings-mobile'].forEach(selector=>$(selector).addEventListener('click',()=>{experience.setDemo(false);settingsDialog.showModal();}));
app.querySelectorAll('[data-look]').forEach(button=>button.addEventListener('click',()=>{experience.setLook(button.dataset.look);renderLook(experience.look);writeStorage('掌间交互光影',experience.look);}));
$('#tour-button').addEventListener('click',()=>{catalogDialog.close();experience.startTheater();updateFreezeButton(false);});
$('#photos-button').addEventListener('click',()=>{experience.setDemo(false);photosDialog.showModal();});
app.querySelectorAll('.guide-open').forEach(button=>button.addEventListener('click',()=>{experience.setDemo(false);guide.showModal();}));
app.querySelectorAll('.dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>{if(dialog===guide)closeGuide();else dialog.close();});dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});});
$('#guide-camera').addEventListener('click',()=>{closeGuide();if(!camera.running&&!camera.starting)toggleCamera();});$('#guide-explore').addEventListener('click',closeGuide);
$('#photo-input').addEventListener('change',event=>importPhotos(event.target.files));$('#photos-done').addEventListener('click',()=>{photosDialog.close();experience.clearFocus();});
$('#sample-album').addEventListener('click',loadSamples);
app.querySelectorAll('[data-arrangement]').forEach(button=>button.addEventListener('click',()=>{experience.setPhotoArrangement(button.dataset.arrangement);app.querySelectorAll('[data-arrangement]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));$('#arrangement-note').textContent=experience.photoArrangement==='wall'?'展墙模式会收起主体造型，让照片成为主角；聚散控制仍可使用。':'照片将以「'+PHOTO_ARRANGEMENTS[experience.photoArrangement]+'」排布，聚合时更容易看清。';}));
photosDialog.addEventListener('close',()=>sampleController?.abort());
$('#photos-view').addEventListener('click',()=>{photosDialog.close();setManualMode();if(experience.photos.length)experience.focusPhoto(experience.photos[0]);});
$('#about-open').addEventListener('click',()=>{experience?.setDemo(false);aboutDialog.showModal();});
$('#about-guide').addEventListener('click',()=>{aboutDialog.close();guide.showModal();});
$('#copy-feedback').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(FEEDBACK_TEMPLATE);$('#feedback-status').textContent='已复制反馈模板，可填写后自行发送。';}catch{const field=$('#feedback-template');field.value=FEEDBACK_TEMPLATE;field.hidden=false;field.focus();field.select();$('#feedback-status').textContent='请复制已选中的模板，填写后自行发送。';}});
$('#clear-photos').addEventListener('click',()=>{importSequence++;sampleController?.abort();[...experience.photos].forEach(photo=>experience.removePhoto(photo.id));renderPhotoList();$('#photo-upload-status').textContent='照片已清空。';});
const drop=$('#upload-zone');['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragging');}));['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('dragging');if(name==='drop')importPhotos(event.dataTransfer.files);}));
$('#hide-camera').addEventListener('click',()=>{cameraPreviewHidden=true;$('#camera-panel').hidden=true;$('#show-camera').hidden=false;});$('#show-camera').addEventListener('click',()=>{cameraPreviewHidden=false;$('#camera-panel').hidden=false;$('#show-camera').hidden=true;});
$('#spread-button').addEventListener('click',()=>{experience.setDemo(false);$('#spread-button span').textContent=experience.toggleSpread()?'聚合':'展开';});
$('#morph-range').addEventListener('input',event=>{setManualMode();experience.setMorph(Number(event.target.value)/100);event.target.style.setProperty('--fill',event.target.value+'%');});
$('.stage-presets').addEventListener('click',event=>{const button=event.target.closest('[data-stage]');if(!button)return;setManualMode();experience.setMorph(Number(button.dataset.stage),{respond:true});});
$('#focus-button').addEventListener('click',()=>{const immersive=app.dataset.immersive!=='yes';app.dataset.immersive=immersive?'yes':'no';experience.immersive=immersive;experience.resize();const label=immersive?'返回操作':'沉浸观看';$('#focus-button').setAttribute('aria-pressed',String(immersive));$('#focus-button').setAttribute('aria-label',label);$('#focus-button').title=label;$('#focus-button span').textContent=label;});
$('#freeze-button').addEventListener('click',()=>{experience.setDemo(false);updateFreezeButton(experience.toggleFreeze());});$('#reset-button').addEventListener('click',()=>{experience.resetView();updateFreezeButton(false);$('#spread-button span').textContent='展开';});$('#save-button').addEventListener('click',capture);
$('#sound-button').addEventListener('click',toggleAudio);$('#quality-select').addEventListener('change',event=>{experience.setQuality(event.target.value);writeStorage('掌间交互画质',event.target.value);});
$('#fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else $('#display-status').textContent='当前浏览器可通过“添加到主屏幕”获得更沉浸的体验。';}catch{$('#display-status').textContent='当前浏览器暂时无法进入全屏，可以使用沉浸观看。';}});
$('.brand').addEventListener('click',event=>{event.preventDefault();experience?.resetView();updateFreezeButton(false);$('#spread-button span').textContent='展开';});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!experience?.theater.active&&!experience?.focused&&!app.querySelector('dialog[open]')&&$('#recovery-panel').hidden&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#spread-button').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)experience?.pauseTheater(true);if(document.hidden&&soundOn){audioNodes.gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);}else if(soundOn)audioNodes.gain.gain.setTargetAtTime(1,audioContext.currentTime,.8);});
window.addEventListener('pagehide',()=>{camera?.stop();});
window.addEventListener('resize',()=>requestAnimationFrame(revealSelectedWorld));

$('#demo-button').addEventListener('click',()=>{if(camera.running||camera.starting)camera.stop();experience.setDemo(!experience.demo);updateFreezeButton(false);});
$('#next-world').addEventListener('click',()=>{experience.setDemo(false);experience.nextWorld();renderPhotoList();});
$('#prev-world').addEventListener('click',()=>{experience.setDemo(false);const index=WORLD_INFO.findIndex(w=>w.id===experience.current.id);experience.setWorld(WORLD_INFO[(index+WORLD_INFO.length-1)%WORLD_INFO.length].id);renderPhotoList();});

$('#tools-toggle').addEventListener('click',()=>{const open=app.dataset.tools!=='yes';app.dataset.tools=open?'yes':'no';$('#tools-toggle').setAttribute('aria-expanded',String(open));$('#tools-toggle').setAttribute('aria-label',open?'收起场景操作':'展开场景操作');});

$('#explore-button').addEventListener('click',()=>setManualMode({announce:true}));
$('#share-open').addEventListener('click',capture);
$('#immersive-save').addEventListener('click',capture);
$('#motion-button').addEventListener('click',()=>{experience.motionOverridden=true;const reduce=!experience.reducedMotion;experience.setReducedMotion(reduce);writeStorage('掌间交互动态偏好',reduce?'reduce':'full');toast(reduce?'已停止背景自主动画，仍可以手动聚散和旋转。':'已恢复完整动态效果。');});
$('#reload-scene').addEventListener('click',()=>location.reload());

app.querySelectorAll('[data-preview]').forEach(image=>{const ready=()=>image.parentElement.classList.add('ready');if(image.complete&&image.naturalWidth)ready();else image.addEventListener('load',ready,{once:true});});
