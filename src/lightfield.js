import * as THREE from 'three';
import {createKineticRibbons} from './kinetic-ribbons.js';

const TAU = Math.PI * 2;
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// All atmosphere is generated in the browser; no video or image background.
export function createLightfield() {
  const root = new THREE.Group();
  const ribbons=createKineticRibbons();root.add(ribbons.mesh);
  const color = new THREE.Color('#e1bb87'), secondary = new THREE.Color('#6d82c8');
  const uniforms = {uTime:{value:0},uColor:{value:color},uSecondary:{value:secondary},uEnergy:{value:0},uOcean:{value:0},uStyle:{value:0}};
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(38,27),new THREE.ShaderMaterial({
    uniforms,vertexShader:vertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform vec3 uSecondary;uniform float uEnergy;uniform float uStyle;
    void main(){
      vec2 p=(vUv-.5)*vec2(1.25,1.);float r=length(p);
      float mist=.54+.21*sin(p.x*7.+p.y*4.+uTime*.05)*cos(p.y*8.-uTime*.04);
      float cloud=exp(-r*r*12.)*mist*mist;
      float collar=exp(-pow((r-.28)*15.,2.))*.014;
      float falloff=exp(-dot(p*vec2(2.,2.4),p*vec2(2.,2.4)));
      if(uStyle>1.5&&uStyle<2.5)collar=0.;
      if(uStyle>3.5)collar=0.;
      vec3 c=mix(uSecondary,uColor,smoothstep(-.38,.4,p.x+p.y*.19));
      float a=(cloud*.22+collar+falloff*.018)*(1.+uEnergy*.35);
      gl_FragColor=vec4(c*(.65+mist),a);
    }`
  }));
  haze.position.set(0,0,-10);root.add(haze);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32,32),new THREE.ShaderMaterial({
    uniforms,vertexShader:vertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform vec3 uSecondary;uniform float uEnergy;uniform float uOcean;uniform float uStyle;
    void main(){
      vec2 p=(vUv-.5)*2.;
      float r=length(p);
      float glow=exp(-r*r*22.);
      float rim=(exp(-pow((r-.3)*92.,2.))*.10+exp(-pow((r-.34)*140.,2.))*.042)*(1.-step(.5,uStyle));
      float arc=.5+.5*sin(atan(p.y,p.x)*2.+uTime*.13);
      float water=0.;
      if(uOcean>.5){
        vec2 q=p*23.;float t=uTime*.30;
        float lattice=sin(q.x+sin(q.y*.72+t)*1.5)+sin(q.y*1.3+sin(q.x*.82-t)*1.2);
        water=(1.-smoothstep(.035,.36,abs(lattice)))*exp(-r*r*12.)*.072;
        water+=pow(max(0.,sin(r*58.-t)),11.)*exp(-r*8.)*.06;
      }
      vec3 c=mix(uSecondary,uColor,.74);
      gl_FragColor=vec4(c,(glow*.093+rim*arc+water)*(1.+uEnergy*.6));
    }`
  }));
  floor.rotation.x=-Math.PI/2;floor.position.y=-4.7;root.add(floor);

  const orbits = new THREE.Group(), orbitMaterials=[];
  for(let band=0;band<3;band++){
    const points=[];
    for(let i=0;i<=360;i++){const a=i/360*TAU,r=6.4+band*1.15;points.push(Math.cos(a)*r,Math.sin(a*2+band)*.17,Math.sin(a)*r);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const material=new THREE.LineDashedMaterial({color:'#d7a779',transparent:true,opacity:.17-band*.035,dashSize:band===1?.04:.55,gapSize:band===1?.22:.18,depthWrite:false,blending:THREE.AdditiveBlending});
    const line=new THREE.Line(geometry,material);line.computeLineDistances();line.rotation.set(.15+band*.28,band*.7,.14+band*.12);orbits.add(line);orbitMaterials.push(material);
  }
  orbits.rotation.set(.25,0,-.12);root.add(orbits);

  let seed=732;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const count=1400,positions=[],sizes=[],phases=[];
  for(let i=0;i<count;i++){const angle=random()*TAU,r=5+random()*15;positions.push(Math.cos(angle)*r,(random()-.5)*19,Math.sin(angle)*r-5);sizes.push(.5+random()*2.7);phases.push(random()*TAU);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
  const dust = new THREE.Points(geometry,new THREE.ShaderMaterial({
    uniforms:{...uniforms,uFraming:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime;uniform float uFraming;attribute float aSize;attribute float aPhase;varying float vGlow;varying float vPhase;
    void main(){vec3 p=position;p.x+=sin(uTime*.06+aPhase)*.7;p.y+=sin(uTime*.12+aPhase)*.8;p.x*=uFraming;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*34./-mv.z,1.,8.);vGlow=.3+.7*pow(.5+.5*sin(uTime*.5+aPhase),2.);vPhase=aPhase;}`,
    fragmentShader:`uniform vec3 uColor;uniform vec3 uSecondary;varying float vGlow;varying float vPhase;void main(){vec2 p=(gl_PointCoord-.5)*2.;float r=length(p);if(r>1.)discard;float a=exp(-r*r*6.);float cross=exp(-abs(p.x)*32.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*32.)*exp(-abs(p.x)*4.);vec3 c=mix(uColor,uSecondary,.5+.5*sin(vPhase));gl_FragColor=vec4(c*1.6,(a*.45+cross*.13)*vGlow);}`
  }));dust.frustumCulled=false;root.add(dust);

  const targetColor=color.clone(),targetSecondary=secondary.clone();
  let worldId=null;
  return {root,setWorld(world){
      ribbons.setWorld(world);targetColor.set(world.color);
      targetSecondary.set({saturn:'#687fd1',heart:'#9979e5',tree:'#3d9c79',flower:'#ad85ca',ocean:'#7769c1'}[world.id]);
      if(!worldId){color.copy(targetColor);secondary.copy(targetSecondary);}
      worldId=world.id;orbits.visible=world.id==='saturn';
      uniforms.uOcean.value=world.id==='ocean'?1:0;uniforms.uStyle.value=['saturn','heart','tree','flower','ocean'].indexOf(world.id);
    },
    update(time,scatter,quality,framing,camera,response=0,delta=1/60){
      const ease=1-Math.exp(-delta*4.3);
      color.lerp(targetColor,ease);secondary.lerp(targetSecondary,ease);uniforms.uTime.value=time;uniforms.uEnergy.value=scatter+response*.5;
      ribbons.update(time,scatter,quality,framing,response);
      haze.quaternion.copy(camera.quaternion);orbits.rotation.y=time*.025;orbits.rotation.z=-.12+Math.sin(time*.08)*.035;orbits.scale.set(framing,1,1);
      const visibility=worldId==='saturn'?.14:0;
      orbitMaterials.forEach((m,i)=>{m.color.copy(color);m.opacity=visibility*(1-i*.2)*(1+scatter*.4);});
      dust.material.uniforms.uFraming.value=framing;geometry.setDrawRange(0,Math.max(400,Math.round(count*quality)));floor.material.uniforms.uTime.value=time;
    }
  };
}
