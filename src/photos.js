import * as THREE from 'three';
import {photoLayout} from './photo-layout.js';

async function photoCanvas(file,maxEdge,signal) {
  if(file.size>25*1024*1024)throw new Error('单张照片请小于 25 兆。');
  if(signal?.aborted)throw new DOMException('已取消','AbortError');
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise((resolve,reject)=>{
      const image=new Image();
      const clean=()=>{signal?.removeEventListener('abort',abort);image.onload=image.onerror=null;};
      const abort=()=>{clean();image.src='';reject(new DOMException('已取消','AbortError'));};
      image.onload=()=>{clean();resolve(image);};image.onerror=()=>{clean();reject(new Error('这张照片无法读取，请使用常见的图片格式。'));};
      signal?.addEventListener('abort',abort,{once:true});image.src=url;
    });
    if(signal?.aborted)throw new DOMException('已取消','AbortError');
    const layout=photoLayout(image.naturalWidth,image.naturalHeight,Math.min(maxEdge,Math.max(image.naturalWidth,image.naturalHeight)));
    const canvas=document.createElement('canvas');canvas.width=layout.canvasWidth;canvas.height=layout.canvasHeight;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f3eee6';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,layout.drawX,layout.drawY,layout.drawWidth,layout.drawHeight);
    return{canvas,layout};
  } finally {URL.revokeObjectURL(url);}
}
const textureFrom=canvas=>{const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;};
export async function preparePhoto(file){const {canvas,layout}=await photoCanvas(file,768);return{id:crypto.randomUUID(),name:file.name,source:file,sampleId:file.sampleId||null,texture:textureFrom(canvas),thumbnail:canvas.toDataURL('image/jpeg',.65),...layout};}
export async function prepareFocusedTexture(file,signal){return textureFrom((await photoCanvas(file,1536,signal)).canvas);}
