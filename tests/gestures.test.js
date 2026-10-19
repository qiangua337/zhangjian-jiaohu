import test from 'node:test';
import assert from 'node:assert/strict';
import { measureHand, PoseConfirmation } from '../src/gestures.js';

function hand(extended = [true,true,true,true]) {
  const points=Array.from({length:21},()=>({x:0.5,y:0.66,z:0}));
  points[0]={x:0.5,y:0.88};points[1]={x:0.44,y:0.77};points[2]={x:0.37,y:0.68};points[3]={x:0.30,y:0.61};points[4]={x:0.23,y:0.59};
  [5,9,13,17].forEach((mcp,j)=>{const x=.38+j*.08;points[mcp]={x,y:.65};points[mcp+1]={x,y:extended[j]?.47:.64};points[mcp+2]={x,y:extended[j]?.35:.70};points[mcp+3]={x,y:extended[j]?.22:.76};});
  return points;
}
test('rejects incomplete and invalid detections',()=>{assert.equal(measureHand([]),null);const p=hand();p[8].x=NaN;assert.equal(measureHand(p),null);});
test('a full open hand and a fist have distinct openness',()=>{const open=measureHand(hand());const fist=measureHand(hand([false,false,false,false]));assert.ok(open.openness>.8);assert.ok(fist.openness<.2);assert.equal(fist.pose,'fist');});
test('pinching takes precedence over other pose classifications',()=>{const p=hand([true,false,false,false]);p[4]={...p[8]};assert.equal(measureHand(p).pose,'pinch');});
test('pointing and victory are distinct actions',()=>{assert.equal(measureHand(hand([true,false,false,false])).pose,'point');const p=hand([true,true,false,false]);p[8].x=.31;p[12].x=.53;assert.equal(measureHand(p).pose,'victory');});
test('mirrors hand position for a front camera',()=>{const left=hand().map(p=>({...p,x:p.x-.15}));const right=hand().map(p=>({...p,x:p.x+.15}));assert.ok(measureHand(left).x>measureHand(right).x);});
test('confirmation fires once per held pose and rearms after release',()=>{const gate=new PoseConfirmation(750);assert.equal(gate.update('victory',100).action,null);assert.equal(gate.update('victory',900).action,'next');assert.equal(gate.update('victory',1800).action,null);gate.update('palm',1900);gate.update('victory',2000);assert.equal(gate.update('victory',2800).action,'next');});
test('changing confirmation poses restarts the hold timer',()=>{const gate=new PoseConfirmation(750);gate.update('victory',0);assert.equal(gate.update('thumb',700).action,null);assert.equal(gate.update('thumb',1500).action,'freeze');});
