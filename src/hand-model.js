import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { checkAbort } from './asset-loader.js';

export async function createHandModel(buffer, { canvas, signal, onFallback } = {}) {
  const vision = await FilesetResolver.forVisionTasks('/vision');
  checkAbort(signal);
  const options = {
    canvas, runningMode: 'VIDEO', numHands: 2,
    baseOptions: { modelAssetBuffer: buffer, delegate: canvas ? 'CPU' : 'GPU' },
    minHandDetectionConfidence: .55, minHandPresenceConfidence: .55, minTrackingConfidence: .55,
  };
  try {
    return await HandLandmarker.createFromOptions(vision, options);
  } catch (error) {
    if (canvas || signal?.aborted) throw error;
    onFallback?.();
    options.baseOptions.delegate = 'CPU';
    return HandLandmarker.createFromOptions(vision, options);
  }
}
