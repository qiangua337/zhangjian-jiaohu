import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureCamera} from '../src/gestures.js';

function cameraFixture(getUserMedia){
  const previous={document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancelAnimationFrame:globalThis.cancelAnimationFrame};
  globalThis.document={addEventListener(){},removeEventListener(){}};
  globalThis.window={isSecureContext:true};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});globalThis.cancelAnimationFrame=()=>{};
  const statuses=[],errors=[],hands=[];
  const video={play:async()=>{},pause(){},srcObject:null};
  const camera=new GestureCamera({video,overlay:{width:320,height:240,getContext:()=>({clearRect(){}})},onStatus:s=>statuses.push(s),onError:e=>errors.push(e),onHands:h=>hands.push(h)});
  return{camera,video,statuses,errors,restore(){globalThis.document=previous.document;globalThis.window=previous.window;globalThis.cancelAnimationFrame=previous.cancelAnimationFrame;if(previous.navigator)Object.defineProperty(globalThis,'navigator',previous.navigator);else delete globalThis.navigator;}};
}
test('permission rejection gives an actionable error and leaves camera stopped',async()=>{
  const fixture=cameraFixture(async()=>{throw Object.assign(new Error('denied'),{name:'NotAllowedError'});});
  try{await fixture.camera.start();assert.equal(fixture.camera.running,false);assert.equal(fixture.camera.starting,false);assert.match(fixture.errors[0],/授权/);assert.equal(fixture.statuses.at(-1).state,'error');}finally{fixture.restore();}
});
test('cancel during browser permission never leaves a late camera stream open',async()=>{
  let allow,stopped=0;
  const fixture=cameraFixture(()=>new Promise(resolve=>allow=resolve));
  try{
    const pending=fixture.camera.start();fixture.camera.stop();allow({getTracks:()=>[{stop(){stopped++;}}]});await pending;
    assert.equal(stopped,1);assert.equal(fixture.video.srcObject,null);assert.equal(fixture.camera.running,false);assert.equal(fixture.errors.length,0);
  }finally{fixture.restore();}
});
test('cancel during model download aborts loading and stops every camera track',async()=>{
  let stopped=0,signal;
  const fixture=cameraFixture(async()=>({getTracks:()=>[{stop(){stopped++;}}]}));
  fixture.camera.loadModel=async current=>{signal=current;return new Promise((resolve,reject)=>current.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));};
  try{
    const pending=fixture.camera.start();await Promise.resolve();await Promise.resolve();assert.ok(signal);fixture.camera.stop();await pending;
    assert.equal(signal.aborted,true);assert.equal(stopped,1);assert.equal(fixture.errors.length,0);assert.equal(fixture.camera.starting,false);
  }finally{fixture.restore();}
});

test('cancel while the video starts cannot restore a stale loading status',async()=>{
  let play,stopped=0,loads=0;
  const fixture=cameraFixture(async()=>({getTracks:()=>[{stop(){stopped++;}}]}));
  fixture.video.play=()=>new Promise(resolve=>play=resolve);
  fixture.camera.loadModel=async()=>{loads++;};
  try{
    const pending=fixture.camera.start();await Promise.resolve();fixture.camera.stop();play();await pending;
    assert.equal(stopped,1);assert.equal(loads,0);assert.equal(fixture.statuses.at(-1).state,'off');assert.equal(fixture.video.srcObject,null);
  }finally{fixture.restore();}
});
