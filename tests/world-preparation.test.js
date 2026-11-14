import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldPreparation } from '../src/world-preparation.js';

function fixture() {
  let serial=0, allowed=true;
  const callbacks=new Map(), steps=[];
  const queue=new WorldPreparation({
    schedule(callback) { callbacks.set(++serial,callback); return serial; },
    cancel(id) { callbacks.delete(id); },
    canWork:()=>allowed,
    build(id) {
      steps.push(id+':build');
      return [()=>steps.push(id+':compile'),()=>steps.push(id+':texture')];
    },
  });
  const tick=ms=>{
    queue.queue();queue.queue();
    const pending=[...callbacks.values()];
    assert.ok(pending.length<=1);
    callbacks.clear();
    pending[0]?.({timeRemaining:()=>ms});
  };
  return {queue,steps,tick,callbacks,block(){allowed=false;},unblock(){allowed=true;}};
}

test('scene preparation yields to camera and short idle windows between build, compile, and upload',()=>{
  const {queue,steps,tick,block,unblock}=fixture();
  queue.select('heart');
  tick(3);assert.deepEqual(steps,[]);
  tick(18);assert.deepEqual(steps,['heart:build']);
  block();
  tick(18);assert.equal(steps.length,1);
  unblock();
  tick(18);tick(18);tick(18);
  assert.deepEqual(steps,['heart:build','heart:compile','heart:texture']);
  queue.select('heart');tick(18);assert.equal(steps.length,3);
});

test('an explicit switch cancels a queued job, and context loss allows preparation again',()=>{
  const {queue,steps,tick,callbacks}=fixture();
  queue.select('tree');queue.queue();
  const stale=[...callbacks.values()][0];
  queue.select('ocean');queue.queue();
  stale({timeRemaining:()=>20});
  tick(20);
  queue.markPrepared('ocean');
  tick(20);
  assert.deepEqual(steps,['ocean:build']);
  queue.reset();queue.select('ocean');
  tick(20);tick(20);tick(20);
  assert.deepEqual(steps,['ocean:build','ocean:build','ocean:compile','ocean:texture']);
});
