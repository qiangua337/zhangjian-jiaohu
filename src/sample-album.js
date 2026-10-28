export const SAMPLE_ALBUM=[
  {id:'heart',name:'心动星团 · 示例.png',url:'/samples/heart-portrait-v1.png'},
  {id:'flower',name:'光之花园 · 示例.png',url:'/samples/flower-v1.png'},
  {id:'ocean',name:'微光深海 · 示例.png',url:'/samples/ocean-v1.png'},
];

export async function sampleFiles({signal,fetcher=fetch}={}){
  return Promise.all(SAMPLE_ALBUM.map(async sample=>{
    const response=await fetcher(sample.url,{signal,cache:'force-cache'});
    if(!response.ok)throw new Error('示例作品暂时未能加载');
    const file=new File([await response.blob()],sample.name,{type:'image/png'});
    Object.defineProperty(file,'sampleId',{value:sample.id});return file;
  }));
}
