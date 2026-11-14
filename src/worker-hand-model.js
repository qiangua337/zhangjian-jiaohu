import { checkAbort } from './asset-loader.js';

export function supportsHandWorker() {
  return typeof Worker === 'function' && typeof OffscreenCanvas === 'function' &&
    typeof createImageBitmap === 'function';
}

export async function openWorkerHandModel(buffer, signal) {
  checkAbort(signal);
  const model = new WorkerHandModel(new Worker(new URL('./hand-inference-worker.js', import.meta.url)));
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
  constructor(worker) {
    this.worker = worker;
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
    const longestSide = Math.max(video.videoWidth, video.videoHeight);
    const scale = longestSide > 352 ? 352 / longestSide : 1;
    const bitmap = scale < 1
      ? await createImageBitmap(video, {
        resizeWidth: Math.round(video.videoWidth * scale),
        resizeHeight: Math.round(video.videoHeight * scale),
        resizeQuality: 'low',
      })
      : await createImageBitmap(video);
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
