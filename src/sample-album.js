export const SAMPLE_ALBUM=[
  {id:'heart',name:'心动星团 · 示例.webp',url:'/samples/heart-portrait-v3.webp'},
  {id:'flower',name:'光之花园 · 示例.webp',url:'/artworks/flower-v3.webp'},
  {id:'ocean',name:'微光深海 · 示例.webp',url:'/artworks/ocean-v3.webp'},
];

export async function sampleFiles({signal,fetcher=fetch}={}){
  return Promise.all(SAMPLE_ALBUM.map(async sample=>{
    const response=await fetcher(sample.url,{signal,cache:'default'});
    if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw new Error('示例作品暂时未能加载');
    const file=new File([await response.blob()],sample.name,{type:'image/webp'});
    Object.defineProperty(file,'sampleId',{value:sample.id});return file;
  }));
}
