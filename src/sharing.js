import './sharing.css';
import { artworkPoster } from './art-poster.js';
import { imageFile } from './share-state.js';

function canvasBlob(canvas, format) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('图片编码失败'));
    }, format === 'webp' ? 'image/webp' : 'image/png', .9);
  });
}

export function setupSharing({ dialog, getCapture, toast }) {
  const $ = selector => dialog.querySelector(selector);
  const preview = $('#share-preview');
  const waiting = $('#share-waiting');
  const linkField = $('#share-link');
  const feedback = $('#share-feedback');
  const formatField = $('#export-format');
  const download = $('#download-image');
  const shareImage = $('#share-image');
  const shareWebsite = $('#share-website');
  const layouts = [...dialog.querySelectorAll('[data-export-layout]')];
  let shot, file, sourceUrl, outputUrl, decoded, poster;
  let layout = 'original';
  let sequence = 0;

  function releaseOutput() {
    preview.removeAttribute('src');
    preview.hidden = true;
    download.removeAttribute('href');
    download.setAttribute('aria-disabled', 'true');
    download.tabIndex = -1;
    shareImage.hidden = true;
    if (outputUrl && outputUrl !== sourceUrl) URL.revokeObjectURL(outputUrl);
    outputUrl = null;
    file = null;
  }

  function releaseShot() {
    sequence++;
    releaseOutput();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    shot = sourceUrl = decoded = poster = null;
  }

  function loadSource() {
    if (!decoded) {
      const image = new Image();
      image.src = sourceUrl;
      decoded = image.decode().then(() => image);
    }
    return decoded;
  }

  async function render() {
    if (!shot || !dialog.open) return;
    const current = ++sequence;
    const snapshot = shot;
    const format = formatField.value;
    const isPoster = layout === 'poster';
    dialog.dataset.exportLayout = layout;
    layouts.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.exportLayout === layout)));
    feedback.textContent = '';
    waiting.textContent = isPoster ? '正在排版海报…' : '正在准备画面…';
    waiting.hidden = false;
    $('#export-meta').textContent = '';
    $('#share-photo-note').textContent = snapshot.photoCount
      ? '图片会包含当前场景中的照片。'
      : isPoster ? '海报从当前舞台取景。' : '摄像头预览不会出现在图片中。';
    releaseOutput();
    try {
      let blob = snapshot.original;
      let width = snapshot.width;
      let height = snapshot.height;
      if (isPoster || format === 'webp') {
        let canvas;
        if (isPoster) {
          poster ||= loadSource().then(image => artworkPoster(image, snapshot));
          canvas = await poster;
        } else {
          const image = await loadSource();
          canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext('2d').drawImage(image, 0, 0);
        }
        if (current !== sequence || !dialog.open) return;
        width = canvas.width;
        height = canvas.height;
        blob = await canvasBlob(canvas, format);
      }
      if (current !== sequence || !dialog.open) return;
      const extension = blob.type === 'image/webp' ? 'webp' : 'png';
      const suffix = isPoster ? '·展签海报' : '';
      file = new File([blob], '掌间交互·' + snapshot.name + suffix + '.' + extension, { type: blob.type });
      outputUrl = blob === snapshot.original ? sourceUrl : URL.createObjectURL(file);
      preview.src = outputUrl;
      preview.alt = snapshot.name + (isPoster ? '的展签海报' : '的三维画面');
      preview.hidden = false;
      waiting.hidden = true;
      download.href = outputUrl;
      download.download = file.name;
      download.removeAttribute('aria-disabled');
      download.removeAttribute('tabindex');
      const size = file.size < 1024 * 1024 ? Math.ceil(file.size / 1024) + ' KB' : (file.size / 1024 / 1024).toFixed(1) + ' MB';
      $('#export-meta').textContent = width + ' × ' + height + ' · ' + size;
      shareImage.hidden = !canShareImage();
      if (extension !== format) feedback.textContent = '此浏览器已用 PNG 生成图片。';
    } catch {
      if (current !== sequence || !dialog.open) return;
      waiting.textContent = '图片生成失败，请重试或切换版式。';
      if (isPoster) poster = null;
      decoded = null;
    }
  }

  function canShareImage() {
    try { return Boolean(file && navigator.canShare?.({ files: [file] })); }
    catch { return false; }
  }

  function open() {
    if (dialog.open) return;
    releaseShot();
    try {
      const snapshot = getCapture();
      shot = { ...snapshot, original: imageFile(snapshot.dataUrl, snapshot.name + '.png') };
      delete shot.dataUrl;
      sourceUrl = URL.createObjectURL(shot.original);
      linkField.value = shot.url;
      shareWebsite.hidden = !navigator.share;
      dialog.showModal();
      void render();
    } catch {
      releaseShot();
      toast('画面还在准备或恢复中，稍后再保存这一刻。');
    }
  }

  async function copyLink() {
    if (!shot) return;
    try {
      await navigator.clipboard.writeText(shot.url);
      feedback.textContent = '已复制体验链接。';
    } catch {
      linkField.focus();
      linkField.select();
      feedback.textContent = '请长按或按复制键，复制已选中的链接。';
    }
  }

  layouts.forEach(button => button.addEventListener('click', () => {
    layout = button.dataset.exportLayout;
    void render();
  }));
  formatField.addEventListener('change', render);
  download.addEventListener('click', event => {
    if (!file) event.preventDefault();
    else feedback.textContent = '已开始保存。手机也可以长按预览图保存。';
  });
  $('#copy-link').addEventListener('click', copyLink);
  shareImage.addEventListener('click', async () => {
    if (!canShareImage()) return;
    try { await navigator.share({ title: '掌间交互 · ' + shot.name, files: [file] }); }
    catch (error) { if (error.name !== 'AbortError') feedback.textContent = '暂时无法直接分享，可以先保存图片。'; }
  });
  shareWebsite.addEventListener('click', async () => {
    if (!shot) return;
    try { await navigator.share({ title: '掌间交互 · ' + shot.name, text: '用手势或触屏探索三维光影作品。', url: shot.url }); }
    catch (error) { if (error.name !== 'AbortError') await copyLink(); }
  });
  dialog.addEventListener('close', () => { if (!dialog.open) releaseShot(); });
  return { open };
}
