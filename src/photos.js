import * as THREE from 'three';

export async function preparePhoto(file) {
  if(file.size>25*1024*1024)throw new Error('单张照片请小于 25 兆。');
  const url=URL.createObjectURL(file);
  try {
    const image=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('这张照片无法读取，请使用常见的图片格式。'));image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f3eee6';ctx.fillRect(0,0,640,640);
    const scale=640/Math.min(image.naturalWidth,image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    ctx.drawImage(image,(640-width)/2,(640-height)/2,width,height);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    return {id:crypto.randomUUID(),name:file.name,texture,thumbnail:canvas.toDataURL('image/jpeg',.65)};
  } finally {URL.revokeObjectURL(url);}
}
