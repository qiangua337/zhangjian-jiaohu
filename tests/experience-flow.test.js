import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadBinary} from '../src/asset-loader.js';
import {GestureFeedback} from '../src/gesture-feedback.js';
import {bindContextRecovery} from '../src/context-recovery.js';
import {readSharedScene,sceneShareUrl} from '../src/share-state.js';

test('model download reports actual bytes and does not claim completion before EOF',async()=>{
  const progress=[];const body=new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));c.enqueue(new Uint8Array([3,4]));c.close();}});
  const bytes=await downloadBinary('/model',{expectedBytes:4,onProgress:p=>progress.push(p),fetcher:async()=>new Response(body)});
  assert.deepEqual([...bytes],[1,2,3,4]);assert.equal(progress[1].ratio,.5);
  assert.equal(progress.at(-2).ratio,.99);assert.equal(progress.at(-1).ratio,1);assert.equal(progress.at(-1).done,true);
});
test('model download supports unknown lengths and cancellation',async()=>{
  const controller=new AbortController();let stream;
  const body=new ReadableStream({start(c){stream=c;}});
  const pending=downloadBinary('/model',{signal:controller.signal,fetcher:async()=>new Response(body)});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});
  const progress=[];const bytes=await downloadBinary('/model',{fetcher:async()=>new Response(new Uint8Array([7,8])),onProgress:p=>progress.push(p)});
  assert.equal(bytes.length,2);assert.equal(progress[0].ratio,null);assert.equal(progress.at(-1).ratio,1);
});
test('HTTP errors fail clearly instead of becoming an invalid model',async()=>{
  await assert.rejects(downloadBinary('/model',{fetcher:async()=>new Response('',{status:404})}),/404/);
});
test('hand feedback allows a grace period and does not flicker on brief tracking loss',()=>{
  const f=new GestureFeedback();f.reset(100);
  assert.equal(f.update({time:200,hasHands:false}).state,'ready');
  assert.equal(f.update({time:3700,hasHands:false}).state,'searching');
  assert.equal(f.update({time:4000,hasHands:true}).state,'tracking');
  assert.equal(f.update({time:4400,hasHands:false}).state,'reacquiring');
  assert.equal(f.update({time:17000,hasHands:false}).state,'waiting');
});
test('dim-light advice requires sustained low luminance and clears when a hand is seen',()=>{
  const f=new GestureFeedback();f.update({time:100,hasHands:false,luminance:.04});
  assert.notEqual(f.update({time:1200,hasHands:false,luminance:.04}).state,'dim');
  assert.equal(f.update({time:2400,hasHands:false,luminance:.04}).state,'dim');
  assert.equal(f.update({time:2500,hasHands:true,luminance:.04}).state,'tracking');
  assert.notEqual(f.update({time:4000,hasHands:false,luminance:.5}).state,'dim');
});
test('context recovery prevents default loss, rebuilds before resuming and detaches',async()=>{
  const canvas=new EventTarget(),events=[];
  const dispose=bindContextRecovery(canvas,{pause:()=>events.push('pause'),rebuild:async()=>events.push('rebuild'),resume:()=>events.push('resume'),onState:s=>events.push(s)});
  const loss=new Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(loss);assert.equal(loss.defaultPrevented,true);
  canvas.dispatchEvent(new Event('webglcontextrestored'));await Promise.resolve();await Promise.resolve();
  assert.deepEqual(events,['pause','lost','restoring','rebuild','resume','ready']);dispose();canvas.dispatchEvent(new Event('webglcontextlost'));assert.equal(events.length,6);
});
test('failed or superseded context rebuilds never restart a stale render loop',async()=>{
  const canvas=new EventTarget(),events=[];let finish;
  const dispose=bindContextRecovery(canvas,{pause:()=>{},rebuild:()=>new Promise(r=>finish=r),resume:()=>events.push('resume'),onState:s=>events.push(s)});
  canvas.dispatchEvent(new Event('webglcontextlost'));canvas.dispatchEvent(new Event('webglcontextrestored'));
  canvas.dispatchEvent(new Event('webglcontextlost'));finish();await Promise.resolve();assert.equal(events.includes('resume'),false);dispose();
  const states=[];const end=bindContextRecovery(canvas,{pause:()=>{},rebuild:async()=>{throw new Error('lost');},resume:()=>states.push('resume'),onState:s=>states.push(s)});
  canvas.dispatchEvent(new Event('webglcontextrestored'));await Promise.resolve();await Promise.resolve();assert.deepEqual(states,['restoring','error']);end();
});
test('shared scene parameters are bounded and contain no local photos',()=>{
  assert.deepEqual(readSharedScene('?world=heart&spread=200'),{world:'heart',spread:100});
  assert.deepEqual(readSharedScene('?world=anything&spread=NaN'),{world:null,spread:null});
  assert.deepEqual(readSharedScene(''),{world:null,spread:null});
  const url=sceneShareUrl('heart',34.6);assert.equal(url,'https://zhangjian-jiaohu.pages.dev/?world=heart&spread=35');
  assert.deepEqual([...new URL(url).searchParams.keys()],['world','spread']);
});
