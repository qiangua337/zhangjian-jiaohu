import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureCamera} from '../src/gestures.js';

function cameraFixture(getUserMedia,videoOptions={}){
  const previous={document:globalThis.document,window:globalThis.window,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancelAnimationFrame:globalThis.cancelAnimationFrame};
  globalThis.document={addEventListener(){},removeEventListener(){}};
  globalThis.window={isSecureContext:true};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia}}});globalThis.cancelAnimationFrame=()=>{};
  const statuses=[],errors=[],hands=[];
  const video={play:async()=>{},pause(){},srcObject:null,...videoOptions};
  const camera=new GestureCamera({video,overlay:{width:320,height:240,getContext:()=>({clearRect(){}})},onStatus:s=>statuses.push(s),onError:e=>errors.push(e),onHands:h=>hands.push(h)});
  return{camera,video,statuses,errors,hands,restore(){globalThis.document=previous.document;globalThis.window=previous.window;globalThis.cancelAnimationFrame=previous.cancelAnimationFrame;if(previous.navigator)Object.defineProperty(globalThis,'navigator',previous.navigator);else delete globalThis.navigator;}};
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

test('inference failure stops the camera stream and leaves a retryable error',()=>{
  const fixture=cameraFixture(async()=>{}),previous={raf:globalThis.requestAnimationFrame,matchMedia:globalThis.matchMedia,warn:console.warn};let stopped=0;
  globalThis.requestAnimationFrame=()=>1;globalThis.matchMedia=()=>({matches:false});console.warn=()=>{};
  try{const camera=fixture.camera;camera.running=true;camera.stream={getTracks:()=>[{stop(){stopped++;}}]};fixture.video.currentTime=1;fixture.video.readyState=4;camera.model={detectForVideo(){throw new Error('GPU failed');}};camera.tick();assert.equal(camera.running,false);assert.equal(stopped,1);assert.equal(camera.frame,null);assert.equal(fixture.statuses.at(-1).state,'error');assert.match(fixture.errors[0],/摄像头已关闭/);assert.match(fixture.errors[0],/重试/);}finally{globalThis.requestAnimationFrame=previous.raf;globalThis.matchMedia=previous.matchMedia;console.warn=previous.warn;fixture.restore();}
});

test('stopping cancels the pending video callback and stale callbacks cannot schedule another loop',()=>{
  let callback,scheduled=0,cancelled=null;
  const fixture=cameraFixture(async()=>{},{
    currentTime:0,readyState:0,
    requestVideoFrameCallback(next){callback=next;return ++scheduled;},
    cancelVideoFrameCallback(id){cancelled=id;}
  });
  try{
    fixture.camera.running=true;fixture.camera.tick(200);
    assert.equal(scheduled,1);
    fixture.camera.stop();
    assert.equal(cancelled,1);
    callback(300);
    assert.equal(scheduled,1);
    assert.equal(fixture.hands.at(-1).stopped,true);
  }finally{fixture.restore();}
});

test('video callbacks deduplicate by frame timestamp even if the playback clock is stale or advances',()=>{
  let callback;
  const fixture=cameraFixture(async()=>{},{currentTime:1,readyState:4,
    requestVideoFrameCallback(next){callback=next;return 1;},cancelVideoFrameCallback(){}
  });
  try {
    const calls=[];
    fixture.camera.running=true;
    fixture.camera.lastLightSample=1000;
    fixture.camera.model={detectForVideo(video,time){calls.push(time);return {landmarks:[]};}};
    fixture.camera.queueFrame();
    callback(1100,{mediaTime:1});
    fixture.video.currentTime=1.1;
    callback(1200,{mediaTime:1});
    fixture.video.currentTime=1;
    callback(1300,{mediaTime:1.2});
    callback(1400,{mediaTime:1.3});
    assert.deepEqual(calls,[1100,1300,1400]);
    fixture.camera.stop();
  } finally {fixture.restore();}
});

test('a slow worker skips intervening video frames and its result cannot arrive after stop',async()=>{
  let callback, finish, requests=0, closed=0;
  const fixture=cameraFixture(async()=>{},{readyState:4,
    requestVideoFrameCallback(next){callback=next;return 1;},cancelVideoFrameCallback(){}
  });
  try {
    const { camera, hands } = fixture;
    camera.running=true;
    camera.model={usesWorker:true,
      infer(){requests++;return new Promise(resolve=>finish=resolve);},
      close(){closed++;}
    };
    camera.queueFrame();
    callback(100,{mediaTime:1});
    callback(133,{mediaTime:2});
    callback(166,{mediaTime:3});
    assert.equal(requests,1);
    camera.stop();
    finish({landmarks:[],cost:55});
    await Promise.resolve();
    assert.equal(closed,1);
    assert.equal(camera.model,null);
    assert.equal(hands.length,1);
    assert.equal(hands[0].stopped,true);
  } finally {fixture.restore();}
});

test('a broken worker switches to the synchronous model without closing the camera',async()=>{
  const fixture=cameraFixture(async()=>{});
  try {
    const { camera, statuses } = fixture;
    const fallback={detectForVideo(){return {landmarks:[]};}};
    let closed=0;
    const worker={usesWorker:true,
      async infer(){throw new Error('worker failed');},
      close(){closed++;}
    };
    camera.running=true;
    camera.model=worker;
    camera.loadModel=async()=>{camera.model=fallback;};
    await camera.inferInWorker(worker,100);
    assert.equal(closed,1);
    assert.equal(camera.model,fallback);
    assert.equal(camera.running,true);
    assert.equal(camera.inFlight,false);
    assert.equal(statuses.at(-1).state,'ready');
  } finally {fixture.restore();}
});
