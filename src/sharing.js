import {pngFile} from './share-state.js';

export function setupSharing({dialog,getCapture,toast}){
  let capture=null,file=null,downloadUrl=null;
  const preview=dialog.querySelector('#share-preview'),linkField=dialog.querySelector('#share-link');
  const feedback=document.createElement('p');feedback.className='share-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');dialog.querySelector('.share-actions').after(feedback);
  const report=message=>{feedback.textContent=message;};
  const canShareImage=()=>{try{return Boolean(file&&navigator.canShare?.({files:[file]}));}catch{return false;}};
  const copyLink=async()=>{
    if(!capture)return;
    try{await navigator.clipboard.writeText(capture.url);report('已复制体验链接，不包含你的照片。');}
    catch{linkField.focus();linkField.select();report('请长按或按复制键，复制已选中的链接。');}
  };
  const open=()=>{
    try{
      capture=getCapture();report('');file=pngFile(capture.dataUrl,capture.filename);if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(file);const download=dialog.querySelector('#download-image');download.href=downloadUrl;download.download=capture.filename;preview.src=capture.dataUrl;preview.alt=capture.name+'的当前三维画面';linkField.value=capture.url;
      dialog.querySelector('#share-image').hidden=!canShareImage();dialog.querySelector('#share-website').hidden=!navigator.share;
      dialog.querySelector('#share-photo-note').textContent=capture.photoCount?'图片会包含你加入的 '+capture.photoCount+' 张照片；链接仅包含系统作品和聚散状态。':'保存或分享当前三维画面，摄像头预览不会入图。';
      dialog.showModal();
    }catch{toast('画面还在准备或恢复中，稍后再保存这一刻。');}
  };
  dialog.querySelector('#download-image').addEventListener('click',()=>report('已开始保存图片；手机也可以长按预览图保存。'));
  dialog.querySelector('#copy-link').addEventListener('click',copyLink);
  dialog.querySelector('#share-image').addEventListener('click',async()=>{
    if(!canShareImage())return;
    try{await navigator.share({title:'掌间交互 · '+capture.name,files:[file]});}
    catch(error){if(error.name!=='AbortError')report('暂时无法直接分享图片，可以先保存图片。');}
  });
  dialog.querySelector('#share-website').addEventListener('click',async()=>{
    if(!capture)return;
    try{await navigator.share({title:'掌间交互 · '+capture.name,text:'用手势或触屏探索三维光影作品。',url:capture.url});}
    catch(error){if(error.name!=='AbortError')await copyLink();}
  });
  dialog.addEventListener('close',()=>{preview.removeAttribute('src');if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;dialog.querySelector('#download-image').removeAttribute('href');capture=null;file=null;});
  return{open};
}
