import test from 'node:test';
import assert from 'node:assert/strict';
import {LazyWorldStore,cappedPixelRatio} from '../src/world-store.js';
import {photoLayout,fittedPhotoScale} from '../src/photo-layout.js';
import {HandSignalFilter} from '../src/hand-filter.js';
import {sampleFiles,SAMPLE_ALBUM} from '../src/sample-album.js';

const hand=(changes={})=>({x:.5,y:.5,openness:.8,palm:.12,pose:'palm',pinch:false,pinchRatio:1,roll:0,pointer:{x:.5,y:.4},grab:{x:.5,y:.5},...changes});

test('opening one world never builds the others and revisiting reuses it',()=>{
  const built=[],store=new LazyWorldStore({heart:()=>{built.push('heart');return{id:'heart'};},tree:()=>{throw new Error('unselected tree must stay cold');}});
  assert.deepEqual(built,[]);const first=store.get('heart');assert.equal(store.get('heart'),first);assert.deepEqual(built,['heart']);assert.throws(()=>store.get('unknown'),/未知作品/);assert.deepEqual(built,['heart']);
});

test('large high-density screens stay inside the render budget without upscaling small screens',()=>{
  for(const [w,h,dpr] of [[5120,2880,2],[3840,2160,2.5],[390,844,3]]){
    const ratio=cappedPixelRatio(w,h,dpr,2800000);assert.ok(w*h*ratio*ratio<=2800000+1);assert.ok(ratio<=dpr);
  }
  assert.equal(cappedPixelRatio(320,568,1,1300000),1);
});

test('portrait, landscape and extreme photos keep the entire image inside the texture',()=>{
  for(const [width,height] of [[4000,3000],[3000,4000],[1000,1000],[9000,900],[800,8000]]){
    const p=photoLayout(width,height);assert.ok(p.drawX>=-1e-7&&p.drawY>=-1e-7);assert.ok(p.drawX+p.drawWidth<=p.canvasWidth+1e-7);assert.ok(p.drawY+p.drawHeight<=p.canvasHeight+1e-7);assert.ok(Math.max(p.canvasWidth,p.canvasHeight)<=768);assert.ok(Math.abs(p.drawWidth/p.drawHeight-width/height)<1e-7);
  }
  assert.throws(()=>photoLayout(0,100),/尺寸/);
});

test('a focused photo frame fits both width and height on phones and desktops',()=>{
  for(const aspect of [320/568,390/844,16/9])for(const [w,h] of [[3000,4000],[4000,2000]]){
    const p=photoLayout(w,h),visibleHeight=2*Math.tan(42*Math.PI/360)*20,scale=fittedPhotoScale({fov:42,depth:20,aspect,frameWidth:p.frameWidth,frameHeight:p.frameHeight,coverage:.6});
    assert.ok(p.frameWidth*scale<=visibleHeight*aspect*.8+1e-8);assert.ok(p.frameHeight*scale<=visibleHeight*.6+1e-8);
  }
});

test('pinch hysteresis keeps a photo held through small finger-distance noise',()=>{
  const f=new HandSignalFilter();assert.equal(f.update([hand({pose:'pinch',pinch:true,pinchRatio:.34})],0)[0].pinch,false);
  assert.equal(f.update([hand({pose:'pinch',pinch:true,pinchRatio:.3})],70)[0].pinch,true);
  for(const [i,ratio] of [.37,.41,.36,.43].entries())assert.equal(f.update([hand({pinchRatio:ratio})],140+i*70)[0].pinch,true);
  assert.equal(f.update([hand({pinchRatio:.47})],440)[0].pinch,false);
});

test('short pose glitches do not trigger actions, while an intentional held pose settles',()=>{
  const f=new HandSignalFilter();f.update([hand()],0);
  assert.equal(f.update([hand({pose:'victory'})],40)[0].pose,'palm');assert.equal(f.update([hand()],80)[0].pose,'palm');
  assert.equal(f.update([hand({pose:'victory'})],120)[0].pose,'palm');assert.equal(f.update([hand({pose:'victory'})],200)[0].pose,'victory');
});

test('position noise is attenuated without mutating detections and old tracks expire',()=>{
  const f=new HandSignalFilter();let rawDistance=0,filteredDistance=0;
  for(let i=0;i<30;i++){const raw=hand({x:i%2?.515:.485}),filtered=f.update([raw],i*33)[0];rawDistance+=Math.abs(raw.x-.5);filteredDistance+=Math.abs(filtered.x-.5);assert.equal(raw.x,i%2?.515:.485);}
  assert.ok(filteredDistance<rawDistance*.65);f.update([],1300);assert.equal(f.update([hand({x:.7})],1400)[0].x,.7);
});

test('two hands retain their own smoothing histories when detector order changes',()=>{
  const f=new HandSignalFilter();f.update([hand({x:.2}),hand({x:.8})],0);
  const result=f.update([hand({x:.81}),hand({x:.21})],66);assert.ok(result[0].x>.79);assert.ok(result[1].x<.22);
});

test('wrist roll crosses the angle boundary without a full-turn jump',()=>{
  const f=new HandSignalFilter();f.update([hand({roll:3.1})],0);assert.ok(Math.abs(f.update([hand({roll:-3.1})],66)[0].roll-3.1)<.1);
});

test('sample album fetches only the bundled artwork and labels every file as a sample',async()=>{
  const urls=[],controller=new AbortController();const files=await sampleFiles({signal:controller.signal,fetcher:async(url,options)=>{urls.push(url);assert.equal(options.signal,controller.signal);return new Response(new Uint8Array([1,2,3]));}});
  assert.deepEqual(urls,SAMPLE_ALBUM.map(sample=>sample.url));assert.deepEqual(files.map(file=>file.sampleId),SAMPLE_ALBUM.map(sample=>sample.id));assert.ok(files.every(file=>file.name.includes('示例')&&file.type==='image/png'));
});

test('a failed sample request fails the album instead of passing an error page to the photo decoder',async()=>{
  await assert.rejects(sampleFiles({fetcher:async()=>new Response('',{status:404})}),/未能加载/);
});
