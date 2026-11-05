import test from 'node:test';
import assert from 'node:assert/strict';
import {stageFrame,tourFrame,readLook} from '../src/presentation.js';
import {photoPosition,photoArrangementScale} from '../src/photo-arrangement.js';
import {sceneShareUrl,imageFile} from '../src/share-state.js';

test('stage framing keeps the artwork inside the reserved phone and desktop area',()=>{
  for(const [width,height,area] of [[1280,720,{left:307,top:86,width:909,height:425}],[390,844,{left:16,top:203,width:358,height:321}],[320,568,{left:19,top:136,width:282,height:176}],[844,390,{left:262,top:70,width:523,height:222}]]){
    const frame=stageFrame({width,height,area,world:'heart'}),visibleHeight=2*Math.tan(42*Math.PI/360)*frame.distance;
    assert.ok(9*height/visibleHeight<=area.height+1e-6);assert.ok(9.6*height/visibleHeight<=area.width+1e-6);
    assert.equal(width/2-frame.offsetX,area.left+area.width/2);assert.equal(height/2-frame.offsetY,area.top+area.height/2);
  }
});

test('framing falls back for an unavailable area and remains within camera zoom bounds',()=>{
  for(const world of ['saturn','heart','tree','flower','ocean','unknown']){const f=stageFrame({width:320,height:568,world,area:{width:0,height:0}});assert.ok(f.distance>=14&&f.distance<=52);assert.ok(Number.isFinite(f.offsetX)&&Number.isFinite(f.offsetY));}
});

test('a tour completes every morph before advancing and stops after all five works',()=>{
  assert.equal(tourFrame(0).morph,0);assert.equal(tourFrame(2).morph,0);assert.equal(tourFrame(7).morph,1);assert.equal(tourFrame(10).morph,1);
  for(let i=0;i<5;i++){assert.equal(tourFrame(i*14).step,i);assert.equal(tourFrame(i*14).morph,0);assert.equal(tourFrame(i*14).finished,false);}
  assert.equal(tourFrame(69.99).step,4);assert.ok(tourFrame(69.99).morph<.001);assert.equal(tourFrame(70).finished,true);assert.equal(tourFrame(70).progress,1);
});

test('tour progress is monotonic and invalid clock values cannot produce invalid animation',()=>{
  let progress=0;for(let t=0;t<=71;t+=.13){const f=tourFrame(t);assert.ok(f.morph>=0&&f.morph<=1);assert.ok(f.progress>=progress);progress=f.progress;}
  assert.deepEqual(tourFrame(-5),tourFrame(0));assert.deepEqual(tourFrame(NaN),tourFrame(0));
});

test('shared light styles are allowlisted and never add local album information',()=>{
  assert.equal(readLook('glow'),'glow');assert.equal(readLook('__proto__'),'soft');assert.equal(readLook(null),'soft');
  const url=new URL(sceneShareUrl('heart',65,'glow'));assert.deepEqual([...url.searchParams.keys()],['world','spread','look']);assert.equal(url.searchParams.get('look'),'glow');assert.equal(new URL(sceneShareUrl('heart',0,'unknown')).searchParams.has('look'),false);
});

test('image downloads use the actual PNG or WebP MIME type and reject other data',async()=>{
  for(const mime of ['image/png','image/webp']){const file=imageFile('data:'+mime+';base64,AQID','art');assert.equal(file.type,mime);assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[1,2,3]);}
  assert.throws(()=>imageFile('data:text/html;base64,AQID','art'),/不支持/);
});

test('photo walls keep complete rows centered and all 24 cards bounded',()=>{
  for(let n=1;n<=24;n++){const cards=Array.from({length:n},(_,i)=>photoPosition('wall',i,n));assert.ok(cards.every(p=>p.every(Number.isFinite)&&Math.abs(p[0])<=5.3&&Math.abs(p[1])<=3.1));
    for(const y of new Set(cards.map(p=>p[1]))){const xs=cards.filter(p=>p[1]===y).map(p=>p[0]);assert.ok(Math.abs(Math.min(...xs)+Math.max(...xs))<1e-8);}}
  assert.deepEqual(photoPosition('wall',0,1),[0,0,3.8]);assert.equal(photoPosition('world',0,3),null);
  assert.ok(photoArrangementScale('wall',3)>photoArrangementScale('wall',24));
  for(let n=1;n<=24;n++){const scale=photoArrangementScale('wall',n);for(let i=0;i<n;i++){const [x,y]=photoPosition('wall',i,n);assert.ok(Math.abs(x)+1.16*scale/2<=5.3);assert.ok(Math.abs(y)+1.92*scale/2<=4.1);}}
});
