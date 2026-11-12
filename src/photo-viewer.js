import {PhotoClock,swipeDirection} from './focus-resource.js';

export function setupPhotoViewer({root,getPhotos,getFocused,select,close,reduced,canvas,icon,onPlay}){
  const $=selector=>root.querySelector(selector),clock=new PhotoClock(),strip=$('#photo-strip'),list=$('#photo-strip-list');
  let signature='',pointer=null,playingState=null;
  function renderPlayback(){if(playingState===clock.playing)return;playingState=clock.playing;const button=$('#photo-play');button.setAttribute('aria-pressed',String(clock.playing));button.setAttribute('aria-label',clock.playing?'暂停照片播放':'自动播放照片');button.title=clock.playing?'暂停照片播放':'每五秒切换一张';button.innerHTML=icon(clock.playing?'pause':'play');$('#photo-play-state').textContent=clock.playing?'每五秒切换 · 手动操作可暂停':'左右滑动或点选缩略图';}
  function stop(){clock.stop();renderPlayback();}
  function step(direction,manual=true){if(manual)stop();const photos=getPhotos(),index=photos.indexOf(getFocused());if(photos.length)select(photos[(index+direction+photos.length)%photos.length]);}
  function render(photo){
    const photos=getPhotos(),wasFocused=root.dataset.photoFocus==='yes';$('#photo-focus').hidden=!photo;root.dataset.photoFocus=photo?'yes':'no';strip.hidden=!photo||photos.length<2;
    $('#photo-play').hidden=photos.length<2;
    if(!photo){stop();pointer=null;signature='';list.replaceChildren();if(wasFocused)requestAnimationFrame(()=>$('#photos-button').focus({preventScroll:true}));return;}
    $('#photo-focus-count').textContent='照片 '+(photos.indexOf(photo)+1)+' / '+photos.length;$('#photo-focus-name').textContent=photo.name;$('#prev-photo').disabled=$('#next-photo').disabled=photos.length<2;
    const nextSignature=photos.map(item=>item.id).join('|');
    if(signature!==nextSignature){signature=nextSignature;list.replaceChildren();photos.forEach((item,index)=>{const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.dataset.photoId=item.id;button.setAttribute('aria-label','查看第 '+(index+1)+' 张照片：'+item.name);image.src=item.thumbnail;image.alt='';button.append(image);button.addEventListener('click',()=>{stop();select(item);});list.append(button);});}
    for(const button of list.children)button.setAttribute('aria-current',String(button.dataset.photoId===photo.id));
    const active=[...list.children].find(button=>button.dataset.photoId===photo.id);if(active&&!strip.hidden)list.scrollTo({left:active.offsetLeft-(list.clientWidth-active.clientWidth)/2,behavior:reduced()?'instant':'smooth'});
    if(!wasFocused)requestAnimationFrame(()=>$('#close-photo').focus({preventScroll:true}));renderPlayback();
  }
  $('#prev-photo').addEventListener('click',()=>step(-1));$('#next-photo').addEventListener('click',()=>step(1));$('#close-photo').addEventListener('click',()=>{stop();close();});
  $('#photo-play').addEventListener('click',()=>{if(clock.playing)stop();else if(getPhotos().length>1){onPlay();clock.start(performance.now());renderPlayback();}});
  document.addEventListener('keydown',event=>{if(!getFocused()||root.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}if(event.key==='Escape'){event.preventDefault();stop();close();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  canvas.addEventListener('pointerdown',event=>{if(!getFocused())return;stop();if(event.pointerType!=='touch')return;if(pointer){pointer.pointers++;return;}pointer={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),pointers:1};});
  canvas.addEventListener('pointerup',event=>{if(!pointer||event.pointerId!==pointer.id)return;const direction=swipeDirection({dx:event.clientX-pointer.x,dy:event.clientY-pointer.y,duration:performance.now()-pointer.time,pointers:pointer.pointers});pointer=null;if(direction&&getFocused())step(direction);});
  canvas.addEventListener('pointercancel',()=>{pointer=null;});
  setInterval(()=>{if(!clock.playing)return;if(clock.tick(performance.now(),{focused:Boolean(getFocused()),count:getPhotos().length,visible:!document.hidden,blocked:Boolean(root.querySelector('dialog[open]'))}))step(1,false);renderPlayback();},250);
  window.addEventListener('pagehide',stop);
  return{render,stop,detail(state){$('#photo-detail-status').textContent={idle:'',loading:'正在准备照片细节',ready:'照片已就绪',fallback:'已显示标准画面'}[state]||'';}};
}
