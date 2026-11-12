import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSwarm } from './swarm.js';
import { heartSurface, crystalHeart, pineBranches, pineRadius, petalTexture, orbitLines } from './sculptures.js';
import { jellyModel as detailedJelly } from './jelly.js';
import {heartCloud,galaxyArm,oceanCurrent} from './scene-layout.js';
import {LazyWorldStore} from './world-store.js';
import {createScenicDetails} from './scenic-details.js';
import {cloudBands,planetaryRings} from './planet.js';

const TAU = Math.PI * 2;
export const WORLD_INFO = [
  { id:'saturn', name:'星际引力', en:'CELESTIAL ORBIT', label:'星环', title:'把宇宙，\n握在掌间。', description:'张开手掌，让一颗星球化作漫游的星系。', color:'#edcc9f', bg:'#080b17', number:'01' },
  { id:'heart', name:'心动星团', en:'A LITTLE INFINITY', label:'爱心', title:'让心动，\n有迹可循。', description:'握紧是一颗心，松开是漫天的小小心动。', color:'#f4b0d3', bg:'#140c21', number:'02' },
  { id:'tree', name:'记忆之树', en:'THE MEMORY TREE', label:'圣诞树', title:'每个瞬间，\n都在发光。', description:'星光、照片与金色雪花，聚成你的记忆。', color:'#dfca91', bg:'#071813', number:'03' },
  { id:'flower', name:'光之花园', en:'THE ART OF BLOOM', label:'花朵', title:'指尖松开，\n万物盛放。', description:'一朵柔光花，随手舒展，也能化作漫天花瓣。', color:'#e9b8e0', bg:'#160e24', number:'04' },
  { id:'ocean', name:'微光深海', en:'BENEATH THE SILENCE', label:'水母', title:'潜入一片，\n发光的宁静。', description:'让水母与微光，跟随你的手缓缓游动。', color:'#99e6e2', bg:'#061422', number:'05' },
];

export function randomFactory(seed=18) { return () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function color(value) { return new THREE.Color(value); }
function glowTexture() {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.13,'rgba(255,255,255,.7)');g.addColorStop(.4,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
const pointVertex = `
uniform float uTime; uniform float uScatter; uniform float uSize;
attribute vec3 aChaos; attribute vec3 aColor; attribute float aSize; attribute float aPhase;
varying vec3 vColor; varying float vAlpha;
void main(){
 float t=uScatter*uScatter*(3.0-2.0*uScatter);
 vec3 p=mix(position,aChaos,t);
 p+=vec3(sin(uTime*.35+aPhase),cos(uTime*.28+aPhase*1.7),sin(uTime*.31+aPhase*.7))*(.02+t*.36);
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv; gl_PointSize=clamp(uSize*aSize*700.0/-mv.z,.35,10.0);
 vColor=aColor;vAlpha=.65+.35*sin(aPhase+uTime*.65);
}`;
const pointFragment = `
uniform float uOpacity;varying vec3 vColor; varying float vAlpha;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float d=dot(q,q);if(d>1.0)discard;float a=exp(-d*4.8)*vAlpha*uOpacity;gl_FragColor=vec4(vColor*(1.0+exp(-d*30.0)*.45),a);}`;

export class ParticleField {
  constructor(count, shape, palette, {size=.065,brightness=1,seed=48}={}) {
    const rng=randomFactory(seed),positions=new Float32Array(count*3),chaos=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),phases=new Float32Array(count);
    const hues=palette.map(color);
    for(let i=0;i<count;i++){
      const p=shape(rng,i,count);positions.set(p,i*3);
      const theta=rng()*TAU,v=rng()*2-1,r=3+Math.pow(rng(),.5)*5,ring=Math.sqrt(1-v*v);
      chaos.set([Math.cos(theta)*ring*r,v*r*.55,Math.sin(theta)*ring*r*.45],i*3);
      const c=hues[Math.floor(rng()*hues.length)].clone().multiplyScalar(brightness*(.55+rng()*.9));colors.set([c.r,c.g,c.b],i*3);
      sizes[i]=.45+rng()*1.35;phases[i]=rng()*100;
    }
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('aChaos',new THREE.BufferAttribute(chaos,3));this.geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));this.geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));this.geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
    this.material=new THREE.ShaderMaterial({vertexShader:pointVertex,fragmentShader:pointFragment,uniforms:{uTime:{value:0},uScatter:{value:0},uSize:{value:size},uOpacity:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    this.object=new THREE.Points(this.geometry,this.material);this.object.frustumCulled=false;this.count=count;
  }
  update(time,scatter){this.material.uniforms.uTime.value=time;this.material.uniforms.uScatter.value=scatter;}
  quality(factor){this.geometry.setDrawRange(0,Math.min(this.count,Math.max(40,Math.round(this.count*factor))));}
}

function atmosphere(radius, tint, intensity=.55) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius,64,32),new THREE.ShaderMaterial({
    uniforms:{uColor:{value:color(tint)},uIntensity:{value:intensity}},side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uColor;uniform float uIntensity;varying vec3 vNormal;varying vec3 vPosition;void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(uColor,f*uIntensity);}`,
  }));
}
function nebula(root, tint, texture, position, scale, opacity=.1) {const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:tint,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sprite.position.set(...position);sprite.scale.set(scale,scale,1);root.add(sprite);return sprite;}
function baseWorld(info, texture) {
  const root=new THREE.Group(),body=new THREE.Group(),details=createScenicDetails(info.id);root.add(body,details.root);
  return { ...info,root,body,details,fields:[],objects:[],animated:[],texture,phase:0,scale:1,photoTarget:(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.6,Math.sin(a)*3.1,Math.sin(a*2)*1.8);}, update:null };
}
function addField(world, field, parent=world.body) {world.fields.push(field);parent.add(field.object);return field;}
function remember(world, mesh) {world.objects.push({mesh,position:mesh.position.clone(),scale:mesh.scale.clone(),rotation:mesh.rotation.clone()});return mesh;}

function createSaturn(info, texture) {
  const world=baseWorld(info,texture),planet=new THREE.Group();planet.rotation.set(.28,0,.34);world.body.add(planet);
  const map=cloudBands();
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(2.13,96,56),new THREE.MeshStandardMaterial({map,roughness:.82,metalness:.04,envMapIntensity:.16,transparent:true}));planet.add(sphere);
  const halo=atmosphere(2.19,'#bacdf4',.42);planet.add(halo);
  const rings=planetaryRings();planet.add(rings.mesh);
  const field=addField(world,new ParticleField(13000,(r)=>{const a=r()*TAU,rad=2.83+r()*2.6;return [Math.cos(a)*rad,(r()-.5)*.025,Math.sin(a)*rad];},['#bda47c','#bcb4a0','#8a7961'],{size:.016,brightness:.45}),planet);
  field.object.rotation.x=0;
  const orbitDust=addField(world,new ParticleField(2800,(r)=>{const rad=6+Math.pow(r(),.5)*5,a=r()*TAU;return [Math.cos(a)*rad,(r()-.5)*.8,Math.sin(a)*rad];},['#99a8ba','#6c76a0','#a58d70'],{size:.025,brightness:.32,seed:26}));orbitDust.object.rotation.set(.14,.2,.2);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.26,32,20),new THREE.MeshStandardMaterial({color:'#6e7784',roughness:.95,envMapIntensity:.08}));moon.position.set(5.9,1.3,-5.4);world.body.add(moon);remember(world,moon);
  const littlePlanets=createSwarm({geometry:new THREE.SphereGeometry(1,24,16),material:new THREE.MeshStandardMaterial({map,roughness:.72,metalness:.08,envMapIntensity:.2}),count:76,random:randomFactory(818),target:r=>{const a=r()*TAU,rad=r()<.55?1.3+r()*1.1:3+r()*2.2;return[Math.cos(a)*rad,(r()-.5)*1.8,Math.sin(a)*rad];},palette:['#d1b18c','#929eac','#b89d9e'],size:.21,spin:.14,destination:galaxyArm});
  const littleRings=new THREE.InstancedMesh(new THREE.RingGeometry(1.38,2.2,48).rotateX(-1.12).rotateZ(.28),new THREE.MeshStandardMaterial({color:'#b19b77',roughness:.65,metalness:.2,side:THREE.DoubleSide}),76);littleRings.frustumCulled=false;littleRings.instanceMatrix=littlePlanets.mesh.instanceMatrix;world.body.add(littlePlanets.mesh,littleRings);
  const orbits=orbitLines();world.body.add(orbits.group);
  nebula(world.root,'#334a8c',texture,[-4,1,-7],22,.14);nebula(world.root,'#855d91',texture,[9,-2,-13],24,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU+.15;return new THREE.Vector3(Math.cos(a)*6.2,Math.sin(a)*2.6,Math.sin(a)*3.1);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.13,.7);
    planet.rotation.y=Math.sin(time*.12)*.13;sphere.rotation.y=time*.04;moon.position.set(4.6+Math.cos(time*.025)*.8,1.8,-5.8+Math.sin(time*.025)*.8);
    sphere.material.opacity=1-dissolve;sphere.visible=dissolve<.995;halo.material.uniforms.uIntensity.value=.42*(1-dissolve);halo.visible=sphere.visible;
    rings.update(world.root,planet,1-dissolve);planet.scale.setScalar(1-dissolve*.12);field.material.uniforms.uOpacity.value=1-scatter*.94;
    littlePlanets.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.12,.85),framing);littleRings.visible=littlePlanets.mesh.visible;littleRings.count=littlePlanets.mesh.count;orbits.group.scale.x=framing;orbits.update(scatter,time);
  };
  return world;
}

function roundedHeartGeometry(segments=144,rings=36,depth=1.8){
  const positions=[],indices=[],height=rings*2;
  // Solve the implicit heart surface along rays. This gives rounded lobes
  // on every side, rather than adding depth to a flat heart outline.
  for(let j=0;j<=height;j++)for(let i=0;i<=segments;i++){
    positions.push(...heartSurface(j/height*Math.PI,i/segments*TAU,depth));
  }
  const stride=segments+1;
  for(let j=0;j<height;j++)for(let i=0;i<segments;i++){const a=j*stride+i,b=a+stride;indices.push(a,a+1,b,b,a+1,b+1);}
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);const welded=mergeVertices(geometry);geometry.dispose();geometry=welded;geometry.computeVertexNormals();return geometry;
}
function createHeart(info,texture) {
  const world=baseWorld(info,texture);
  const geometry=roundedHeartGeometry();
  const sculpture=crystalHeart(geometry),heart=sculpture.root;heart.rotation.y=-.18;world.body.add(heart);
  const heartVolume=r=>{const p=heartSurface(Math.acos(r()*2-1),r()*TAU),k=Math.pow(r(),1/3);return p.map((v,i)=>i===1?(v+.35)*k-.35:v*k);};
  const hearts=createSwarm({geometry:roundedHeartGeometry(20,7),material:new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:.3,roughness:.25,clearcoat:.7,iridescence:.24,envMapIntensity:1.04}),count:440,random:randomFactory(735),target:heartVolume,palette:['#e993bc','#ba4a80','#f3c9d8','#a688d4'],size:.073,spin:.13,destination:heartCloud});
  world.body.add(hearts.mesh);
  const sparkles=addField(world,new ParticleField(1800,r=>{const p=heartSurface(Math.acos(r()*2-1),r()*TAU),scale=1.015+r()*.05;return p.map(v=>v*scale);},['#f2bad5','#d3b0ed','#f0d4b9'],{size:.018,brightness:.55}),heart);
  const halo=nebula(world.body,'#bc417b',texture,[0,.2,-1],10,.1);remember(world,halo);
  nebula(world.root,'#713468',texture,[5,0,-9],24,.13);nebula(world.root,'#50357a',texture,[-8,-4,-12],22,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.1,Math.sin(a)*3.8+.3,Math.sin(a*2)*1.5+1);};
  world.update=(time,scatter,openness,quality,framing,response=0)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.16,.7),beat=1+Math.sin(time*1.8)*.009;
    heart.rotation.y=-.2+Math.sin(time*.19)*.11;heart.scale.setScalar(beat*(1-dissolve*.06));
    sculpture.update(time,1-dissolve,response);heart.visible=dissolve<.998;
    hearts.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.15,.85),framing);
    sparkles.material.uniforms.uOpacity.value=.21*(1-dissolve);halo.material.opacity=.065*(1-scatter*.35);
  };
  return world;
}

function createTree(info,texture) {
  const world=baseWorld(info,texture);
  world.scale=.76;
  const branches=pineBranches(randomFactory(519));world.body.add(branches.mesh);
  const treePosition=r=>{const level=r(),a=r()*TAU,radius=(pineRadius(level,a)+.22)*(.76+r()*.24);return[Math.cos(a)*radius,level*8.5-4.1,Math.sin(a)*radius];};
  const garlandPoint=level=>{
    const a=level*TAU*6.35+.36, radius=pineRadius(level,a)+.18+(1-level)*.43;
    return [Math.cos(a)*radius,level*8.15-4.01,Math.sin(a)*radius];
  };
  const needles=addField(world,new ParticleField(10000,treePosition,['#154735','#2b5d44','#698263'],{size:.04,brightness:.5}));
  const spiral=addField(world,new ParticleField(1400,r=>garlandPoint(r()).map(v=>v+(r()-.5)*.09),['#f7cd88','#c69c64','#f7e2a5'],{size:.071,brightness:.9,seed:32}));
  const garlandCurve=new THREE.CatmullRomCurve3(Array.from({length:171},(_,i)=>new THREE.Vector3(...garlandPoint(i/170))));
  const garland=new THREE.Mesh(new THREE.TubeGeometry(garlandCurve,256,.014,4),new THREE.MeshStandardMaterial({color:'#c59b61',emissive:'#9f6630',emissiveIntensity:.55,roughness:.38,metalness:.55,transparent:true}));
  world.body.add(garland);
  const starShape=new THREE.Shape();for(let j=0;j<10;j++){const a=j/10*TAU+Math.PI/2,r=j%2===0?.56:.25,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
  const star=new THREE.Mesh(new THREE.ExtrudeGeometry(starShape,{depth:.1,bevelEnabled:true,bevelThickness:.06,bevelSize:.04,bevelSegments:3}),new THREE.MeshStandardMaterial({color:'#d9b56e',metalness:.75,roughness:.28,emissive:'#95703a',emissiveIntensity:.3}));star.position.y=4.65;world.body.add(star);remember(world,star);
  nebula(world.body,'#cda559',texture,[0,4.65,-.1],3,.15);
  const ornaments=createSwarm({geometry:star.geometry.clone(),material:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.65,roughness:.3,emissive:'#4f3417',emissiveIntensity:.12}),count:180,random:randomFactory(552),target:treePosition,palette:['#c8a363','#b99252','#dfc494','#a67e55'],size:.39,spin:.25,destination:(r,i)=>{const level=(i*.61803398875)%1,a=level*TAU*3.3,rad=3.2+r()*2.4;return[Math.cos(a)*rad,level*8-4,Math.sin(a)*2.5];}});world.body.add(ornaments.mesh);
  const geometry=new THREE.SphereGeometry(.105,12,8),mat=new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:.55,roughness:.21,clearcoat:.85,envMapIntensity:1.08,transparent:true});
  const gems=new THREE.InstancedMesh(geometry,mat,200),dummy=new THREE.Object3D(),r=randomFactory(124),gemPalette=['#d0aa61','#76aa91','#be5e67','#f1d9a6'].map(v=>new THREE.Color(v));
  for(let i=0;i<200;i++){dummy.position.set(...treePosition(r));dummy.rotation.set(r()*TAU,r()*TAU,r()*TAU);dummy.scale.setScalar(.55+r()*1.4);dummy.updateMatrix();gems.setMatrixAt(i,dummy.matrix);gems.setColorAt(i,gemPalette[i%gemPalette.length]);}
  world.body.add(gems);
  const bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.037,8,6),new THREE.MeshBasicMaterial({color:'#fff5d3',transparent:true,depthWrite:false}),180);
  const bulbColors=['#ffd7a1','#eeb16b','#fff3d1'].map(v=>new THREE.Color(v).multiplyScalar(2.8));
  for(let i=0;i<180;i++){const level=(i*.75487766625)%1;dummy.position.set(...garlandPoint(level));dummy.scale.setScalar(.7+(i%5)*.15);dummy.updateMatrix();bulbs.setMatrixAt(i,dummy.matrix);bulbs.setColorAt(i,bulbColors[i%3]);}
  world.body.add(bulbs);
  nebula(world.root,'#1a5540',texture,[1,-1,-7],21,.12);
  world.photoTarget=(i,n)=>{const level=i/n,y=3.2-level*6.5,a=level*TAU*3.4,rad=(1-(y+4.1)/8.5)*4.4+.35;return new THREE.Vector3(Math.cos(a)*rad,y,Math.sin(a)*rad);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const reveal=1-THREE.MathUtils.smoothstep(scatter,.18,.88);
    branches.update(scatter,quality);star.rotation.y=Math.sin(time*.3)*.25;star.scale.setScalar(1-scatter*.75);
    gems.count=Math.round(200*Math.max(.4,quality));bulbs.count=Math.round(180*Math.max(.4,quality));
    gems.material.opacity=bulbs.material.opacity=reveal;garland.material.opacity=.79*reveal;
    garland.visible=bulbs.visible=gems.visible=reveal>.005;
    needles.material.uniforms.uOpacity.value=.4*(1-scatter);spiral.material.uniforms.uOpacity.value=1-scatter*.68;
    ornaments.update(time,scatter,quality,scatter,framing);
  };
  return world;
}

function petalGeometry(length,width,lift,base) {
  const nx=16,ny=30,positions=[],closed=[],uvs=[],indices=[];
  for(let j=0;j<=ny;j++){
    const t=j/ny, arc=Math.sin(Math.PI*t),sw=Math.pow(arc,.66);
    for(let i=0;i<=nx;i++){
      const u=i/nx*2-1,edge=u*u;
      const x=u*width*sw*(.92+.14*t)+Math.sin(t*3.5)*.065;
      const y=lift*t*t+edge*sw*t*.55+Math.sin(u*8+t*12)*sw*edge*.07-.25*t*t*t;
      const z=base+t*length-edge*arc*.14;
      positions.push(x,y,z);closed.push(x*.29,t*length*1.18+edge*sw*.08,base*.38+Math.sin(t*Math.PI*.6)*.5);uvs.push(i/nx,t);
    }
  }
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const folded=geometry.clone();folded.setAttribute('position',new THREE.Float32BufferAttribute(closed,3));folded.computeVertexNormals();geometry.morphAttributes.position=[folded.attributes.position];geometry.morphAttributes.normal=[folded.attributes.normal];return geometry;
}
function createFlower(info,texture) {
  const world=baseWorld(info,texture),flower=new THREE.Group();flower.rotation.set(.88,0,.08);world.body.add(flower);
  world.scale=1.1;
  const petals=[];
  for(let layer=0;layer<5;layer++){const count=9-layer;const geometry=petalGeometry(3.76-layer*.49,1.08-layer*.12,.36+layer*.26,.08+layer*.045);
    const material=new THREE.MeshPhysicalMaterial({map:petalTexture(layer),color:'#f0d5e0',roughness:.43,metalness:.015,clearcoat:.18,clearcoatRoughness:.34,ior:1.38,sheen:.75,sheenColor:'#f8c2d4',sheenRoughness:.54,side:THREE.DoubleSide,envMapIntensity:.51});
    for(let i=0;i<count;i++){
    const petal=new THREE.Mesh(geometry,material);petal.rotation.y=i/count*TAU+layer*.46;petal.position.y=layer*.146;
    petal.userData={angle:petal.rotation.y,layer,baseY:petal.position.y,scale:.97+Math.sin(i*1.9+layer)*.047,tilt:.073*Math.sin(i*2.4+layer)};
    flower.add(petal);petals.push(petal);
  }}
  const center=new THREE.Group();flower.add(center);
  const receptacle=new THREE.Mesh(new THREE.SphereGeometry(.49,24,12),new THREE.MeshStandardMaterial({color:'#9c603c',roughness:.66,emissive:'#50202a',emissiveIntensity:.22}));
  receptacle.scale.y=.58;receptacle.position.y=.26;center.add(receptacle);
  const stamen=new THREE.InstancedMesh(new THREE.SphereGeometry(.043,8,6),new THREE.MeshStandardMaterial({color:'#f6d493',emissive:'#a86b37',emissiveIntensity:.27,roughness:.4}),122);
  const rng=randomFactory(36),dummy=new THREE.Object3D(),gold=['#ffe0a7','#d98853','#ffc873','#f7eee0'].map(v=>new THREE.Color(v));
  for(let i=0;i<122;i++){
    const a=i*2.39996323,r=Math.sqrt((i+.5)/122)*.49;
    dummy.position.set(Math.cos(a)*r,.4+r*.5+rng()*.08,Math.sin(a)*r);dummy.scale.set(.7+rng()*.4,.92+rng()*.48,.7+rng()*.4);
    dummy.updateMatrix();stamen.setMatrixAt(i,dummy.matrix);stamen.setColorAt(i,gold[i%4]);
  }
  center.add(stamen);
  const pollen=addField(world,new ParticleField(2200,(r)=>{const a=r()*TAU,rad=1+r()*4.4;return [Math.cos(a)*rad,(r()-.5)*2.8,Math.sin(a)*rad];},['#b8859f','#9d90b9','#ceb698'],{size:.025,brightness:.4}));
  const stems=[];for(let i=0;i<52;i++){const a=i/52*TAU,r=.18+(i%7)*.05;stems.push(Math.cos(a)*r*.46,.31,Math.sin(a)*r*.46,Math.cos(a)*r,.51+(i%5)*.028,Math.sin(a)*r);}
  const stemGeometry=new THREE.BufferGeometry();stemGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stems,3));
  center.add(new THREE.LineSegments(stemGeometry,new THREE.LineBasicMaterial({color:'#bc8650',transparent:true,opacity:.69})));
  nebula(world.root,'#57366f',texture,[2,0,-7],22,.13);nebula(world.root,'#875773',texture,[-6,3,-11],18,.11);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5,Math.sin(a)*3.4,Math.sin(a)*1.5);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const flight=THREE.MathUtils.smoothstep(scatter,.15,.94);
    petals.forEach((petal,i)=>{
      const {angle,layer,baseY,scale,tilt}=petal.userData;
      const path=angle+flight*(.87+flight*.56)+Math.sin(time*.16+i)*flight*.17;
      petal.morphTargetInfluences[0]=(1-THREE.MathUtils.smoothstep(openness,layer*.075,.64+layer*.085))*.93;
      petal.position.set(Math.sin(path)*(3.15+layer*.49)*flight*framing,baseY+(Math.sin(i*2.1)*2.8+(i%5)*.28-.6)*flight,Math.cos(path)*(3.15+layer*.49)*flight*.7);
      petal.rotation.y=path+flight*Math.sin(time*.21+i)*.31;petal.rotation.x=flight*Math.sin(time*.24+i)*.56;
      petal.rotation.z=tilt+Math.sin(time*.39+i)*(.012+flight*.37);petal.scale.setScalar(scale*(1-flight*.34));
    });
    flower.rotation.y=Math.sin(time*.12)*.1;
    const centerSize=THREE.MathUtils.smoothstep(openness,.12,.8)*(1-flight);
    center.scale.setScalar(centerSize);center.visible=centerSize>.01;
    pollen.material.uniforms.uOpacity.value=.36+flight*.33;
  };
  return world;
}

function createOcean(info,texture) {
  const world=baseWorld(info,texture),jellies=[detailedJelly(1,[0,1.4,0]),detailedJelly(.28,[-4.3,2.3,-4],{detail:.5}),detailedJelly(.38,[4.1,.4,-5],{detail:.5})];jellies.forEach(j=>world.body.add(j.root));
  const nursery=detailedJelly(1,[0,0,0],{detail:.3}),babyCount=26;
  const babies=createSwarm({geometry:nursery.bellGeometry,material:nursery.material,count:babyCount,random:randomFactory(644),target:r=>{const a=r()*TAU,rad=r()*1.6;return[Math.cos(a)*rad,1+r()*1.5,Math.sin(a)*rad];},palette:['#9deae7','#c5aceb'],size:.23,spin:.04,destination:oceanCurrent});
  const parts=[[nursery.tendrilGeometry,nursery.tendrilMaterial],[nursery.armGeometry,nursery.armMaterial],[nursery.ring.geometry,nursery.ring.material],[nursery.organGeometry,nursery.organMaterial]].map(([geometry,material])=>{const mesh=new THREE.InstancedMesh(geometry,material,babyCount);mesh.frustumCulled=false;mesh.instanceMatrix=babies.mesh.instanceMatrix;return mesh;});world.body.add(babies.mesh,...parts);
  addField(world,new ParticleField(2000,r=>[(r()-.5)*18,(r()-.5)*15,-2-r()*10],['#547f91','#747a9c','#6eaaa9'],{size:.035,brightness:.35}));
  nebula(world.root,'#1b627b',texture,[0,7,-10],27,.16);nebula(world.root,'#263955',texture,[-6,-5,-10],23,.13);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*4.5,Math.sin(a)*3.2-.6,Math.sin(a*2)*1.8);};
  world.update=(time,scatter,openness,quality,framing)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.2,.8);
    jellies.forEach((j,i)=>{
      j.root.position.y=j.baseY+Math.sin(time*.57+i)*.27;
      j.root.rotation.z=Math.sin(time*.42+i)*.063;
      j.animate(time+i*1.37,1-dissolve);j.root.visible=dissolve<.995;
      j.root.scale.set(j.scale*(.98+openness*.035),j.scale*(1.02-openness*.025),j.scale*(.98+openness*.035));
    });
    babies.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.1,.8),framing);nursery.animate(time);
    for(const mesh of parts){mesh.visible=babies.mesh.visible;mesh.count=babies.mesh.count;}
  };
  return world;
}

export function createWorldStore() {
  let texture;
  const factories={saturn:createSaturn,heart:createHeart,tree:createTree,flower:createFlower,ocean:createOcean};
  return new LazyWorldStore(Object.fromEntries(WORLD_INFO.map(info=>[info.id,()=>factories[info.id](info,texture||=(glowTexture()))])));
}
export function makeStarfield() {
  const rng=randomFactory(2026),field=new ParticleField(1600,()=>{const a=rng()*TAU,z=rng()*2-1,r=35+rng()*32,s=Math.sqrt(1-z*z);return[Math.cos(a)*s*r,z*r,Math.sin(a)*s*r];},['#b5bacb','#91a3bf','#a99a9b'],{size:.085,brightness:.48});return field;
}

export function updateWorld(world,time,scatter,openness,quality,framing=1,response=0) {
  world.details.update(time,scatter,quality);
  world.fields.forEach(field=>{field.update(time,scatter);field.quality(quality);});
  world.update?.(time,scatter,openness,quality,framing,response);
}
