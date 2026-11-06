import test from 'node:test';
import assert from 'node:assert/strict';
import {TheaterTimeline,theaterFrame,THEATER_CHAPTERS,THEATER_LENGTH} from '../src/theater.js';

test('all five chapters finish their reveal and return before the next chapter',()=>{
  assert.deepEqual(THEATER_CHAPTERS.map(c=>c.world),['saturn','heart','tree','flower','ocean']);
  for(let i=0;i<5;i++){const start=i*16;assert.equal(theaterFrame(start).index,i);assert.equal(theaterFrame(start).morph,0);assert.equal(theaterFrame(start+9.5).morph,1);assert.equal(theaterFrame(start+12.5).morph,1);assert.ok(theaterFrame(start+15.99).morph<.001);}
  const end=theaterFrame(THEATER_LENGTH);assert.equal(end.index,4);assert.equal(end.progress,1);assert.equal(end.morph,0);assert.equal(end.finished,true);
});
test('the whole performance has bounded poses, ordered progress and a finite finish',()=>{
  let progress=0;for(let t=0;t<=90;t+=.07){const f=theaterFrame(t);assert.ok(f.morph>=0&&f.morph<=1);assert.ok(f.chapterProgress>=0&&f.chapterProgress<=1);assert.ok(f.progress>=progress);assert.ok(Math.abs(f.yaw)<=.24&&Math.abs(f.pitch)<=.081);progress=f.progress;}
  for(const time of [NaN,Infinity,-2])assert.deepEqual(theaterFrame(time),theaterFrame(0));
});
test('pausing and resuming retains the exact chapter, pose and progress',()=>{
  const clock=new TheaterTimeline();clock.start(2);for(let i=0;i<45;i++)clock.advance(.08);clock.pause(true);const paused=clock.snapshot();for(let i=0;i<100;i++)clock.advance(.08);assert.deepEqual(clock.snapshot(),paused);clock.pause(false);assert.ok(clock.advance(.08).seconds>paused.seconds);
});
test('background or blocked playback pauses and never resumes without an explicit action',()=>{
  for(const state of [{hidden:true},{blocked:true}]){const clock=new TheaterTimeline();clock.start();clock.advance(.08);const before=clock.seconds;clock.advance(.08,state);assert.equal(clock.paused,true);assert.equal(clock.seconds,before);clock.advance(.08);assert.equal(clock.seconds,before);clock.pause(false);assert.equal(clock.advance(.08).seconds,before+.08);}
});
test('chapter navigation preserves pause state and seeking never starts a stopped performance',()=>{
  const clock=new TheaterTimeline();clock.seek(3);assert.equal(clock.active,false);assert.equal(clock.seconds,0);clock.start();clock.pause(true);const next=clock.seek(4);assert.equal(next.world,'ocean');assert.equal(next.paused,true);assert.equal(next.seconds,64);assert.equal(clock.seek(99).index,4);assert.equal(clock.seek(-99).index,0);assert.equal(clock.seek(NaN).index,0);clock.stop();clock.advance(.08);assert.equal(clock.active,false);
});
test('a delayed frame cannot skip a chapter and restarting clears the old pause state',()=>{
  const clock=new TheaterTimeline();clock.start(1);assert.equal(clock.advance(50).seconds,16.1);assert.equal(clock.advance(NaN).seconds,16.1);clock.pause(true);clock.start();assert.equal(clock.seconds,0);assert.equal(clock.paused,false);assert.equal(clock.active,true);
});
