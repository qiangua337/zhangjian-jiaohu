import test from 'node:test';
import assert from 'node:assert/strict';
import {FocusResource,PhotoClock,swipeDirection} from '../src/focus-resource.js';
import {gestureInstruction} from '../src/gesture-instruction.js';

function resourceFixture(){
  const pending=[],applied=[],reset=[],states=[],disposed=[];
  const cache=new FocusResource({load:(item,signal)=>new Promise((resolve,reject)=>pending.push({id:item.id,signal,resolve,reject})),apply:(item,value)=>applied.push([item.id,value.id]),reset:item=>reset.push(item.id),report:state=>states.push(state)});
  const texture=id=>({id,dispose(){disposed.push(id);}});
  return{cache,pending,applied,reset,states,disposed,texture};
}
const photo=id=>({id,source:{}});

test('rapid photo changes cancel old decodes and discard late high-resolution textures',async()=>{
  const f=resourceFixture(),one=f.cache.select(photo('one')),two=f.cache.select(photo('two'));
  assert.equal(f.pending[0].signal.aborted,true);f.pending[1].resolve(f.texture('two'));await two;
  f.pending[0].resolve(f.texture('one'));await one;
  assert.deepEqual(f.applied,[['two','two']]);assert.deepEqual(f.disposed,['one']);f.cache.clear();assert.deepEqual(f.reset,['two']);assert.deepEqual(f.disposed,['one','two']);
});

test('closing the viewer during decode never applies a texture to a removed photo',async()=>{
  const f=resourceFixture(),pending=f.cache.select(photo('one'));f.cache.clear();assert.equal(f.pending[0].signal.aborted,true);f.pending[0].resolve(f.texture('late'));await pending;assert.deepEqual(f.applied,[]);assert.deepEqual(f.disposed,['late']);assert.equal(f.states.at(-1),'idle');
});

test('failed detail decoding leaves the standard texture available',async()=>{
  const f=resourceFixture(),pending=f.cache.select(photo('one'));f.pending[0].reject(new Error('cannot decode'));await pending;assert.deepEqual(f.applied,[]);assert.equal(f.states.at(-1),'fallback');f.cache.clear();assert.deepEqual(f.reset,[]);
});

test('refocusing the same photo does not allocate a second detailed texture',async()=>{
  const f=resourceFixture(),item=photo('same'),pending=f.cache.select(item);await f.cache.select(item);assert.equal(f.pending.length,1);f.pending[0].resolve(f.texture('same'));await pending;f.cache.clear();f.cache.clear();assert.deepEqual(f.disposed,['same']);
});

test('slideshow advances after five seconds and never catches up in a burst',()=>{
  const clock=new PhotoClock();clock.start(1000);assert.equal(clock.tick(5999),false);assert.equal(clock.tick(6000),true);assert.equal(clock.tick(6001),false);assert.equal(clock.tick(60000),true);assert.equal(clock.tick(60001),false);
});

test('slideshow stops on hidden pages, dialogs, a closed viewer or a single-photo album',()=>{
  for(const state of [{visible:false},{blocked:true},{focused:false},{count:1}]){const clock=new PhotoClock();clock.start(0);assert.equal(clock.tick(5000,state),false);assert.equal(clock.playing,false);assert.equal(clock.tick(10000),false);}
});

test('only a deliberate single-finger horizontal swipe changes photos',()=>{
  assert.equal(swipeDirection({dx:-90,dy:10,duration:350}),1);assert.equal(swipeDirection({dx:90,dy:10,duration:350}),-1);
  for(const input of [{dx:40,dy:0,duration:100},{dx:100,dy:100,duration:200},{dx:100,dy:0,duration:900},{dx:100,dy:0,duration:200,pointers:2}])assert.equal(swipeDirection(input),0);
});

test('hand feedback distinguishes actual photo grabbing, scene dragging and two-hand zoom',()=>{
  assert.match(gestureInstruction([{pose:'pinch'}],{grabbing:true}).title,/照片/);assert.match(gestureInstruction([{pose:'pinch'}]).title,/作品/);assert.match(gestureInstruction([{pose:'palm'},{pose:'palm'}]).hint,/大小/);assert.match(gestureInstruction([{pose:'thumb'}],{frozen:true}).hint,/继续/);assert.equal(gestureInstruction([]),null);
});
