import * as THREE from 'three';
import {photoLayout} from './photo-layout.js';

export async function preparePhoto(file) {
  if(file.size>25*1024*1024)throw new Error('单张照片请小于 25 兆。');
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('这张照片无法读取，请使用常见的图片格式。'));image.src=url;});
    const layout=photoLayout(image.naturalWidth,image.naturalHeight);
    const canvas=document.createElement('canvas');canvas.width=layout.canvasWidth;canvas.height=layout.canvasHeight;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f3eee6';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,layout.drawX,layout.drawY,layout.drawWidth,layout.drawHeight);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    return {id:crypto.randomUUID(),name:file.name,sampleId:file.sampleId||null,texture,thumbnail:canvas.toDataURL('image/jpeg',.65),...layout};
  } finally {URL.revokeObjectURL(url);}
}
