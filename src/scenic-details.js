import * as THREE from 'three';

const TAU=Math.PI*2;
const COLORS={saturn:['#d6ae75','#687daf'],heart:['#d995b5','#8869b5'],tree:['#d4b777','#688f7a'],flower:['#d2a3c3','#a7a3d0'],ocean:['#78bbc5','#796fb3']};
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

function stroke(points,tint,opacity=.18){
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry,new THREE.LineBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
}

// The details are made once with each lazy world. Animation happens in shaders.
export function createScenicDetails(id){
  const root=new THREE.Group(),random=seeded(574+Object.keys(COLORS).indexOf(id)*97),palette=COLORS[id],lines=[];
  const count=id==='tree'?460:id==='ocean'?600:370,positions=[],phases=[],sizes=[];
  for(let i=0;i<count;i++){
    const a=random()*TAU,r=4+random()*7;
    let x=Math.cos(a)*r,y=Math.sin(a)*r*.64,z=-3-random()*10;
    if(id==='tree'){x=(random()-.5)*16;y=(random()-.5)*15;z=-3-random()*8;}
    if(id==='ocean'){x=(random()-.5)*22;y=(random()-.5)*22;z=-4-random()*15;}
    if(id==='flower'){y=(random()-.5)*8;z=Math.sin(a)*r*.55-3;}
    positions.push(x,y,z);phases.push(random()*TAU);sizes.push(.35+random()*1.4);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
  const uniforms={uTime:{value:0},uAmount:{value:1},uKind:{value:['saturn','heart','tree','flower','ocean'].indexOf(id)},uColor:{value:new THREE.Color(palette[0])},uOther:{value:new THREE.Color(palette[1])}};
  const points=new THREE.Points(geometry,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float aPhase;attribute float aSize;uniform float uTime;uniform float uKind;varying float vLight;varying float vPhase;
      void main(){vec3 p=position;float t=uTime*.15;p.x+=sin(t*.25+aPhase)*.3;
      if(uKind>1.5&&uKind<2.5){p.y=mod(p.y+11.-t*.7,22.)-11.;}else if(uKind>3.5){p.y=mod(p.y+12.+t*.3,24.)-12.;}else{p.y+=sin(t+aPhase)*.3;}
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*48./-mv.z,1.,6.);vLight=.3+.7*pow(.5+.5*sin(t+aPhase),3.);vPhase=aPhase;}`,
    fragmentShader:`uniform vec3 uColor;uniform vec3 uOther;uniform float uAmount;uniform float uKind;varying float vLight;varying float vPhase;
      void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=dot(p,p);if(r>1.)discard;float halo=exp(-r*6.);float cross=(exp(-abs(p.x)*36.)*exp(-abs(p.y)*5.)+exp(-abs(p.y)*36.)*exp(-abs(p.x)*5.))*.16;
      if(uKind>3.5)cross=0.;vec3 c=mix(uColor,uOther,.5+.5*sin(vPhase));gl_FragColor=vec4(c*1.25,(halo*.42+cross)*vLight*uAmount);}`
  }));points.frustumCulled=false;root.add(points);

  let rocks=null,rockCount=0,bubbles=null;
  if(id==='saturn'){
    rockCount=210;rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#b2a08b',roughness:.95,metalness:.08,transparent:true,opacity:.8}),rockCount);
    const dummy=new THREE.Object3D();
    for(let i=0;i<rockCount;i++){const a=i/rockCount*TAU,r=5.7+random()*2.1;dummy.position.set(Math.cos(a)*r,(random()-.5)*.25,Math.sin(a)*r);dummy.rotation.set(random()*TAU,random()*TAU,random()*TAU);dummy.scale.set(.018+random()*.043,.012+random()*.03,.02+random()*.04);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
    rocks.rotation.set(.13,.2,.34);root.add(rocks);
    for(let j=0;j<2;j++){const pts=[];for(let i=0;i<=220;i++){const a=i/220*TAU,r=7.3+j*.9;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.2,Math.sin(a)*r*.6-2));}const line=stroke(pts,palette[j],.12-j*.025);line.rotation.z=.2;root.add(line);lines.push(line);}
  }else if(id==='heart'){
    for(let j=0;j<3;j++){const pts=[];for(let i=0;i<=260;i++){const a=i/260*TAU,r=4.7+j*.48;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.69,Math.sin(a*2+j)*1.1-2.4));}const line=stroke(pts,palette[j%2],.18-j*.035);line.rotation.z=-.35+j*.21;root.add(line);lines.push(line);}
  }else if(id==='tree'){
    const pts=[];for(let i=0;i<=320;i++){const t=i/320,a=t*TAU*3.7,r=(1-t)*5.4+.4;pts.push(new THREE.Vector3(Math.cos(a)*r,t*11-5,Math.sin(a)*r-2));}const line=stroke(pts,palette[0],.16);root.add(line);lines.push(line);
    const snow=[];for(let i=0;i<38;i++){const x=(random()-.5)*17,y=(random()-.5)*13,z=-3-random()*8,s=.025+random()*.045;for(let arm=0;arm<3;arm++){const a=arm/3*Math.PI; snow.push(x-Math.cos(a)*s,y-Math.sin(a)*s,z,x+Math.cos(a)*s,y+Math.sin(a)*s,z);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(snow,3));root.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#c9bd9a',transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending})));
  }else if(id==='flower'){
    for(let j=0;j<4;j++){const pts=[];for(let i=0;i<=180;i++){const t=i/180,a=t*Math.PI*1.6+j*Math.PI/2,r=4+t*2;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r*.4-1.4,Math.sin(a)*r*.55-3));}const line=stroke(pts,palette[j%2],.13);root.add(line);lines.push(line);}
  }else{
    const bubbleGeometry=new THREE.SphereGeometry(1,12,8),bubbleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:uniforms.uTime},
      vertexShader:`uniform float uTime;varying vec3 vN;varying vec3 vP;void main(){vec4 p=instanceMatrix*vec4(position,1.);p.y=mod(p.y+13.+uTime*.045,26.)-13.;vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);vec4 mv=modelViewMatrix*p;vP=mv.xyz;gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vN;varying vec3 vP;void main(){float edge=pow(1.-abs(dot(normalize(vN),normalize(-vP))),4.);gl_FragColor=vec4(.28,.55,.63,edge*.12);}`});
    bubbles=new THREE.InstancedMesh(bubbleGeometry,bubbleMaterial,52);const dummy=new THREE.Object3D();for(let i=0;i<52;i++){dummy.position.set((random()-.5)*23,(random()-.5)*23,-4-random()*15);dummy.scale.setScalar(.025+random()*.14);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);}bubbles.frustumCulled=false;root.add(bubbles);
  }
  return{root,update(time,scatter,quality){uniforms.uTime.value=time;uniforms.uAmount.value=.65+scatter*.35;geometry.setDrawRange(0,Math.round(count*Math.max(.35,quality)));lines.forEach((line,i)=>{line.rotation.y=Math.sin(time*.035+i)*.07;line.material.opacity=(id==='heart'?.16:id==='tree'?.15:.105)*(1-scatter*.5);});if(rocks){rocks.rotation.y=time*.009;rocks.count=Math.round(rockCount*Math.max(.35,quality));rocks.material.opacity=.78*(1-scatter*.8);}if(bubbles)bubbles.count=Math.round(52*Math.max(.4,quality));}};
}
