import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorldStore, makeStarfield, updateWorld, WORLD_INFO, randomFactory } from './worlds.js';
import { studioEnvironment, createAtmosphere } from './atmosphere.js';
import { orbitalPosition } from './swarm.js';
import { createLightfield } from './lightfield.js';
import {bindContextRecovery} from './context-recovery.js';
import {Resonance} from './resonance.js';
import {createResponseField} from './response-field.js';
import {cappedPixelRatio} from './world-store.js';
import {fittedPhotoScale} from './photo-layout.js';

const PORTRAIT_SHAPES={heart:{normal:.79,compact:.78,offset:-.5},flower:{normal:.65,compact:.62,offset:-.22},ocean:{normal:.84,compact:.8,offset:.18}};
const PORTRAIT_WIDTH={heart:.76,flower:.82,ocean:.7};

export class Experience {
  constructor(container, { onReady=()=>{}, onWorld=()=>{}, onPhotoFocus=()=>{}, onQuality=()=>{}, onMotion=()=>{}, onDemo=()=>{},onInteraction=()=>{},onContext=()=>{},onReducedMotion=()=>{},onResponse=()=>{},getPhotoArea=()=>null,motionMode='auto',initialWorld='saturn' }={}) {
    Object.assign(this,{container,onReady,onWorld,onPhotoFocus,onQuality,onMotion,onDemo,onInteraction,onContext,onReducedMotion,onResponse,getPhotoArea});
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.motionOverridden=['reduce','full'].includes(motionMode);this.reducedMotion=this.motionOverridden?motionMode==='reduce':this.motionQuery.matches;
    this.motionHandler=()=>{if(!this.motionOverridden)this.setReducedMotion(this.motionQuery.matches);};this.motionQuery.addEventListener?.('change',this.motionHandler);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#060a13');
    this.camera=new THREE.PerspectiveCamera(42,1,.1,150);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.renderer.domElement.setAttribute('aria-label','可拖动、缩放的三维互动场景');this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.tabIndex=0;container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-keyshortcuts','Enter');this.renderer.domElement.setAttribute('aria-description','轻触唤起光波，拖动旋转，滚轮或双指缩放。键盘按回车键也能唤起光波。');
    this.mobile=matchMedia('(pointer:coarse)').matches||innerWidth<760;
    this.qualityMode='auto';this.quality=this.mobile?.58:1;this.pixelRatio=Math.min(devicePixelRatio||1,this.mobile?1.3:1.8);
    this.environmentTarget=studioEnvironment(this.renderer);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;
    this.scene.add(new THREE.AmbientLight('#b5bdd5',.24));
    const sun=new THREE.DirectionalLight('#ffe5dd',2.65);sun.position.set(-6,7,8);this.scene.add(sun);
    const blue=new THREE.DirectionalLight('#a3bbff',1.1);blue.position.set(5,2,-6);this.scene.add(blue);
    const rim=new THREE.PointLight('#dfb1c6',14,30);rim.position.set(2,5,-4);this.scene.add(rim);
    this.atmosphere=createAtmosphere();this.scene.add(this.atmosphere.mesh);
    this.lightfield=createLightfield();this.scene.add(this.lightfield.root);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enablePan=false;this.controls.enableDamping=true;this.controls.dampingFactor=.055;this.controls.minDistance=10;this.controls.maxDistance=52;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.7;this.controls.autoRotate=false;this.controls.maxPolarAngle=Math.PI*.85;
    this.controls.enableDamping=!this.reducedMotion;this.onReducedMotion(this.reducedMotion);
    this.controls.addEventListener('start',()=>{this.onInteraction();this.setDemo(false);this.lastUserInput=performance.now();this.controls.autoRotate=false;});
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.6,.8,1.05);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.worldStore=createWorldStore();this.current=this.getWorld(initialWorld);this.current.root.visible=true;this.setScenePalette(this.current);
    this.stars=makeStarfield();this.scene.add(this.stars.object);
    this.scatter=0;this.targetScatter=0;this.controlFraction=this.current.id==='flower'?.55:0;this.open=1;this.targetOpen=1;this.yaw=0;this.pitch=0;this.targetYaw=0;this.targetPitch=0;this.elapsed=0;this.frozen=false;this.lastTime=performance.now();this.lastUserInput=0;this.hasHands=false;this.photoLayer=new THREE.Group();this.scene.add(this.photoLayer);this.photos=[];this.photoFaces=[];this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.lastPinch=false;this.grabbed=null;this.focused=null;this.lastDoubleHandDistance=null;
    this.makeTrail();
    this.resonance=new Resonance();this.responseField=createResponseField();this.scene.add(this.responseField.root);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.reveal=1;
    this.renderer.domElement.addEventListener('dblclick',()=>this.toggleSpread());
    this.activePointers=new Set();
    this.renderer.domElement.addEventListener('pointerdown',event=>{this.activePointers.add(event.pointerId);this.tapStart=this.activePointers.size===1?{id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()}:null;});
    this.renderer.domElement.addEventListener('pointerup',event=>{const start=this.tapStart;this.activePointers.delete(event.pointerId);if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8&&performance.now()-start.time<500){const x=event.clientX/innerWidth,y=event.clientY/innerHeight;if(!this.pickPhoto(x,y,false))this.pulse(x,y);}this.tapStart=null;});
    this.renderer.domElement.addEventListener('pointercancel',event=>{this.activePointers.delete(event.pointerId);this.tapStart=null;});
    this.renderer.domElement.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.onInteraction();this.pulse();}});
    this.slowTime=0;this.performanceFrames=0;this.performanceTime=0;this.performanceAdjusted=false;
    this.removeContextRecovery=bindContextRecovery(this.renderer.domElement,{pause:()=>{this.contextLost=true;cancelAnimationFrame(this.frame);this.setDemo(false);this.onContext('lost');},rebuild:()=>this.restoreGraphics(),resume:()=>{this.contextLost=false;this.resumeRendering();},onState:(state)=>{if(state!=='lost')this.onContext(state);}});
    this.ready=this.prepareCurrentWorld().then(()=>{if(this.disposed)return;this.prepared=true;this.resumeRendering();this.onReducedMotion(this.reducedMotion);this.onReady();});
  }
  resumeRendering(){if(this.disposed||this.contextLost||!this.prepared)return;cancelAnimationFrame(this.frame);this.lastTime=performance.now();this.frame=requestAnimationFrame(time=>this.render(time));}
  getWorld(id){const world=this.worldStore.get(id);if(!world.root.parent){world.root.visible=false;this.scene.add(world.root);}return world;}
  setScenePalette(world){this.scene.background.set(world.bg);this.atmosphere.setWorld(world);this.lightfield.setWorld(world);this.bloom.strength={flower:.38,tree:.7,ocean:.7,heart:.4}[world.id]||.58;this.bloom.threshold=world.id==='flower'?1.2:1.05;}
  async prepareCurrentWorld(){
    this.current.root.scale.setScalar(this.current.scale);updateWorld(this.current,0,0,1,this.quality,1);
    if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
    if(!this.disposed)this.composer.render();
  }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    this.width=w;this.height=h;const portrait=w<=900&&h>w,shortLandscape=h<560&&w>h,compact=portrait&&h<730;
    this.camera.aspect=w/h;
    this.homeDistance=this.immersive?(portrait?26:shortLandscape?21:18.5):portrait?(compact?45:36.5):shortLandscape?24:19.8;
    if(!this.wasSized||portrait!==this.wasPortrait||compact!==this.wasCompact||shortLandscape!==this.wasShortLandscape||this.immersive!==this.wasImmersive){this.camera.position.set(0,portrait?3.1:2.3,this.homeDistance);this.controls.target.set(0,0,0);this.controls.update();this.wasSized=true;this.wasPortrait=portrait;this.wasCompact=compact;this.wasShortLandscape=shortLandscape;this.wasImmersive=this.immersive;}
    const yOffset=this.immersive?0:portrait?(compact?h*.115:h*.055):h*.035;
    this.camera.setViewOffset(w,h,portrait||this.immersive?0:-w*.155,yOffset,w,h);this.camera.updateProjectionMatrix();const budget=this.qualityMode==='high'?4500000:this.qualityMode==='low'?1500000:this.mobile?1300000:2800000,pixelRatio=cappedPixelRatio(w,h,this.pixelRatio,budget);this.renderer.setPixelRatio(pixelRatio);this.renderer.setSize(w,h);this.composer.setPixelRatio(pixelRatio);this.composer.setSize(w,h);this.placeFocusedPhoto();
  }
  setWorld(id) {
    if(id===this.current.id||!WORLD_INFO.some(world=>world.id===id))return;if(this.focused||this.grabbed)this.clearFocus();const next=this.getWorld(id);
    this.resonance.reset();this.responseField.root.visible=false;
    this.current.root.visible=false;this.current=next;this.current.root.visible=true;this.reveal=0;this.setScenePalette(next);this.targetScatter=0;this.controlFraction=next.id==='flower'?.55:0;this.targetOpen=1;this.targetYaw=0;this.targetPitch=0;this.grabbed=null;this.focused=null;this.lastPinch=false;this.onPhotoFocus(null);this.onWorld(next);this.lastUserInput=performance.now();
    this.camera.position.set(0,this.wasPortrait?3.1:2.3,this.homeDistance);this.controls.target.set(0,0,0);this.controls.update();
  }
  nextWorld(){const index=WORLD_INFO.findIndex(world=>world.id===this.current.id);this.setWorld(WORLD_INFO[(index+1)%WORLD_INFO.length].id);}
  setDemo(active,{once=false,completed=false}={}){const changed=Boolean(this.demo)!==active;this.demo=active;this.demoOnce=active&&once;if(active){this.demoStart=this.elapsed;this.frozen=false;this.clearFocus();}if(changed)this.onDemo(active,{once,completed});}
  setReducedMotion(reduce){this.reducedMotion=reduce;this.controls.enableDamping=!reduce;if(reduce)this.setDemo(false);this.onReducedMotion(reduce);}
  async restoreGraphics(){
    this.environmentTarget.dispose();this.environmentTarget=studioEnvironment(this.renderer);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;
    this.composer.reset();this.resize();
    if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)throw new Error('画面已关闭');
    this.composer.render();
  }
  toggleSpread(){const expanded=this.targetScatter<.5;this.controlFraction=expanded?1:0;this.targetScatter=expanded?.94:0;this.targetOpen=expanded?1:.15;return expanded;}
  setMorph(value,{immediate=false,respond=false}={}){const amount=THREE.MathUtils.clamp(value,0,1);this.controlFraction=amount;if(this.current.id==='flower'){this.targetOpen=THREE.MathUtils.smoothstep(amount,0,.55);this.targetScatter=THREE.MathUtils.smoothstep(amount,.55,1)*.94;}else{this.targetScatter=amount*.94;this.targetOpen=.15+amount*.85;}if(immediate){this.scatter=this.targetScatter;this.open=this.targetOpen;}if(respond)this.pulse();}
  pulse(x,y){if(!this.prepared||this.contextLost||!this.resonance.trigger(performance.now()))return false;this.showResponse(x,y);return true;}
  showResponse(x,y){if(x===undefined||y===undefined){const p=this.controls.target.clone().project(this.camera);x=(p.x+1)/2;y=(1-p.y)/2;}this.responseField.fire(this.unproject(x,y,1),this.current.color);this.onResponse(this.current);}
  toggleFreeze(){this.frozen=!this.frozen;return this.frozen;}
  setQuality(mode){this.qualityMode=mode;this.quality=mode==='high'?1:mode==='low'?.38:(this.mobile?.58:1);this.pixelRatio=Math.min(devicePixelRatio||1,mode==='high'?1.9:mode==='low'?1:(this.mobile?1.3:1.8));this.resize();this.onQuality(mode);}
  resetView(){this.setDemo(false);this.controlFraction=this.current.id==='flower'?.55:0;this.targetScatter=0;this.targetOpen=1;this.targetYaw=0;this.targetPitch=0;this.frozen=false;this.grabbed=null;this.focused=null;this.onPhotoFocus(null);this.wasSized=false;this.resize();}
  processHands(hands,time) {
    this.hasHands=hands.length>0;
    if(!hands.length){if(this.grabbed)this.releaseGrab();this.lastPinch=false;this.lastDoubleHandDistance=null;return;}
    const hand=hands[0];this.lastUserInput=time;
    if(hands.length>1){const distance=Math.hypot(hands[0].x-hands[1].x,hands[0].y-hands[1].y);if(this.lastDoubleHandDistance!==null){const ratio=THREE.MathUtils.clamp(this.lastDoubleHandDistance/Math.max(distance,.1),.92,1.08);this.camera.position.multiplyScalar(ratio);const length=THREE.MathUtils.clamp(this.camera.position.length(),this.controls.minDistance,this.controls.maxDistance);this.camera.position.setLength(length);}this.lastDoubleHandDistance=distance;if(this.grabbed)this.releaseGrab();this.lastPinch=false;return;}else this.lastDoubleHandDistance=null;
    if(hand.pose==='palm'||hand.pose==='fist'){
      if(this.resonance.observe(hand.openness,time))this.showResponse(hand.x,hand.y);
      this.targetOpen=hand.openness;
      this.targetScatter=this.current.id==='flower'?THREE.MathUtils.smoothstep(hand.openness,.72,1)*.94:THREE.MathUtils.smoothstep(hand.openness,.25,.9)*.94;
      this.controlFraction=this.current.id==='flower'?(this.targetOpen<.99?this.targetOpen*.55:.55+this.targetScatter/.94*.45):this.targetScatter/.94;
      this.targetYaw=(hand.x-.5)*1.9;this.targetPitch=(hand.y-.5)*.7;
    }
    if(hand.pose==='point')this.emitTrail(hand.pointer.x,hand.pointer.y);
    if(hand.pinch){
      if(!this.lastPinch){const picked=this.pickPhoto(hand.grab.x,hand.grab.y,true);this.draggingWorld=!picked;this.dragStart={x:hand.grab.x,y:hand.grab.y,yaw:this.targetYaw,pitch:this.targetPitch};}
      if(this.grabbed){this.grabPosition=this.unproject(hand.grab.x,hand.grab.y,4);this.grabRoll=THREE.MathUtils.clamp(hand.roll,-.6,.6);}
      else if(this.draggingWorld&&this.dragStart){this.targetYaw=this.dragStart.yaw+(hand.grab.x-this.dragStart.x)*3;this.targetPitch=this.dragStart.pitch+(hand.grab.y-this.dragStart.y)*1.6;}
    }else if(this.lastPinch){this.releaseGrab();this.draggingWorld=false;}
    this.lastPinch=hand.pinch;
  }
  unproject(x,y,z=0) {
    this.pointer.set(x*2-1,1-y*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const direction=this.camera.getWorldDirection(new THREE.Vector3()),distance=this.camera.position.distanceTo(this.controls.target),center=this.controls.target.clone().addScaledVector(direction,-Math.min(z,distance*.4));
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(direction,center),point=new THREE.Vector3();return this.raycaster.ray.intersectPlane(plane,point)||point;
  }
  pickPhoto(x,y,grab=false) {
    if(!this.photoFaces.length)return null;
    this.pointer.set(x*2-1,1-y*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObjects(this.photoFaces.filter(face=>face.userData.photo.group.visible),false)[0];if(!hit)return null;
    const photo=hit.object.userData.photo;
    if(grab){this.grabbed=photo;this.grabPosition=this.unproject(x,y,4);this.grabRoll=0;}else this.focusPhoto(photo);
    return photo;
  }
  focusPhoto(photo){
    this.focused=photo;this.grabbed=null;this.current.root.visible=false;this.photos.forEach(item=>item.group.visible=item===photo);this.onPhotoFocus(photo);this.placeFocusedPhoto();
  }
  placeFocusedPhoto(){const photo=this.focused;if(!photo)return;this.refreshPhotoViewport();this.camera.updateMatrixWorld(true);photo.group.position.copy(this.unproject(.5,this.photoViewport.y,8));photo.group.scale.setScalar(this.photoScale(8,this.photoViewport.coverage,photo));photo.group.quaternion.copy(this.camera.quaternion);}
  refreshPhotoViewport(){if(!this.focused)return;const area=this.getPhotoArea();this.photoViewport=area?{y:(area.top+area.bottom)/2/this.height,coverage:Math.max(.1,(area.bottom-area.top)/this.height)}:{y:.53,coverage:.6};}
  stepPhoto(direction){if(!this.photos.length)return;const index=this.photos.indexOf(this.focused);this.focusPhoto(this.photos[(index+direction+this.photos.length)%this.photos.length]);}
  releaseGrab(){if(this.grabbed)this.focusPhoto(this.grabbed);this.grabbed=null;}
  clearFocus(){this.focused=null;this.grabbed=null;this.current.root.visible=true;this.photos.forEach(photo=>{photo.group.visible=true;photo.group.scale.setScalar(this.photos.length>12?.8:1.05);});this.onPhotoFocus(null);}
  photoScale(z,coverage,photo){const distance=this.camera.position.distanceTo(this.controls.target),depth=distance-Math.min(z,distance*.4);return fittedPhotoScale({fov:this.camera.fov,depth,aspect:this.camera.aspect,frameWidth:photo.frameWidth,frameHeight:photo.frameHeight,coverage});}
  addPhoto({texture,name,id,thumbnail,sampleId=null,planeWidth=1.02,planeHeight=1.02,frameWidth=1.16,frameHeight=planeHeight+.22}) {
    const group=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(frameWidth,frameHeight,.055),new THREE.MeshBasicMaterial({color:'#e5dfd4'}));group.add(frame);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(planeWidth,planeHeight),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));face.position.set(0,.04,.032);group.add(face);
    const rng=randomFactory(this.photos.length*97+30),data={group,face,texture,name,id,thumbnail,sampleId,frameWidth,frameHeight,chaos:new THREE.Vector3(...orbitalPosition(rng,this.photos.length,24,{radius:5.8,height:3.2,depth:2.3})),seed:rng()*100};face.userData.photo=data;
    this.photoLayer.add(group);this.photos.push(data);this.photoFaces.push(face);group.position.copy(data.chaos);return data;
  }
  removePhoto(id){const data=this.photos.find(photo=>photo.id===id);if(!data)return;if(this.focused===data||this.grabbed===data)this.clearFocus();this.photoLayer.remove(data.group);data.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});data.texture.dispose();this.photos=this.photos.filter(p=>p!==data);this.photoFaces=this.photoFaces.filter(face=>face!==data.face);}
  makeTrail(){
    const count=700,positions=new Float32Array(count*3),ages=new Float32Array(count),colors=new Float32Array(count*3);positions.fill(1000);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aAge',new THREE.BufferAttribute(ages,1));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime;attribute float aAge;attribute vec3 color;varying float vAlpha;varying vec3 vColor;void main(){float age=uTime-aAge;vec3 p=position;p.y+=age*.15;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.-age/2.)*65./-mv.z,0.,12.);vAlpha=max(0.,1.-age/2.);vColor=color;}`,fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor*1.7,exp(-d*d*4.)*vAlpha);}`});
    this.trail={object:new THREE.Points(geometry,material),geometry,material,positions,ages,colors,index:0,count};this.trail.object.frustumCulled=false;this.scene.add(this.trail.object);
  }
  emitTrail(x,y){const p=this.unproject(x,y,3),trail=this.trail,c=new THREE.Color(this.current.color);for(let j=0;j<7;j++){const i=trail.index++%trail.count;trail.positions.set([p.x+(Math.random()-.5)*.16,p.y+(Math.random()-.5)*.16,p.z+(Math.random()-.5)*.2],i*3);trail.ages[i]=this.trailClock||0;trail.colors.set([c.r,c.g,c.b],i*3);}trail.geometry.attributes.position.needsUpdate=true;trail.geometry.attributes.aAge.needsUpdate=true;trail.geometry.attributes.color.needsUpdate=true;}
  render(time){
    if(this.disposed||this.contextLost)return;
    this.frame=requestAnimationFrame(t=>this.render(t));if(this.mobile&&time-(this.lastRenderedAt||0)<32)return;this.lastRenderedAt=time;const delta=Math.min((time-this.lastTime)/1000,.08);this.lastTime=time;
    if(document.hidden)return;
    this.renderSeconds=(this.renderSeconds||0)+delta;
    if(!this.frozen){this.trailClock=(this.trailClock||0)+delta;if(!this.reducedMotion||this.demo)this.elapsed+=delta;}
    if(this.demo&&this.demoOnce&&this.elapsed-this.demoStart>=18){this.setMorph(0);this.setDemo(false,{completed:true});}
    if(this.demo){const phase=(this.elapsed-this.demoStart)%18,amount=phase<3?0:phase<9?THREE.MathUtils.smoothstep(phase,3,9):phase<12?1:1-THREE.MathUtils.smoothstep(phase,12,18);this.setMorph(amount);this.targetYaw=Math.sin(this.elapsed*.17)*.22;this.targetPitch=Math.sin(this.elapsed*.11)*.05;}
    this.scatter=THREE.MathUtils.damp(this.scatter,this.targetScatter,2.2,delta);this.open=THREE.MathUtils.damp(this.open,this.targetOpen,3,delta);this.yaw=THREE.MathUtils.damp(this.yaw,this.targetYaw,3,delta);this.pitch=THREE.MathUtils.damp(this.pitch,this.targetPitch,3,delta);
    const response=this.resonance.step(delta);
    const portraitShape=this.wasPortrait&&!this.immersive?PORTRAIT_SHAPES[this.current.id]:null,spreadFit=portraitShape?THREE.MathUtils.lerp(1,this.wasCompact?portraitShape.compact:portraitShape.normal,THREE.MathUtils.smoothstep(this.scatter,.15,.85)):1;
    this.reveal=this.reducedMotion&&!this.demo?1:THREE.MathUtils.damp(this.reveal,1,3.4,delta);this.current.root.scale.setScalar(this.current.scale*spreadFit*(.65+this.reveal*.35)*(1+(!this.reducedMotion&&!this.frozen?response*.025:0)));this.current.root.position.y=portraitShape?this.scatter*portraitShape.offset:0;
    this.current.root.rotation.y=this.yaw+(!this.hasHands?Math.sin(this.elapsed*.11)*.09:0)+(1-this.reveal)*.45;this.current.root.rotation.x=this.pitch;
    this.controls.autoRotate=false;this.controls.update();
    const framing=this.wasPortrait?(PORTRAIT_WIDTH[this.current.id]||.62):1;
    this.current.root.visible=!this.focused||Boolean(this.grabbed);
    updateWorld(this.current,this.elapsed,this.scatter,this.open,this.quality,framing,response);this.stars.update(this.elapsed,0);this.stars.quality(this.quality);this.stars.object.rotation.y=this.elapsed*.001;this.atmosphere.update(this.elapsed);this.lightfield.update(this.elapsed,this.scatter,this.quality,framing,this.camera,response);this.responseField.update(this.resonance.age,response,this.reducedMotion,this.camera);
    const fraction=this.current.id==='flower'?(this.open<.99?this.open*.55:.55+this.scatter/.94*.45):this.scatter/.94;this.onMotion({fraction,controlFraction:this.controlFraction,expanded:this.targetScatter>.5,world:this.current.id});
    this.trail.material.uniforms.uTime.value=this.trailClock||0;
    this.current.root.updateMatrixWorld(true);
    this.photos.forEach((photo,index)=>{
      photo.group.visible=!this.focused||photo===this.focused||photo===this.grabbed;
      const target=this.current.photoTarget(index,this.photos.length),loose=photo.chaos.clone();if(this.wasPortrait)target.x*=.8;loose.x*=framing;target.lerp(loose,this.scatter*.9);this.current.root.localToWorld(target);target.y+=Math.sin(this.elapsed*.4+photo.seed)*.06;
      const isGrab=photo===this.grabbed,isFocused=photo===this.focused;
      if(isGrab)target.copy(this.grabPosition);else if(isFocused)target.copy(this.unproject(.5,this.photoViewport.y,8));
      photo.group.position.lerp(target,1-Math.exp(-delta*(isGrab?7:2.8)));if(isFocused)photo.group.quaternion.copy(this.camera.quaternion);else photo.group.lookAt(this.camera.position);
      const scale=isGrab?this.photoScale(4,.37,photo):isFocused?this.photoScale(8,this.photoViewport.coverage,photo):(this.photos.length>12?.8:1.05);photo.group.scale.lerp(new THREE.Vector3(scale,scale,scale),1-Math.exp(-delta*4));if(isGrab)photo.group.rotation.z=this.grabRoll||0;
    });
    this.composer.render();
    if(this.qualityMode==='auto'&&!this.performanceAdjusted&&this.renderSeconds>5){this.performanceFrames++;this.performanceTime+=delta;if(this.performanceTime>4){if(this.performanceFrames/this.performanceTime<27){this.performanceAdjusted=true;this.quality=Math.max(.32,this.quality*.7);this.pixelRatio=Math.max(.85,this.pixelRatio*.8);this.resize();this.composer.render();this.onQuality('adaptive');}this.performanceTime=0;this.performanceFrames=0;}}
  }
  capture(){if(this.contextLost)throw new Error('画面正在恢复，请稍后保存');this.composer.render();return this.renderer.domElement.toDataURL('image/png');}
  dispose(){this.disposed=true;this.removeContextRecovery?.();this.motionQuery.removeEventListener?.('change',this.motionHandler);cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(material=>material.dispose());}});this.environmentTarget.dispose();this.composer.dispose();this.renderer.dispose();}
}
