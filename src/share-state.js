const worldIds=['saturn','heart','tree','flower','ocean'];
export function readSharedScene(search){
  const params=new URLSearchParams(search),world=params.get('world');
  const raw=params.get('spread'),value=raw===null||raw.trim()===''?null:Number(raw);
  return{world:worldIds.includes(world)?world:null,spread:Number.isFinite(value)?Math.max(0,Math.min(100,value)):null};
}
export function sceneShareUrl(world,spread,look='soft'){
  const url=new URL('https://zhangjian-jiaohu.pages.dev/');
  if(worldIds.includes(world))url.searchParams.set('world',world);
  if(Number.isFinite(spread))url.searchParams.set('spread',Math.round(Math.max(0,Math.min(100,spread))));
  if(['clear','glow'].includes(look))url.searchParams.set('look',look);
  return url.href;
}
export function imageFile(dataUrl,name){
  const mime=/^data:(image\/(?:png|webp));base64,/.exec(dataUrl)?.[1];
  if(!mime)throw new Error('不支持的画面格式');
  const raw=atob(dataUrl.split(',')[1]),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return new File([bytes],name,{type:mime});
}
export const pngFile=imageFile;
