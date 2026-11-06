export const LOOKS={
  soft:{name:'柔光',description:'柔和的材质与自然光晕',exposure:1.04,bloom:.82,atmosphere:.82},
  clear:{name:'通透',description:'清晰的轮廓与克制的辉光',exposure:1.16,bloom:.4,atmosphere:.52},
  glow:{name:'辉光',description:'更浓郁的色彩与流动光场',exposure:1.02,bloom:1.4,atmosphere:1.2},
};
export const readLook=value=>Object.prototype.hasOwnProperty.call(LOOKS,value)?value:'soft';

const BOUNDS={saturn:[12,9],heart:[9.6,9],tree:[9,10],flower:[12,9.5],ocean:[8.8,8.5]};
export function stageFrame({width,height,area,world='saturn',fov=42,immersive=false}){
  const safe=area&&area.width>0&&area.height>0?area:{left:width*.1,top:height*.12,width:width*.8,height:height*.7};
  const [bw,bh]=BOUNDS[world]||BOUNDS.saturn,tan=Math.tan(fov*Math.PI/360),padding=immersive?.9:1;
  const distance=Math.max(bh*height/(2*tan*safe.height),bw*height/(2*tan*safe.width))*padding;
  return{distance:Math.min(52,Math.max(14,distance)),offsetX:width/2-(safe.left+safe.width/2),offsetY:height/2-(safe.top+safe.height/2)};
}
