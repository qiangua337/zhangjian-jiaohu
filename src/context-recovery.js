export function bindContextRecovery(canvas,{pause,rebuild,resume,onState=()=>{},timeout=12000}){
  let generation=0,disposed=false,restoring=false,timer;
  const lost=event=>{
    event.preventDefault();generation++;restoring=false;clearTimeout(timer);pause();onState('lost');
  };
  const restored=async()=>{
    if(disposed||restoring)return;
    restoring=true;const current=generation;onState('restoring');
    timer=setTimeout(()=>{if(!disposed&&current===generation)onState('error');},timeout);
    try{await rebuild();if(disposed||current!==generation)return;clearTimeout(timer);restoring=false;resume();onState('ready');}
    catch(error){if(disposed||current!==generation)return;clearTimeout(timer);restoring=false;onState('error',error);}
  };
  canvas.addEventListener('webglcontextlost',lost);
  canvas.addEventListener('webglcontextrestored',restored);
  return()=>{disposed=true;generation++;clearTimeout(timer);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);};
}
