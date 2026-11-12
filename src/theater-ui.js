import {THEATER_CHAPTERS,THEATER_LENGTH} from './theater.js';
import {shouldHandleSceneSpace} from './keyboard.js';
const timeLabel=value=>Math.floor(value/60).toString().padStart(2,'0')+':'+Math.floor(value%60).toString().padStart(2,'0');

export function theaterMarkup(icon){
  return `<section id="theater-panel" class="theater-panel" aria-label="光影剧场" hidden>
    <div class="theater-heading"><p><span id="theater-act">第一幕</span><i></i><span id="theater-stage">凝望</span></p><h2 id="theater-title">引力之外</h2><span id="theater-line">星环松开，宇宙开始流动。</span></div>
    <div class="theater-console"><div class="theater-time"><span>光影剧场 <i>五幕 · 一场掌间漫游</i></span><span><b id="theater-time">00:00</b> / ${timeLabel(THEATER_LENGTH)}</span></div>
    <div class="theater-chapters" role="group" aria-label="选择演出章节">${THEATER_CHAPTERS.map((chapter,i)=>`<button type="button" data-chapter="${i}" aria-label="跳到${chapter.act}：${chapter.name}"><span class="chapter-track"><i></i></span><span class="chapter-name"><small>0${i+1}</small>${chapter.name}</span></button>`).join('')}</div>
    <div class="theater-actions"><button id="theater-restart" type="button" aria-label="重新播放光影剧场">${icon('refresh')}<span>从头观看</span></button><button id="theater-pause" class="theater-pause" type="button" aria-label="暂停光影剧场">${icon('pause')}<span>暂停演出</span></button><button id="theater-save" type="button">${icon('download')}<span>留住这一幕</span></button><button id="theater-exit" type="button" aria-label="退出光影剧场">${icon('close')}<span>返回探索</span></button></div>
    <p class="theater-footnote">可点选章节 · 随时暂停或返回亲手探索</p></div>
    <span id="theater-status" class="sr-only" role="status" aria-live="polite"></span>
  </section>`;
}

export function setupTheaterUI({root,experience,icon,capture}){
  const $=selector=>root.querySelector(selector),panel=$('#theater-panel'),chapters=[...root.querySelectorAll('[data-chapter]')];let active=false,index=-1,paused=null,tick=-1,stage='';
  $('#theater-start').addEventListener('click',()=>experience.startTheater());
  $('#theater-pause').addEventListener('click',()=>experience.pauseTheater());
  $('#theater-restart').addEventListener('click',()=>experience.startTheater());
  $('#theater-exit').addEventListener('click',()=>experience.stopTheater());
  $('#theater-save').addEventListener('click',capture);
  chapters.forEach(button=>button.addEventListener('click',()=>experience.seekTheater(Number(button.dataset.chapter))));
  document.addEventListener('keydown',event=>{
    if(!active||root.querySelector('dialog[open]'))return;
    if(event.key==='Escape'){experience.stopTheater();event.preventDefault();}
    if(shouldHandleSceneSpace(event,{activeElement:document.activeElement,canvas:experience.renderer.domElement})){
      event.preventDefault();experience.pauseTheater();
    }
  });
  return{render(frame){
    const wasActive=active;active=frame.active;panel.hidden=!active;root.dataset.theater=active?'yes':'no';
    if(!active){index=-1;tick=-1;paused=null;if(wasActive){$('#theater-status').textContent='已返回自由探索';requestAnimationFrame(()=>$('#theater-start').focus({preventScroll:true}));}return;}
    if(!wasActive)requestAnimationFrame(()=>$('#theater-pause').focus({preventScroll:true}));
    if(frame.index!==index){index=frame.index;$('#theater-act').textContent=frame.act;$('#theater-title').textContent=frame.name;$('#theater-line').textContent=frame.line;$('#theater-status').textContent=frame.act+'，'+frame.name;chapters.forEach((button,i)=>button.setAttribute('aria-current',i===index?'step':'false'));}
    if(stage!==frame.stage){stage=frame.stage;$('#theater-stage').textContent=frame.stage;}
    if(paused!==frame.paused){paused=frame.paused;$('#theater-pause').setAttribute('aria-label',paused?'继续光影剧场':'暂停光影剧场');$('#theater-pause').innerHTML=icon(paused?'play':'pause')+'<span>'+(paused?'继续演出':'暂停演出')+'</span>';if(wasActive)$('#theater-status').textContent=paused?'演出已暂停，可继续观看':'演出继续';}
    const nextTick=Math.floor(frame.seconds*8);if(tick!==nextTick){tick=nextTick;$('#theater-time').textContent=timeLabel(frame.seconds);chapters.forEach((button,i)=>button.style.setProperty('--chapter-progress',(i<index?100:i===index?frame.chapterProgress*100:0)+'%'));}
  }};
}
