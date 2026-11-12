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
import {LOOKS,readLook,stageFrame} from './presentation.js';
import {PHOTO_ARRANGEMENTS,photoPosition,photoArrangementScale} from './photo-arrangement.js';
import {FocusResource} from './focus-resource.js';
import {prepareFocusedTexture} from './photos.js';
import {TheaterTimeline} from './theater.js';
import {BLOOMED_FLOWER,FramePacer,handMorph,renderBudget,sculptingPose} from './motion.js';
import {TwoHandZoom} from './gesture-motion.js';
import {createStageLights} from './scene-lighting.js';

const PORTRAIT_SHAPES={heart:{normal:.79,compact:.78,offset:-.5},flower:{normal:.65,compact:.62,offset:-.22},ocean:{normal:.84,compact:.8,offset:.18}};
const PORTRAIT_WIDTH={heart:.76,flower:.82,ocean:.7};

class StageBloom extends UnrealBloomPass {
  setSize(width, height) {
    const scale = this.renderScale ?? 1;
    super.setSize(Math.max(32, width * scale), Math.max(32, height * scale));
  }
}

export class Experience {
  constructor(container, { onReady=()=>{}, onWorld=()=>{}, onPhotoFocus=()=>{}, onPhotoDetail=()=>{}, onQuality=()=>{}, onMotion=()=>{}, onDemo=()=>{},onTheater=()=>{},onInteraction=()=>{},onContext=()=>{},onReducedMotion=()=>{},onResponse=()=>{},getPhotoArea=()=>null,getStageArea=()=>null,motionMode='auto',initialWorld='saturn',look='soft' }={}) {
    Object.assign(this,{container,onReady,onWorld,onPhotoFocus,onPhotoDetail,onQuality,onMotion,onDemo,onTheater,onInteraction,onContext,onReducedMotion,onResponse,getPhotoArea,getStageArea});this.look=readLook(look);this.theater=new TheaterTimeline();
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.motionOverridden=['reduce','full'].includes(motionMode);this.reducedMotion=this.motionOverridden?motionMode==='reduce':this.motionQuery.matches;
    this.motionHandler=()=>{if(!this.motionOverridden)this.setReducedMotion(this.motionQuery.matches);};this.motionQuery.addEventListener?.('change',this.motionHandler);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#060a13');
    this.camera=new THREE.PerspectiveCamera(42,1,.1,150);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.renderer.domElement.setAttribute('aria-label','可拖动、缩放的三维互动场景');this.renderer.domElement.setAttribute('role','img');this.renderer.domElement.tabIndex=0;container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-keyshortcuts','Enter');this.renderer.domElement.setAttribute('aria-description','轻触唤起光波，拖动旋转，滚轮或双指缩放。键盘按回车键也能唤起光波。');
    this.mobile=matchMedia('(pointer:coarse)').matches||innerWidth<760;
    this.qualityMode='auto';this.autoTier=0;this.cameraTier=0;this.cameraActive=false;
    this.budget=renderBudget({mobile:this.mobile,camera:false,mode:'auto',tier:0});this.quality=this.budget.density;
    this.pacer=new FramePacer();this.resetPerformanceWindow();
    this.environmentTarget=studioEnvironment(this.renderer);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;
    this.stageLights=createStageLights(this.scene);
    this.atmosphere=createAtmosphere();this.scene.add(this.atmosphere.mesh);
    this.lightfield=createLightfield();this.scene.add(this.lightfield.root);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enablePan=false;this.controls.enableDamping=true;this.controls.dampingFactor=.055;this.controls.minDistance=10;this.controls.maxDistance=52;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.7;this.controls.autoRotate=false;this.controls.maxPolarAngle=Math.PI*.85;
    this.controls.enableDamping=!this.reducedMotion;this.onReducedMotion(this.reducedMotion);
    this.controls.addEventListener('start',()=>{this.onInteraction();this.setDemo(false);this.zoomDistance=null;});
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new StageBloom(new THREE.Vector2(512,512),.6,.8,1.05);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.worldStore=createWorldStore();this.current=this.getWorld(initialWorld);this.current.root.visible=true;this.setScenePalette(this.current);
    this.stars=makeStarfield();this.scene.add(this.stars.object);
    this.yaw=0;this.pitch=0;this.targetYaw=0;this.targetPitch=0;this.elapsed=0;this.frozen=false;this.sway=1;
    this.photoLayer=new THREE.Group();this.scene.add(this.photoLayer);this.photos=[];this.photoFaces=[];
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.focused=null;
    this.handZoom=new TwoHandZoom();this.cameraOffset=new THREE.Vector3();this.clearHandControl(true);
    this.setMorph(this.current.id==='flower'?BLOOMED_FLOWER:0,{immediate:true});
    this.photoQuality=new FocusResource({load:(photo,signal)=>prepareFocusedTexture(photo.source,signal),apply:(photo,texture)=>{photo.face.material.map=texture;},reset:photo=>{photo.face.material.map=photo.texture;},report:onPhotoDetail});
    this.makeTrail();
    this.resonance=new Resonance();this.responseField=createResponseField();this.scene.add(this.responseField.root);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.reveal=1;
    this.renderer.domElement.addEventListener('dblclick',()=>this.toggleSpread());
    this.activePointers=new Set();
    this.renderer.domElement.addEventListener('pointerdown',event=>{this.activePointers.add(event.pointerId);this.tapStart=this.activePointers.size===1?{id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()}:null;});
    this.renderer.domElement.addEventListener('pointerup',event=>{const start=this.tapStart;this.activePointers.delete(event.pointerId);if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<8&&performance.now()-start.time<500){const x=event.clientX/innerWidth,y=event.clientY/innerHeight;if(!this.pickPhoto(x,y,false))this.pulse(x,y);}this.tapStart=null;});
    this.renderer.domElement.addEventListener('pointermove',event=>{const start=this.tapStart;if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>=8)this.tapStart=null;});
    const cancelTap=event=>{this.activePointers.delete(event.pointerId);if(this.tapStart?.id===event.pointerId)this.tapStart=null;};
    this.renderer.domElement.addEventListener('pointercancel',cancelTap);
    this.renderer.domElement.addEventListener('lostpointercapture',cancelTap);
    this.renderer.domElement.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.onInteraction();this.pulse();}});
    this.removeContextRecovery=bindContextRecovery(this.renderer.domElement,{pause:()=>{this.contextLost=true;cancelAnimationFrame(this.frame);this.setDemo(false);this.onContext('lost');},rebuild:()=>this.restoreGraphics(),resume:()=>{this.contextLost=false;this.resumeRendering();},onState:(state)=>{if(state!=='lost')this.onContext(state);}});
    this.ready=this.prepareCurrentWorld().then(()=>{if(this.disposed)return;this.prepared=true;this.resumeRendering();this.onReducedMotion(this.reducedMotion);this.onReady();});
  }
  resumeRendering(){if(this.disposed||this.contextLost||!this.prepared)return;cancelAnimationFrame(this.frame);this.pacer.reset();this.resetPerformanceWindow();this.frame=requestAnimationFrame(time=>this.render(time));}
  getWorld(id){const world=this.worldStore.get(id);if(!world.root.parent){world.root.visible=false;this.scene.add(world.root);}return world;}
  setScenePalette(world){
    this.scene.background.set(world.bg);this.atmosphere.setWorld(world);this.lightfield.setWorld(world);
    const [strength,threshold]=this.stageLights.setWorld(world.id);
    this.baseBloom=strength;this.bloom.threshold=threshold;this.setLook(this.look);
  }
  setLook(value){this.look=readLook(value);const look=LOOKS[this.look];this.renderer.toneMappingExposure=look.exposure;this.bloom.strength=(this.baseBloom||.58)*look.bloom;this.atmosphere.setLook(look.atmosphere);}
  setPhotoArrangement(value){this.photoArrangement=Object.prototype.hasOwnProperty.call(PHOTO_ARRANGEMENTS,value)?value:'world';}
  async prepareCurrentWorld(){
    this.current.root.scale.setScalar(this.current.scale);updateWorld(this.current,0,this.scatter,this.open,this.quality,1);
    if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
    if(!this.disposed)this.composer.render();
  }
  setStudio(active) {
    this.studio = active;
    this.handZoom.reset();this.zoomDistance=null;
    this.resize();
  }
  resize() {
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    if (w !== this.width || h !== this.height) { this.handZoom.reset();this.palmAnchor=null;this.zoomDistance=null; }
    this.width=w;this.height=h;const portrait=w<=900&&h>w,shortLandscape=h<560&&w>h,compact=portrait&&h<730;
    this.camera.aspect=w/h;
    const previousDistance = this.homeDistance;
    const studio = Boolean(this.studio);
    const frame=stageFrame({width:w,height:h,area:this.getStageArea(),world:this.current.id,immersive:this.immersive||this.theater.active||studio});this.homeDistance=frame.distance;
    if(!this.wasSized||portrait!==this.wasPortrait||compact!==this.wasCompact||shortLandscape!==this.wasShortLandscape||this.immersive!==this.wasImmersive){this.camera.position.set(0,portrait?3.1:2.3,this.homeDistance);this.controls.target.set(0,0,0);this.controls.update();this.wasSized=true;this.wasPortrait=portrait;this.wasCompact=compact;this.wasShortLandscape=shortLandscape;this.wasImmersive=this.immersive;}
    else if (studio !== this.wasStudio) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const distance = offset.length() * frame.distance / previousDistance;
      offset.setLength(THREE.MathUtils.clamp(distance, this.controls.minDistance, this.controls.maxDistance));
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
    this.wasStudio = studio;
    this.camera.setViewOffset(w,h,frame.offsetX,frame.offsetY,w,h);this.camera.updateProjectionMatrix();
    const tier=this.cameraActive?Math.max(this.autoTier,this.cameraTier):this.autoTier;
    const budget=renderBudget({mobile:this.mobile,camera:this.cameraActive,mode:this.qualityMode,tier});
    const pixelRatio=cappedPixelRatio(w,h,Math.min(devicePixelRatio||1,budget.ratio),budget.pixels);
    // Keep the visible canvas mounted at a stable size when auto quality
    // changes. Only its internal render target needs to become smaller.
    const base=renderBudget({mobile:this.mobile,camera:false,mode:this.qualityMode,tier:0});
    const canvasRatio=cappedPixelRatio(w,h,Math.min(devicePixelRatio||1,base.ratio),base.pixels);
    const bloomChanged=this.bloom.renderScale!==budget.bloom;
    this.budget=budget;this.quality=budget.density;this.bloom.renderScale=budget.bloom;
    if(w!==this.bufferWidth||h!==this.bufferHeight||canvasRatio!==this.canvasRatio){
      if(canvasRatio!==this.canvasRatio)this.renderer.setPixelRatio(canvasRatio);
      this.renderer.setSize(w,h);
      this.canvasRatio=canvasRatio;
    }
    if(w!==this.bufferWidth||h!==this.bufferHeight||pixelRatio!==this.bufferRatio){
      if(pixelRatio!==this.bufferRatio)this.composer.setPixelRatio(pixelRatio);
      if(w!==this.bufferWidth||h!==this.bufferHeight)this.composer.setSize(w,h);
      this.bufferWidth=w;this.bufferHeight=h;this.bufferRatio=pixelRatio;
    }else if(bloomChanged){
      this.bloom.setSize(w*pixelRatio,h*pixelRatio);
    }
    this.atmosphere.resize(w,h,frame);this.placeFocusedPhoto();
  }
  setWorld(id,{theater=false}={}) {
    if(!theater)this.stopTheater();
    if(id===this.current.id||!WORLD_INFO.some(world=>world.id===id))return;if(this.focused||this.grabbed)this.clearFocus();const next=this.getWorld(id);
    this.resonance.reset();this.responseField.root.visible=false;
    this.current.root.visible=false;this.current=next;this.current.root.visible=true;this.reveal=0;this.setScenePalette(next);
    this.setMorph(next.id==='flower'?BLOOMED_FLOWER:0,{immediate:true});
    this.yaw=this.pitch=this.targetYaw=this.targetPitch=0;this.clearHandControl(true);
    this.onPhotoFocus(null);this.onWorld(next);this.resetPerformanceWindow();
    this.wasSized=false;this.resize();
  }
  nextWorld(){const index=WORLD_INFO.findIndex(world=>world.id===this.current.id);this.setWorld(WORLD_INFO[(index+1)%WORLD_INFO.length].id);}
  setDemo(active,{once=false,completed=false}={}){this.stopTheater();const changed=Boolean(this.demo)!==active;this.demo=active;this.demoOnce=active&&once;if(active){this.demoStart=this.elapsed;this.frozen=false;this.clearFocus();}if(changed)this.onDemo(active,{once,completed});}
  applyTheaterFrame(frame,snap=false){if(this.current.id!==frame.world)this.setWorld(frame.world,{theater:true});this.setMorph(frame.morph,{immediate:snap});this.targetYaw=frame.yaw;this.targetPitch=frame.pitch;if(snap){this.reveal=1;this.yaw=frame.yaw;this.pitch=frame.pitch;}}
  startTheater(index=0){this.setDemo(false);this.clearFocus();this.frozen=false;this.photoLayer.visible=false;const frame=this.theater.start(index);this.onTheater(frame);this.applyTheaterFrame(frame,true);this.wasSized=false;this.resize();}
  pauseTheater(value){if(!this.theater.active)return;this.onTheater(this.theater.pause(value));}
  seekTheater(index){if(!this.theater.active)return;const frame=this.theater.seek(index);this.applyTheaterFrame(frame,true);this.onTheater(frame);}
  stopTheater({completed=false}={}){if(!this.theater.active)return;const frame=this.theater.stop();this.photoLayer.visible=true;this.onTheater({...frame,completed});this.wasSized=false;this.resize();}
  setReducedMotion(reduce){this.reducedMotion=reduce;this.controls.enableDamping=!reduce;if(reduce)this.setDemo(false);this.onReducedMotion(reduce);}
  async restoreGraphics(){
    this.environmentTarget.dispose();this.environmentTarget=studioEnvironment(this.renderer);this.environment=this.environmentTarget.texture;this.scene.environment=this.environment;
    this.composer.reset();this.resize();
    if(this.renderer.compileAsync)await this.renderer.compileAsync(this.scene,this.camera);
    if(this.disposed)throw new Error('画面已关闭');
    this.composer.render();
  }
  isExpanded(){return this.controlFraction>(this.current.id==='flower'?.76:.53);}
  toggleSpread(){const expanded=!this.isExpanded();this.setMorph(expanded?1:0);return expanded;}
  updateSculptingPose(){
    const {scatter,open}=sculptingPose(this.current.id,this.morphFraction);
    this.scatter=scatter;this.open=open;
  }
  setMorph(value,{immediate=false,respond=false}={}){
    this.controlFraction=THREE.MathUtils.clamp(value,0,1);
    if(immediate){this.morphFraction=this.controlFraction;this.updateSculptingPose();}
    if(respond)this.pulse();
  }
  pulse(x,y){if(!this.prepared||this.contextLost||!this.resonance.trigger(performance.now()))return false;this.showResponse(x,y);return true;}
  showResponse(x,y){if(x===undefined||y===undefined){const p=this.controls.target.clone().project(this.camera);x=(p.x+1)/2;y=(1-p.y)/2;}this.responseField.fire(this.unproject(x,y,1),this.current.color);this.onResponse(this.current);}
  toggleFreeze(){this.frozen=!this.frozen;return this.frozen;}
  resetPerformanceWindow(){this.performanceFrames=0;this.performanceMs=0;}
  setQuality(mode){
    this.qualityMode=mode;this.autoTier=this.cameraTier=0;this.reportedAdaptive=false;
    this.resetPerformanceWindow();this.resize();this.onQuality(mode);
  }
  setCameraActive(active){
    if(this.cameraActive===active)return;
    this.cameraActive=active;this.cameraTier=0;this.resetPerformanceWindow();this.resize();
  }
  adaptRendering(elapsed){
    if(this.qualityMode!=='auto')return;
    const field=this.cameraActive?'cameraTier':'autoTier';
    const tier=Math.max(this.autoTier,this.cameraActive?this.cameraTier:0),limit=this.mobile?2:1;
    if(tier>=limit)return;
    this.performanceFrames++;this.performanceMs+=Math.min(120,elapsed);
    if(this.performanceMs<3400)return;
    const fps=this.performanceFrames*1000/this.performanceMs;
    this.resetPerformanceWindow();
    if(fps>=this.budget.rate*.79)return;
    this[field]=tier+1;this.resize();
    if(!this.reportedAdaptive){this.reportedAdaptive=true;this.onQuality('adaptive');}
  }
  resetView(){
    this.setDemo(false);this.clearFocus();this.clearHandControl(true);
    this.setMorph(this.current.id==='flower'?BLOOMED_FLOWER:0);
    this.targetYaw=0;this.targetPitch=0;this.frozen=false;this.wasSized=false;this.resize();
  }
  clearHandControl(stopZoom=false){
    this.hasHands=false;this.handZoom.reset();this.palmAnchor=null;this.lastPinch=false;
    this.grabbed=null;this.dragStart=null;this.trailPoint=null;
    if(stopZoom)this.zoomDistance=null;
  }
  processHands(hands,time,{stale=false}={}) {
    if(stale)return;
    if(!hands.length){this.clearHandControl();return;}
    this.hasHands=true;
    const hand=hands[0];
    if(hands.length>1){
      this.palmAnchor=null;this.trailPoint=null;this.grabbed=null;this.lastPinch=false;this.dragStart=null;
      const distance=Math.hypot(hand.x-hands[1].x,hand.y-hands[1].y);
      this.zoomDistance=this.handZoom.target(distance,this.camera.position.distanceTo(this.controls.target),this.controls.minDistance,this.controls.maxDistance);
      return;
    }
    this.handZoom.reset();
    if(hand.pose==='palm'||hand.pose==='fist'){
      if(this.resonance.observe(hand.openness,time))this.showResponse(hand.x,hand.y);
      this.setMorph(handMorph(this.current.id,hand.openness));
      this.palmAnchor??={x:hand.x,y:hand.y,yaw:this.targetYaw,pitch:this.targetPitch};
      const anchor=this.palmAnchor;
      this.targetYaw=anchor.yaw+THREE.MathUtils.clamp((hand.x-anchor.x)*2.8,-1.1,1.1);
      this.targetPitch=THREE.MathUtils.clamp(anchor.pitch+(hand.y-anchor.y)*1.4,-.75,.75);
    }else{
      this.palmAnchor=null;
    }
    if(hand.pose==='point')this.drawHandTrail(hand.pointer,time);
    else this.trailPoint=null;
    if(hand.pinch){
      if(!this.lastPinch){
        const picked=this.pickPhoto(hand.grab.x,hand.grab.y,true);
        this.dragStart=picked?null:{x:hand.grab.x,y:hand.grab.y,yaw:this.targetYaw,pitch:this.targetPitch};
      }
      if(this.grabbed){this.grabPosition=this.unproject(hand.grab.x,hand.grab.y,4);this.grabRoll=THREE.MathUtils.clamp(hand.roll,-.6,.6);}
      else if(this.dragStart){this.targetYaw=this.dragStart.yaw+(hand.grab.x-this.dragStart.x)*3;this.targetPitch=THREE.MathUtils.clamp(this.dragStart.pitch+(hand.grab.y-this.dragStart.y)*1.6,-.75,.75);}
    }else if(this.lastPinch){this.releaseGrab();this.dragStart=null;}
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
    this.focused=photo;this.grabbed=null;this.controls.enabled=false;this.current.root.visible=false;this.photos.forEach(item=>item.group.visible=item===photo);this.onPhotoFocus(photo);this.placeFocusedPhoto();this.photoQuality.select(photo);
  }
  placeFocusedPhoto(){const photo=this.focused;if(!photo)return;this.refreshPhotoViewport();this.camera.updateMatrixWorld(true);photo.group.position.copy(this.unproject(.5,this.photoViewport.y,8));photo.group.scale.setScalar(this.photoScale(8,this.photoViewport.coverage,photo));photo.group.quaternion.copy(this.camera.quaternion);}
  refreshPhotoViewport(){if(!this.focused)return;const area=this.getPhotoArea();this.photoViewport=area?{y:(area.top+area.bottom)/2/this.height,coverage:Math.max(.1,(area.bottom-area.top)/this.height)}:{y:.53,coverage:.6};}
  stepPhoto(direction){if(!this.photos.length)return;const index=this.photos.indexOf(this.focused);this.focusPhoto(this.photos[(index+direction+this.photos.length)%this.photos.length]);}
  releaseGrab(){if(this.grabbed)this.focusPhoto(this.grabbed);this.grabbed=null;}
  clearFocus(){this.photoQuality.clear();this.controls.enabled=true;this.focused=null;this.grabbed=null;this.current.root.visible=true;this.photos.forEach(photo=>{photo.group.visible=true;photo.group.scale.setScalar(photoArrangementScale(this.photoArrangement,this.photos.length));});this.onPhotoFocus(null);}
  photoScale(z,coverage,photo){const distance=this.camera.position.distanceTo(this.controls.target),depth=distance-Math.min(z,distance*.4);return fittedPhotoScale({fov:this.camera.fov,depth,aspect:this.camera.aspect,frameWidth:photo.frameWidth,frameHeight:photo.frameHeight,coverage});}
  addPhoto({texture,name,id,thumbnail,source=null,sampleId=null,planeWidth=1.02,planeHeight=1.02,frameWidth=1.16,frameHeight=planeHeight+.22}) {
    const group=new THREE.Group(),frame=new THREE.Mesh(new THREE.BoxGeometry(frameWidth,frameHeight,.055),new THREE.MeshBasicMaterial({color:'#e5dfd4'}));group.add(frame);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(planeWidth,planeHeight),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));face.position.set(0,.04,.032);group.add(face);
    const rng=randomFactory(this.photos.length*97+30),data={group,face,texture,name,id,thumbnail,source,sampleId,frameWidth,frameHeight,chaos:new THREE.Vector3(...orbitalPosition(rng,this.photos.length,24,{radius:5.8,height:3.2,depth:2.3})),seed:rng()*100};face.userData.photo=data;
    this.photoLayer.add(group);this.photos.push(data);this.photoFaces.push(face);group.position.copy(data.chaos);return data;
  }
  removePhoto(id){const data=this.photos.find(photo=>photo.id===id);if(!data)return;if(this.focused===data||this.grabbed===data)this.clearFocus();this.photoLayer.remove(data.group);data.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});data.texture.dispose();this.photos=this.photos.filter(p=>p!==data);this.photoFaces=this.photoFaces.filter(face=>face!==data.face);}
  makeTrail(){
    const count=700,positions=new Float32Array(count*3),ages=new Float32Array(count),colors=new Float32Array(count*3);positions.fill(1000);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aAge',new THREE.BufferAttribute(ages,1));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:`uniform float uTime;attribute float aAge;attribute vec3 color;varying float vAlpha;varying vec3 vColor;void main(){float age=uTime-aAge;vec3 p=position;p.y+=age*.15;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.-age/2.)*65./-mv.z,0.,12.);vAlpha=max(0.,1.-age/2.);vColor=color;}`,fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor*1.7,exp(-d*d*4.)*vAlpha);}`});
    this.trail={object:new THREE.Points(geometry,material),geometry,material,positions,ages,colors,index:0,count};this.trail.object.frustumCulled=false;this.scene.add(this.trail.object);
  }
  drawHandTrail(point,time){
    const previous=this.trailPoint;
    const distance=previous?Math.hypot(point.x-previous.x,point.y-previous.y):0;
    if(previous&&distance<.005)return;
    const connect=previous&&time-previous.time<210&&distance<.25;
    const steps=connect?Math.min(7,Math.ceil(distance/.018)):1;
    const trail=this.trail,c=new THREE.Color(this.current.color);
    for(let step=1;step<=steps;step++){
      const x=connect?THREE.MathUtils.lerp(previous.x,point.x,step/steps):point.x;
      const y=connect?THREE.MathUtils.lerp(previous.y,point.y,step/steps):point.y;
      const p=this.unproject(x,y,3);
      for(let j=0;j<4;j++){
        const i=trail.index++%trail.count,k=i*3;
        trail.positions[k]=p.x+(Math.random()-.5)*.12;
        trail.positions[k+1]=p.y+(Math.random()-.5)*.12;
        trail.positions[k+2]=p.z+(Math.random()-.5)*.16;
        trail.ages[i]=this.trailClock||0;
        trail.colors[k]=c.r;trail.colors[k+1]=c.g;trail.colors[k+2]=c.b;
      }
    }
    trail.geometry.attributes.position.needsUpdate=true;
    trail.geometry.attributes.aAge.needsUpdate=true;
    trail.geometry.attributes.color.needsUpdate=true;
    this.trailPoint={...point,time};
  }
  render(time){
    if(this.disposed||this.contextLost)return;
    this.frame=requestAnimationFrame(t=>this.render(t));
    if(document.hidden){if(this.theater.active&&!this.theater.paused)this.pauseTheater(true);this.pacer.reset();this.resetPerformanceWindow();return;}
    const elapsed=this.pacer.take(time,this.budget.rate);
    if(elapsed===null)return;
    this.adaptRendering(elapsed);
    const delta=Math.min(elapsed/1000,.08);
    const theaterPaused=this.theater.active&&this.theater.paused;
    if(!this.frozen&&!theaterPaused){this.trailClock=(this.trailClock||0)+delta;if(!this.reducedMotion||this.demo||this.theater.active)this.elapsed+=delta;}
    if(this.theater.active){const frame=this.theater.advance(delta);if(frame.finished){this.setMorph(0,{immediate:true});this.stopTheater({completed:true});}else{this.applyTheaterFrame(frame);this.onTheater(frame);}}
    if(this.demo&&this.demoOnce&&this.elapsed-this.demoStart>=18){this.setMorph(0);this.setDemo(false,{completed:true});}
    if(this.demo){const phase=(this.elapsed-this.demoStart)%18,amount=phase<3?0:phase<9?THREE.MathUtils.smoothstep(phase,3,9):phase<12?1:1-THREE.MathUtils.smoothstep(phase,12,18);this.setMorph(amount);this.targetYaw=Math.sin(this.elapsed*.17)*.22;this.targetPitch=Math.sin(this.elapsed*.11)*.05;}
    const motionDelta=theaterPaused?0:delta;
    const immediate=this.reducedMotion&&!this.theater.active&&!this.demo;
    const nextMorph=immediate?this.controlFraction:THREE.MathUtils.damp(this.morphFraction,this.controlFraction,this.cameraActive?6.8:5.5,motionDelta);
    this.morphFraction=Math.abs(nextMorph-this.controlFraction)<.0005?this.controlFraction:nextMorph;
    this.updateSculptingPose();
    this.yaw=immediate?this.targetYaw:THREE.MathUtils.damp(this.yaw,this.targetYaw,7,motionDelta);
    this.pitch=immediate?this.targetPitch:THREE.MathUtils.damp(this.pitch,this.targetPitch,7,motionDelta);
    this.sway=immediate?0:THREE.MathUtils.damp(this.sway,this.hasHands?0:1,5,motionDelta);
    const response=this.resonance.step(delta);
    const portraitShape=this.wasPortrait&&!this.immersive?PORTRAIT_SHAPES[this.current.id]:null,spreadFit=portraitShape?THREE.MathUtils.lerp(1,this.wasCompact?portraitShape.compact:portraitShape.normal,THREE.MathUtils.smoothstep(this.scatter,.15,.85)):1;
    this.reveal=immediate?1:THREE.MathUtils.damp(this.reveal,1,5,motionDelta);this.current.root.scale.setScalar(this.current.scale*spreadFit*(.82+this.reveal*.18)*(1+(!this.reducedMotion&&!this.frozen?response*.025:0)));this.current.root.position.y=portraitShape?this.scatter*portraitShape.offset:0;
    this.current.root.rotation.y=this.yaw+this.sway*Math.sin(this.elapsed*.11)*.08+(1-this.reveal)*.24;this.current.root.rotation.x=this.pitch;
    if(this.zoomDistance!==null){
      const offset=this.cameraOffset.subVectors(this.camera.position,this.controls.target);
      const distance=immediate?this.zoomDistance:THREE.MathUtils.damp(offset.length(),this.zoomDistance,8,motionDelta);
      this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
    }
    this.controls.dampingFactor=1-Math.exp(-delta*(this.mobile?8.2:5.6));
    this.controls.update();
    const framing=this.wasPortrait?(PORTRAIT_WIDTH[this.current.id]||.62):1;
    this.current.root.visible=!this.focused||Boolean(this.grabbed);
    this.current.body.visible=this.theater.active||!(this.photoArrangement==='wall'&&this.photos.length);
    updateWorld(this.current,this.elapsed,this.scatter,this.open,this.quality,framing,response);this.stars.update(this.elapsed,0);this.stars.quality(this.quality);this.stars.object.rotation.y=this.elapsed*.001;this.atmosphere.update(this.elapsed);this.lightfield.update(this.elapsed,this.scatter,this.quality,framing,this.camera,response,delta);this.responseField.update(this.resonance.age,response,this.reducedMotion,this.camera);
    this.onMotion({fraction:this.morphFraction,controlFraction:this.controlFraction,expanded:this.isExpanded(),world:this.current.id});
    this.trail.material.uniforms.uTime.value=this.trailClock||0;
    this.current.root.updateMatrixWorld(true);
    this.photos.forEach((photo,index)=>{
      photo.group.visible=!this.focused||photo===this.focused||photo===this.grabbed;
      const arranged=photoPosition(this.photoArrangement||'world',index,this.photos.length),target=arranged?new THREE.Vector3(...arranged):this.current.photoTarget(index,this.photos.length),loose=photo.chaos.clone();if(this.wasPortrait)target.x*=.8;loose.x*=framing;target.lerp(loose,this.scatter*.9);this.current.root.localToWorld(target);target.y+=Math.sin(this.elapsed*.4+photo.seed)*.06;
      const isGrab=photo===this.grabbed,isFocused=photo===this.focused;
      if(isGrab)target.copy(this.grabPosition);else if(isFocused)target.copy(this.unproject(.5,this.photoViewport.y,8));
      photo.group.position.lerp(target,1-Math.exp(-delta*(isGrab?7:2.8)));if(isFocused)photo.group.quaternion.copy(this.camera.quaternion);else photo.group.lookAt(this.camera.position);
      const scale=isGrab?this.photoScale(4,.37,photo):isFocused?this.photoScale(8,this.photoViewport.coverage,photo):photoArrangementScale(this.photoArrangement,this.photos.length);
      photo.group.scale.setScalar(THREE.MathUtils.damp(photo.group.scale.x,scale,6,delta));if(isGrab)photo.group.rotation.z=this.grabRoll||0;
    });
    this.composer.render();
  }
  capture(format='png'){if(this.contextLost)throw new Error('画面正在恢复，请稍后保存');this.composer.render();return this.renderer.domElement.toDataURL(format==='webp'?'image/webp':'image/png',.9);}
  dispose(){this.disposed=true;this.photoQuality.clear();this.removeContextRecovery?.();this.motionQuery.removeEventListener?.('change',this.motionHandler);cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(material=>material.dispose());}});this.atmosphere.dispose();this.environmentTarget.dispose();this.bloom.dispose();this.composer.dispose();this.renderer.dispose();}
}
