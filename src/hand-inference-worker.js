let model;
self.onmessage = async ({ data }) => {
  const bitmap = data.bitmap;
  try {
    if (data.type === 'initialize') {
      // The worker stays classic so the MediaPipe runtime can call importScripts.
      const { createHandModel } = await import('./hand-model.js');
      model = await createHandModel(data.buffer, { canvas: new OffscreenCanvas(1, 1) });
      self.postMessage({ type: 'ready' });
      return;
    }
    const started = performance.now();
    const { landmarks } = model.detectForVideo(bitmap, data.time);
    self.postMessage({ landmarks, cost: performance.now() - started });
  } catch (error) {
    self.postMessage({ error: error.message || '手势识别未能运行' });
  } finally {
    bitmap?.close();
  }
};
