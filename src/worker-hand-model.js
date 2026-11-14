import { checkAbort } from './asset-loader.js';

export function supportsHandWorker() {
  return typeof Worker === 'function' && typeof OffscreenCanvas === 'function' &&
    typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';
}

export async function openWorkerHandModel(buffer, signal) {
  checkAbort(signal);
  const context = new OffscreenCanvas(1, 1).getContext('2d', { alpha: false });
  if (!context) throw new Error('无法准备手势识别画布');
  const worker = new Worker(new URL('./hand-inference-worker.js', import.meta.url));
  const model = new WorkerHandModel(worker, context);
  const abort = () => model.close();
  signal.addEventListener('abort', abort, { once: true });
  try {
    await model.request({ type: 'initialize', buffer }, [buffer.buffer], 20_000);
    checkAbort(signal);
    return model;
  } catch (error) {
    model.close();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

class WorkerHandModel {
  constructor(worker, context) {
    this.worker = worker;
    this.context = context;
    this.usesWorker = true;
    worker.onmessage = ({ data }) => this.settle(data.error && new Error(data.error), data);
    worker.onerror = event => {
      event.preventDefault();
      this.close(new Error(event.message || '手势识别线程已中断'));
    };
    worker.onmessageerror = () => this.settle(new Error('无法读取手势识别结果'));
  }

  settle(error, value) {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve(value);
  }

  request(data, transfer, timeout) {
    if (this.closed) return Promise.reject(new DOMException('手势识别已停止', 'AbortError'));
    if (this.pending) return Promise.reject(new Error('上一帧手势仍在识别'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.settle(new Error('手势识别响应超时')), timeout);
      this.pending = { timer, resolve, reject };
      try {
        this.worker.postMessage(data, transfer);
      } catch (error) {
        this.settle(error);
      }
    });
  }

  async infer(video, time) {
    if (this.closed) throw new DOMException('手势识别已停止', 'AbortError');
    const scale = Math.min(1, 352 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const { canvas } = this.context;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    // A resized video bitmap can still trigger a slow pixel read on upload.
    // Drawing into a small reusable surface avoids keeping the video backing.
    this.context.drawImage(video, 0, 0, width, height);
    const bitmap = canvas.transferToImageBitmap();
    try {
      return await this.request({ type: 'detect', bitmap, time }, [bitmap], 2000);
    } finally {
      bitmap.close();
    }
  }

  close(error = new DOMException('手势识别已停止', 'AbortError')) {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
    this.settle(error);
  }
}
