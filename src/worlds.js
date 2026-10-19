import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSwarm } from './swarm.js';

const TAU = Math.PI * 2;
export const WORLD_INFO = [
  { id:'saturn', name:'星际引力', en:'CELESTIAL ORBIT', label:'星环', title:'把宇宙，\n握在掌间。', description:'张开手掌，让一颗星球化作漫游的星系。', color:'#ddc298', bg:'#060a13', number:'01' },
  { id:'heart', name:'心动星团', en:'A LITTLE INFINITY', label:'爱心', title:'让心动，\n有迹可循。', description:'握紧是一颗心，松开是漫天的小小心动。', color:'#f0a5c0', bg:'#100914', number:'02' },
  { id:'tree', name:'记忆之树', en:'THE MEMORY TREE', label:'圣诞树', title:'每个瞬间，\n都在发光。', description:'星光、照片与金色雪花，聚成你的记忆。', color:'#d5c38a', bg:'#050e0d', number:'03' },
  { id:'flower', name:'光之花园', en:'THE ART OF BLOOM', label:'花朵', title:'指尖松开，\n万物盛放。', description:'一朵会呼吸的水晶花，回应你的每个动作。', color:'#e4add3', bg:'#100b18', number:'04' },
  { id:'ocean', name:'微光深海', en:'BENEATH THE SILENCE', label:'水母', title:'潜入一片，\n发光的宁静。', description:'让水母与微光，跟随你的手缓缓游动。', color:'#a0e5df', bg:'#040e18', number:'05' },
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
 gl_Position=projectionMatrix*mv; gl_PointSize=clamp(uSize*aSize*700.0/-mv.z,.7,13.0);
 vColor=aColor;vAlpha=.65+.35*sin(aPhase+uTime*.65);
}`;
const pointFragment = `
varying vec3 vColor; varying float vAlpha;
void main(){vec2 q=gl_PointCoord*2.0-1.0;float d=dot(q,q);if(d>1.0)discard;float a=exp(-d*3.8)*vAlpha;gl_FragColor=vec4(vColor*(1.0+exp(-d*30.0)*.7),a);}`;

export class ParticleField {
  constructor(count, shape, palette, {size=.065,brightness=1,seed=48}={}) {
    const rng=randomFactory(seed),positions=new Float32Array(count*3),chaos=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),phases=new Float32Array(count);
    const hues=palette.map(color);
    for(let i=0;i<count;i++){
      const p=shape(rng,i,count);positions.set(p,i*3);
      const theta=rng()*TAU,v=rng()*2-1,r=5+Math.pow(rng(),.5)*9,ring=Math.sqrt(1-v*v);
      chaos.set([Math.cos(theta)*ring*r,v*r*.72,Math.sin(theta)*ring*r],i*3);
      const c=hues[Math.floor(rng()*hues.length)].clone().multiplyScalar(brightness*(.55+rng()*.9));colors.set([c.r,c.g,c.b],i*3);
      sizes[i]=.45+rng()*1.35;phases[i]=rng()*100;
    }
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));this.geometry.setAttribute('aChaos',new THREE.BufferAttribute(chaos,3));this.geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));this.geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));this.geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
    this.material=new THREE.ShaderMaterial({vertexShader:pointVertex,fragmentShader:pointFragment,uniforms:{uTime:{value:0},uScatter:{value:0},uSize:{value:size}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    this.object=new THREE.Points(this.geometry,this.material);this.object.frustumCulled=false;this.count=count;
  }
  update(time,scatter){this.material.uniforms.uTime.value=time;this.material.uniforms.uScatter.value=scatter;}
  quality(factor){this.geometry.setDrawRange(0,Math.max(800,Math.round(this.count*factor)));}
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
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  return { ...info,root,body,fields:[],objects:[],animated:[],texture,phase:0,scale:1,photoTarget:(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.6,Math.sin(a)*3.1,Math.sin(a*2)*1.8);}, update:null };
}
function addField(world, field, parent=world.body) {world.fields.push(field);parent.add(field.object);return field;}
function remember(world, mesh) {world.objects.push({mesh,position:mesh.position.clone(),scale:mesh.scale.clone(),rotation:mesh.rotation.clone()});return mesh;}

function createSaturn(info, texture) {
  const world=baseWorld(info,texture),planet=new THREE.Group();planet.rotation.set(.22,0,.34);world.body.add(planet);
  const rng=randomFactory(104),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
  for(let y=0;y<512;y++){const stripe=.5+.22*Math.sin(y*.15)+.12*Math.sin(y*.63)+.08*Math.sin(y*.049);const r=142+stripe*76,g=118+stripe*62,b=86+stripe*44;ctx.fillStyle='rgb('+r+','+g+','+b+')';ctx.fillRect(0,y,1024,1);}
  const image=ctx.getImageData(0,0,1024,512);for(let i=0;i<image.data.length;i+=4){const n=(rng()-.5)*9;image.data[i]+=n;image.data[i+1]+=n;image.data[i+2]+=n;}ctx.putImageData(image,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(2.13,96,64),new THREE.MeshStandardMaterial({map,roughness:.83,metalness:.08,envMapIntensity:.18}));planet.add(sphere);remember(world,sphere);
  const halo=atmosphere(2.2,'#d9b881',.55);planet.add(halo);remember(world,halo);
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.78,5.35,256,10),new THREE.ShaderMaterial({
    side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{uOpacity:{value:1}},
    vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uOpacity;varying vec3 vPos;void main(){float r=length(vPos.xy);float t=(r-2.78)/2.57;float bands=.55+.18*sin(r*92.)+.13*sin(r*237.)+.08*sin(r*431.);float gap=1.-smoothstep(.015,.045,abs(r-4.15));float edge=smoothstep(0.,.04,t)*(1.-smoothstep(.91,1.,t));vec3 c=mix(vec3(.42,.35,.26),vec3(.9,.79,.59),bands);float shade=mix(.52,1.,smoothstep(-3.,2.,vPos.x+vPos.y*.7));gl_FragColor=vec4(c*shade,(bands*.7+.15)*edge*(1.-gap*.8)*uOpacity);}`,
  }));ring.rotation.x=-Math.PI/2;planet.add(ring);remember(world,ring);world.ring=ring;
  const field=addField(world,new ParticleField(24000,(r)=>{const a=r()*TAU,rad=2.83+r()*2.6;return [Math.cos(a)*rad,(r()-.5)*.035,Math.sin(a)*rad];},['#d9bd8a','#e8dbba','#a38d72'],{size:.034,brightness:.9}),planet);
  field.object.rotation.x=0;
  const orbitDust=addField(world,new ParticleField(16000,(r)=>{const rad=6+Math.pow(r(),.5)*9,a=r()*TAU;return [Math.cos(a)*rad,(r()-.5)*1.1,Math.sin(a)*rad];},['#adc4df','#616dba','#dbb484'],{size:.048,brightness:.5,seed:26}));orbitDust.object.rotation.set(.14,.2,.2);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(.26,32,20),new THREE.MeshStandardMaterial({color:'#6e7784',roughness:.95,envMapIntensity:.08}));moon.position.set(5.9,1.3,-5.4);world.body.add(moon);remember(world,moon);
  const littlePlanets=createSwarm({geometry:new THREE.SphereGeometry(1,20,12),material:new THREE.MeshStandardMaterial({map,roughness:.55,metalness:.18}),count:160,random:randomFactory(818),target:r=>{const a=r()*TAU,rad=r()<.55?1.3+r()*1.1:3+r()*2.2;return[Math.cos(a)*rad,(r()-.5)*1.8,Math.sin(a)*rad];},palette:['#debf91','#94acc8','#c2a1c7','#d1a585'],radius:11.5,size:.13,spin:.14});
  const littleRings=new THREE.InstancedMesh(new THREE.RingGeometry(1.38,2.2,40).rotateX(-1.12).rotateZ(.28),new THREE.MeshStandardMaterial({color:'#c9b28d',roughness:.48,metalness:.28,side:THREE.DoubleSide}),160);littleRings.frustumCulled=false;littleRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.body.add(littlePlanets.mesh,littleRings);
  sphere.material.transparent=true;
  nebula(world.root,'#334a8c',texture,[-4,1,-7],22,.14);nebula(world.root,'#855d91',texture,[9,-2,-13],24,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU+.15;return new THREE.Vector3(Math.cos(a)*6.2,Math.sin(a)*2.6,Math.sin(a)*3.1);};
  world.update=(time,scatter,openness,quality)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.13,.7);
    planet.rotation.y=Math.sin(time*.12)*.13;sphere.rotation.y=time*.04;moon.position.set(4.6+Math.cos(time*.025)*.8,1.8,-5.8+Math.sin(time*.025)*.8);
    sphere.material.opacity=1-dissolve;sphere.visible=dissolve<.995;halo.material.uniforms.uIntensity.value=.55*(1-dissolve);
    ring.material.uniforms.uOpacity.value=1-dissolve;planet.scale.setScalar(1-dissolve*.12);field.material.uniforms.uSize.value=.034*(1-scatter*.7);
    littlePlanets.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.12,.85));littleRings.visible=littlePlanets.mesh.visible;littleRings.count=littlePlanets.mesh.count;littleRings.instanceMatrix.array.set(littlePlanets.mesh.instanceMatrix.array);littleRings.instanceMatrix.needsUpdate=true;
  };
  return world;
}

function heartPoint(r) {const a=r()*TAU,k=.75+r()*.25,x=16*Math.pow(Math.sin(a),3),y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a);return [x*.235*k,(y*.235+.25)*k,(r()-.5)*1.25*Math.pow(Math.sin(a),2)];}
function roundedHeartGeometry(segments=144,rings=36,depth=1.8){
  const positions=[],indices=[],height=rings*2;
  // Solve the implicit heart surface along rays. This gives rounded lobes
  // on every side, rather than adding depth to a flat heart outline.
  for(let j=0;j<=height;j++)for(let i=0;i<=segments;i++){
    const phi=j/height*Math.PI,theta=i/segments*TAU,dx=Math.sin(phi)*Math.cos(theta),dy=Math.cos(phi),dz=Math.sin(phi)*Math.sin(theta);
    let low=0,high=1.8;
    for(let k=0;k<22;k++){const radius=(low+high)/2,x=dx*radius,y=dy*radius,z=dz*radius,a=x*x+2.25*z*z+y*y-1,value=a*a*a-x*x*y*y*y-.1125*z*z*y*y*y;if(value>0)high=radius;else low=radius;}
    const radius=(low+high)/2;positions.push(dx*radius*3.25,dy*radius*3.25-.35,dz*radius*depth*1.6);
  }
  const stride=segments+1;
  for(let j=0;j<height;j++)for(let i=0;i<segments;i++){const a=j*stride+i,b=a+stride;indices.push(a,a+1,b,b,a+1,b+1);}
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);const welded=mergeVertices(geometry);geometry.dispose();geometry=welded;geometry.computeVertexNormals();return geometry;
}
function createHeart(info,texture) {
  const world=baseWorld(info,texture);
  const geometry=roundedHeartGeometry();
  const material=new THREE.MeshPhysicalMaterial({color:'#c73573',roughness:.22,metalness:.32,transmission:.08,thickness:2.4,clearcoat:1,clearcoatRoughness:.12,ior:1.46,iridescence:.22,iridescenceIOR:1.3,envMapIntensity:.75,transparent:true,opacity:1,side:THREE.DoubleSide});
  const heart=new THREE.Mesh(geometry,material);heart.rotation.y=-.18;world.body.add(heart);remember(world,heart);
  const heartVolume=r=>{const a=r()*TAU,k=Math.sqrt(r());return[16*Math.pow(Math.sin(a),3)*.235*k,(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.235*k+.25,(r()*2-1)*Math.sqrt(1-k*k)*1.8];};
  const hearts=createSwarm({geometry:roundedHeartGeometry(24,8),material:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.38,roughness:.22,envMapIntensity:.9}),count:720,random:randomFactory(735),target:heartVolume,palette:['#e970a6','#dd4783','#f3a4bc','#c42f6b','#deb583'],radius:10.3,size:.042,spin:.13});
  world.body.add(hearts.mesh);
  const sparkles=addField(world,new ParticleField(7200,heartPoint,['#f9bfd5','#dfa0c5','#e7c9a6'],{size:.027,brightness:.48}));
  const halo=nebula(world.body,'#bc417b',texture,[0,.2,-1],10,.1);remember(world,halo);
  nebula(world.root,'#713468',texture,[5,0,-9],24,.13);nebula(world.root,'#50357a',texture,[-8,-4,-12],22,.1);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5.1,Math.sin(a)*3.8+.3,Math.sin(a*2)*1.5+1);};
  world.update=(time,scatter,openness,quality)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.12,.63),beat=1+Math.sin(time*1.5)*.018;
    heart.rotation.y=-.24+Math.sin(time*.25)*.2;heart.scale.setScalar(beat*(1-dissolve*.16));
    material.opacity=1-dissolve;heart.visible=dissolve<.995;
    hearts.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.1,.8));
    sparkles.material.uniforms.uSize.value=.027*(1-scatter*.6);halo.material.opacity=.1*(1-scatter*.6);
  };
  return world;
}

function createTree(info,texture) {
  const world=baseWorld(info,texture);
  const treePosition=(r)=>{const y=r()*8.5-4.1,radius=(1-(y+4.1)/8.5)*3.9,a=r()*TAU;return [Math.cos(a)*radius*(.75+r()*.25),y,Math.sin(a)*radius*(.75+r()*.25)];};
  const needles=addField(world,new ParticleField(31000,treePosition,['#103f31','#1f7653','#386c4c','#adc18c'],{size:.08,brightness:.7}));
  const spiral=addField(world,new ParticleField(3800,(r)=>{const y=r()*8.5-4.1,a=(y+4.1)/8.5*TAU*6.8,radius=(1-(y+4.1)/8.5)*4+.05;return [Math.cos(a)*radius+(r()-.5)*.12,y,Math.sin(a)*radius+(r()-.5)*.12];},['#d7bd79','#e6d5a6','#fff0c3'],{size:.095,brightness:1.35,seed:32}));
  const starShape=new THREE.Shape();for(let j=0;j<10;j++){const a=j/10*TAU+Math.PI/2,r=j%2===0?.56:.25,x=Math.cos(a)*r,y=Math.sin(a)*r;if(j===0)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();
  const star=new THREE.Mesh(new THREE.ExtrudeGeometry(starShape,{depth:.1,bevelEnabled:true,bevelThickness:.06,bevelSize:.04,bevelSegments:3}),new THREE.MeshStandardMaterial({color:'#e8cb80',metalness:.6,roughness:.16,emissive:'#e3bd53',emissiveIntensity:1.3}));star.position.y=4.65;world.body.add(star);remember(world,star);
  const ornaments=createSwarm({geometry:star.geometry.clone(),material:new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.68,roughness:.23,emissive:'#6a4a21',emissiveIntensity:.2}),count:360,random:randomFactory(552),target:treePosition,palette:['#e2c177','#b99252','#f5dfab','#d39867'],radius:10.8,size:.26,spin:.25});world.body.add(ornaments.mesh);
  const geometry=new THREE.OctahedronGeometry(.07,0),mat=new THREE.MeshStandardMaterial({color:'#d9b875',metalness:.82,roughness:.25,emissive:'#9f7742',emissiveIntensity:.25});
  const gems=new THREE.InstancedMesh(geometry,mat,280),dummy=new THREE.Object3D(),r=randomFactory(124);for(let i=0;i<280;i++){dummy.position.set(...treePosition(r));dummy.rotation.set(r()*TAU,r()*TAU,r()*TAU);dummy.scale.setScalar(.5+r()*2);dummy.updateMatrix();gems.setMatrixAt(i,dummy.matrix);}world.body.add(gems);remember(world,gems);
  nebula(world.root,'#1a5540',texture,[1,-1,-7],21,.12);
  world.photoTarget=(i,n)=>{const level=i/n,y=3.2-level*6.5,a=level*TAU*3.4,rad=(1-(y+4.1)/8.5)*4.4+.35;return new THREE.Vector3(Math.cos(a)*rad,y,Math.sin(a)*rad);};
  world.update=(time,scatter,openness,quality)=>{star.rotation.y=Math.sin(time*.3)*.35;star.scale.setScalar(1-scatter*.65);gems.scale.setScalar(1+scatter*.7);gems.material.transparent=true;gems.material.opacity=1-scatter;spiral.object.rotation.y=time*.015;needles.material.uniforms.uSize.value=.08*(1-scatter*.84);ornaments.update(time,scatter,quality);};
  return world;
}

function petalGeometry(length,width,lift,base) {
  const nx=12,ny=24,positions=[],closed=[],uvs=[],indices=[];
  for(let j=0;j<=ny;j++){const t=j/ny;for(let i=0;i<=nx;i++){const u=i/nx*2-1,sw=Math.pow(Math.sin(Math.PI*t),.7),x=u*width*sw,y=lift*Math.pow(t,2)+u*u*t*.2,z=base+t*length;positions.push(x,y,z);closed.push(x*.28,t*length*1.18+u*u*.08,base*.38+Math.sin(t*Math.PI*.6)*.5);uvs.push(i/nx,t);}}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const folded=geometry.clone();folded.setAttribute('position',new THREE.Float32BufferAttribute(closed,3));folded.computeVertexNormals();geometry.morphAttributes.position=[folded.attributes.position];geometry.morphAttributes.normal=[folded.attributes.normal];return geometry;
}
function createFlower(info,texture) {
  const world=baseWorld(info,texture),flower=new THREE.Group();flower.rotation.set(.85,0,.05);world.body.add(flower);
  const petals=[];
  for(let layer=0;layer<4;layer++){const count=9-layer;const geometry=petalGeometry(3.5-layer*.57,1.18-layer*.16,.42+layer*.24,.08+layer*.035);for(let i=0;i<count;i++){
    const shade=new THREE.Color().setHSL(.91-layer*.035,.34+.04*layer,.62-layer*.035,THREE.SRGBColorSpace);
    const material=new THREE.MeshPhysicalMaterial({color:shade,roughness:.26,metalness:.03,clearcoat:.65,clearcoatRoughness:.12,transmission:.16,thickness:.18,ior:1.32,iridescence:.6,iridescenceIOR:1.3,side:THREE.DoubleSide,envMapIntensity:.55});
    const petal=new THREE.Mesh(geometry,material);petal.rotation.y=i/count*TAU+layer*.46;petal.position.y=layer*.12;petal.userData={angle:petal.rotation.y,layer,baseY:petal.position.y};flower.add(petal);petals.push(petal);
  }}
  const stamen=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshStandardMaterial({color:'#e7c789',emissive:'#b18a49',emissiveIntensity:.5,roughness:.4}),160),rng=randomFactory(36),dummy=new THREE.Object3D();for(let i=0;i<160;i++){const a=rng()*TAU,r=rng()*.48;dummy.position.set(Math.cos(a)*r,.24+rng()*.45,Math.sin(a)*r);dummy.updateMatrix();stamen.setMatrixAt(i,dummy.matrix);}flower.add(stamen);
  addField(world,new ParticleField(10000,(r)=>{const a=r()*TAU,rad=1+r()*4.4;return [Math.cos(a)*rad,(r()-.5)*2.8,Math.sin(a)*rad];},['#d998c1','#a3a2d4','#efcfaa'],{size:.045,brightness:.45}));
  nebula(world.root,'#57366f',texture,[2,0,-7],22,.13);nebula(world.root,'#875773',texture,[-6,3,-11],18,.11);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*5,Math.sin(a)*3.4,Math.sin(a)*1.5);};
  world.update=(time,scatter,openness)=>{
    const fold=1-THREE.MathUtils.clamp(openness,0,1),flight=THREE.MathUtils.smoothstep(scatter,.28,.94);
    petals.forEach((petal,i)=>{const {angle,layer,baseY}=petal.userData;petal.morphTargetInfluences[0]=fold*.88;petal.position.set(Math.sin(angle)*(4+layer*.9)*flight,baseY+Math.sin(i*2.1)*3.8*flight,Math.cos(angle)*(4+layer*.9)*flight);petal.rotation.y=angle+flight*Math.sin(time*.18+i)*.75;petal.rotation.x=flight*Math.sin(time*.32+i)*.65;petal.rotation.z=Math.sin(time*.6+i)*(.015+flight*.45);petal.scale.setScalar(1-flight*.23);});
    flower.rotation.y=Math.sin(time*.12)*.15;flower.scale.setScalar(1);stamen.material.transparent=true;stamen.material.opacity=(1-fold*.9)*(1-flight);
  };
  return world;
}

const jellyVertex=`uniform float uTime;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;void main(){vLocal=position;vec3 p=position;vec3 n=normal;p.xz*=1.+sin(uTime*1.3)*.035;
#ifdef USE_INSTANCING
p=(instanceMatrix*vec4(p,1.)).xyz;n=mat3(instanceMatrix)*n;
#endif
vNormal=normalize(normalMatrix*n);vec4 mv=modelViewMatrix*vec4(p,1.);vPosition=mv.xyz;gl_Position=projectionMatrix*mv;}`;
const jellyFragment=`uniform float uTime;uniform float uOpacity;varying vec3 vNormal;varying vec3 vPosition;varying vec3 vLocal;void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),2.4);float rib=pow(.5+.5*cos(atan(vLocal.z,vLocal.x)*20.),13.);vec3 c=mix(vec3(.19,.3,.63),vec3(.4,.87,.91),f);c+=vec3(.22,.13,.32)*rib;float a=(.075+f*.57+rib*.10)*uOpacity;gl_FragColor=vec4(c*(.7+f),a);}`;
function jellyModel(scale,position) {
  const root=new THREE.Group();root.position.set(...position);root.scale.setScalar(scale);
  const points=[];for(let i=0;i<=36;i++){const t=i/36,a=t*Math.PI/2;points.push(new THREE.Vector2(Math.sin(a)*2.2,Math.cos(a)*1.75));}
  const material=new THREE.ShaderMaterial({vertexShader:jellyVertex,fragmentShader:jellyFragment,uniforms:{uTime:{value:0},uOpacity:{value:1}},transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});const bell=new THREE.Mesh(new THREE.LatheGeometry(points,96),material);root.add(bell);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.18,.016,5,128),new THREE.MeshBasicMaterial({color:new THREE.Color('#98dfef').multiplyScalar(1.2),transparent:true,opacity:.7}));ring.rotation.x=Math.PI/2;root.add(ring);
  const tendrilMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:`uniform float uTime;varying float vT;void main(){vec3 p=position;vT=clamp(-p.y/5.,0.,1.);p.x+=sin(p.y*1.3+uTime*.8+p.z)*vT*.24;p.z+=cos(p.y*1.1+uTime*.7+p.x)*vT*.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float uOpacity;varying float vT;void main(){vec3 c=mix(vec3(.7,.43,.85),vec3(.3,.85,.9),vT);gl_FragColor=vec4(c*(1.4-vT*.5),(.6-vT*.34)*uOpacity);}`});
  for(let i=0;i<28;i++){const a=i/28*TAU,r=i%3===0?1.1:1.9,curve=[];for(let j=0;j<=20;j++){const t=j/20;curve.push(new THREE.Vector3(Math.cos(a)*r*(1-t*.5)+Math.sin(t*7+i)*t*.25,-t*(4.1+(i%4)*.4),Math.sin(a)*r*(1-t*.5)));}root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve),50,i%4===0?.022:.009,4,false),tendrilMaterial));}
  return {root,material,tendrilMaterial,ring,baseY:position[1],scale};
}
function createOcean(info,texture) {
  const world=baseWorld(info,texture),jellies=[jellyModel(1,[0,1.3,0]),jellyModel(.35,[-4.2,2.4,-4]),jellyModel(.48,[4.4,.6,-5])];jellies.forEach(j=>world.body.add(j.root));
  const nursery=jellyModel(1,[0,0,0]);
  const babies=createSwarm({geometry:nursery.root.children[0].geometry,material:nursery.material,count:54,random:randomFactory(644),target:r=>{const a=r()*TAU,rad=r()*2;return[Math.cos(a)*rad,1+r()*1.8,Math.sin(a)*rad];},palette:['#9deae7','#c5aceb'],radius:12,size:.14,spin:.04});
  const smallTentacleGeometry=mergeGeometries(nursery.root.children.slice(2).filter((_,i)=>i%4===0).map(o=>o.geometry));
  const smallTentacles=new THREE.InstancedMesh(smallTentacleGeometry,new THREE.MeshBasicMaterial({color:'#90d1e5',transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}),54);
  const smallRings=new THREE.InstancedMesh(nursery.ring.geometry.clone().rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:'#a7eded',transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}),54);
  for(const mesh of [smallTentacles,smallRings]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}world.body.add(babies.mesh,smallTentacles,smallRings);
  nursery.root.children.slice(2).forEach(o=>o.geometry.dispose());nursery.ring.geometry.dispose();nursery.ring.material.dispose();nursery.tendrilMaterial.dispose();
  addField(world,new ParticleField(12000,r=>[(r()-.5)*19,(r()-.5)*17,(r()-.5)*16],['#5da4b6','#9288be','#7dd5ce'],{size:.055,brightness:.5}));
  nebula(world.root,'#1b627b',texture,[0,7,-10],27,.16);nebula(world.root,'#263955',texture,[-6,-5,-10],23,.13);
  world.photoTarget=(i,n)=>{const a=i/n*TAU;return new THREE.Vector3(Math.cos(a)*4.5,Math.sin(a)*3.2-.6,Math.sin(a*2)*1.8);};
  world.update=(time,scatter,openness,quality)=>{
    const dissolve=THREE.MathUtils.smoothstep(scatter,.2,.8);
    jellies.forEach((j,i)=>{j.root.position.y=j.baseY+Math.sin(time*.5+i)*.25;j.material.uniforms.uTime.value=time+i;j.tendrilMaterial.uniforms.uTime.value=time+i;j.material.uniforms.uOpacity.value=1-dissolve;j.tendrilMaterial.uniforms.uOpacity.value=1-dissolve;j.ring.material.opacity=.7*(1-dissolve);j.root.visible=dissolve<.995;j.root.scale.set(j.scale*(.74+openness*.26),j.scale*(1.1-openness*.1),j.scale*(.74+openness*.26));});
    babies.update(time,scatter,quality,THREE.MathUtils.smoothstep(scatter,.1,.8));nursery.material.uniforms.uTime.value=time;
    for(const mesh of [smallTentacles,smallRings]){mesh.visible=babies.mesh.visible;mesh.count=babies.mesh.count;mesh.instanceMatrix.array.set(babies.mesh.instanceMatrix.array);mesh.instanceMatrix.needsUpdate=true;}
  };
  return world;
}

export function createWorlds() {
  const texture=glowTexture();
  return [createSaturn(WORLD_INFO[0],texture),createHeart(WORLD_INFO[1],texture),createTree(WORLD_INFO[2],texture),createFlower(WORLD_INFO[3],texture),createOcean(WORLD_INFO[4],texture)];
}
export function makeStarfield() {
  const rng=randomFactory(2026),field=new ParticleField(4200,()=>{const a=rng()*TAU,z=rng()*2-1,r=30+rng()*36,s=Math.sqrt(1-z*z);return[Math.cos(a)*s*r,z*r,Math.sin(a)*s*r];},['#e2e2f1','#9fb7dc','#d9caae'],{size:.14,brightness:.65});return field;
}

export function updateWorld(world,time,scatter,openness,quality) {
  world.fields.forEach(field=>{field.update(time,scatter);field.quality(quality);});
  world.update?.(time,scatter,openness,quality);
}
