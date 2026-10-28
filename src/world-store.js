export class LazyWorldStore {
  constructor(factories){this.factories=new Map(Object.entries(factories));this.cache=new Map();}
  get(id){
    if(!this.factories.has(id))throw new Error('未知作品：'+id);
    if(!this.cache.has(id))this.cache.set(id,this.factories.get(id)());
    return this.cache.get(id);
  }
}

export function cappedPixelRatio(width,height,requested,maxPixels){
  if(!(width>0&&height>0&&requested>0&&maxPixels>0))return 1;
  return Math.min(requested,Math.sqrt(maxPixels/(width*height)));
}
