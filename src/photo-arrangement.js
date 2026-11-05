export const PHOTO_ARRANGEMENTS={world:'随作品',orbit:'环绕画廊',wall:'星光展墙'};
const wallGrid=count=>{const columns=Math.min(count,6,Math.ceil(Math.sqrt(count*1.5))),rows=Math.ceil(count/columns);return{columns,rows,scale:Math.min(2.2,9.4/(columns*1.4),8/(rows*2.2))};};
export function photoArrangementScale(mode,count){return mode==='wall'?wallGrid(Math.max(1,count)).scale:count>12?.8:1.05;}

export function photoPosition(mode,index,count){
  if(mode==='world'||!Object.prototype.hasOwnProperty.call(PHOTO_ARRANGEMENTS,mode))return null;
  if(mode==='orbit'){const a=index/Math.max(1,count)*Math.PI*2-.4;return[Math.cos(a)*6.2,Math.sin(a)*2.7,Math.sin(a)*2.8+1];}
  const {columns,rows,scale}=wallGrid(Math.max(1,count)),row=Math.floor(index/columns),inRow=Math.min(columns,count-row*columns);
  return[(index%columns-(inRow-1)/2)*1.4*scale,((rows-1)/2-row)*2.2*scale,3.8];
}
