import test from 'node:test';
import assert from 'node:assert/strict';
import {heartCloud,galaxyArm,oceanCurrent} from '../src/scene-layout.js';
import {Resonance} from '../src/resonance.js';

function random(seed=87){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

test('released scenes remain bounded in depth and heart fragments fill the center',()=>{
  for(const shape of [heartCloud,galaxyArm,oceanCurrent]){
    const r=random(),points=Array.from({length:440},(_,i)=>shape(r,i));
    for(const count of [154,255,440]){
      const visible=points.slice(0,count);
      assert.ok(visible.every(p=>p.every(v=>Number.isFinite(v)&&Math.abs(v)<7)));
      for(let axis=0;axis<3;axis++){
        assert.ok(Math.min(...visible.map(p=>p[axis]))<-1.5);
        assert.ok(Math.max(...visible.map(p=>p[axis]))>1.5);
      }
    }
    if(shape===heartCloud)assert.ok(points.filter(p=>Math.abs(p[0])<1.8&&Math.abs(p[1])<1.8&&Math.abs(p[2])<2.5).length>44);
  }
});

test('a sustained open palm emits once and closing the hand rearms the response',()=>{
  const response=new Resonance();
  assert.equal(response.observe(.9,100),true);
  assert.equal(response.observe(.92,700),false);
  assert.equal(response.observe(.1,900),false);
  assert.equal(response.observe(.85,1200),true);
  assert.equal(response.trigger(1300),false);
  assert.equal(response.trigger(1700),true);
});

test('response light decays equally at phone and desktop frame rates',()=>{
  const phone=new Resonance(),desktop=new Resonance();phone.trigger(0);desktop.trigger(0);
  for(let i=0;i<30;i++)phone.step(1/30);
  for(let i=0;i<60;i++)desktop.step(1/60);
  assert.ok(Math.abs(phone.energy-desktop.energy)<1e-10);
  phone.step(3);assert.equal(phone.energy,0);phone.reset();assert.equal(phone.energy,0);
});
