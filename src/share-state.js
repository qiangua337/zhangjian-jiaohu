const worldIds=['saturn','heart','tree','flower','ocean'];
export function readSharedScene(search){
  const params=new URLSearchParams(search),world=params.get('world');
  const raw=params.get('spread'),value=raw===null||raw.trim()===''?null:Number(raw);
  return{world:worldIds.includes(world)?world:null,spread:Number.isFinite(value)?Math.max(0,Math.min(100,value)):null};
}
export function sceneShareUrl(world,spread){
  const url=new URL('https://zhangjian-jiaohu.pages.dev/');
  if(worldIds.includes(world))url.searchParams.set('world',world);
  if(Number.isFinite(spread))url.searchParams.set('spread',Math.round(Math.max(0,Math.min(100,spread))));
  return url.href;
}
export function pngFile(dataUrl,name){
  const raw=atob(dataUrl.split(',')[1]),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return new File([bytes],name,{type:'image/png'});
}
