import * as THREE from 'three';

const TAU = Math.PI * 2;
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// All atmosphere is generated in the browser; no video or image background.
export function createLightfield() {
  const root = new THREE.Group();
  const color = new THREE.Color('#e1bb87'), secondary = new THREE.Color('#6d82c8');
  const uniforms = {uTime:{value:0},uColor:{value:color},uSecondary:{value:secondary},uEnergy:{value:0},uOcean:{value:0}};
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(38,27),new THREE.ShaderMaterial({
    uniforms,vertexShader:vertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform vec3 uSecondary;uniform float uEnergy;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    float fbm(vec2 p){float f=0.,a=.5;for(int i=0;i<3;i++){f+=noise(p)*a;p=p*2.07+3.1;a*=.5;}return f;}
    void main(){vec2 p=(vUv-.5)*vec2(1.25,1.);float r=length(p);float mist=fbm(p*5.+vec2(uTime*.012,-uTime*.009));float cloud=exp(-r*r*12.)*pow(mist,1.8);float halo=exp(-pow((r-.28)*18.,2.))*.14;float ray=pow(max(0.,1.-abs(p.x+p.y*.26)*2.5),8.)*exp(-length(p-vec2(.05,.12))*4.);vec3 c=mix(uSecondary,uColor,smoothstep(-.3,.4,p.x));float a=(cloud*.35+halo*.12+ray*.025)*(1.+uEnergy*.35);gl_FragColor=vec4(c*(.65+mist),a);}`
  }));
  haze.position.set(0,0,-10);root.add(haze);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(32,32),new THREE.ShaderMaterial({
    uniforms,vertexShader:vertex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uColor;uniform vec3 uSecondary;uniform float uEnergy;uniform float uOcean;
    void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float glow=exp(-r*r*22.);float rim=exp(-pow((r-.3)*100.,2.))*.1+exp(-pow((r-.34)*170.,2.))*.055;float wave=pow(max(0.,sin(r*75.-uTime*.8)),18.)*exp(-r*7.)*.13*uOcean;float arc=.5+.5*sin(atan(p.y,p.x)*2.+uTime*.13);vec3 c=mix(uSecondary,uColor,.72);gl_FragColor=vec4(c,(glow*.035+rim*arc+wave)*(1.+uEnergy*.6));}`
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
  let worldId='saturn';
  return {root,setWorld(world){worldId=world.id;targetColor.set(world.color);targetSecondary.set({saturn:'#687fd1',heart:'#9979e5',tree:'#448d7b',flower:'#9b85d4',ocean:'#a67cdb'}[world.id]);uniforms.uOcean.value=world.id==='ocean'?1:0;},
    update(time,scatter,quality,framing,camera){
      color.lerp(targetColor,.035);secondary.lerp(targetSecondary,.035);uniforms.uTime.value=time;uniforms.uEnergy.value=scatter;
      haze.quaternion.copy(camera.quaternion);orbits.rotation.y=time*.025;orbits.rotation.z=-.12+Math.sin(time*.08)*.035;orbits.scale.set(framing,1,1);
      const visibility={saturn:.18,heart:.13,tree:.08,flower:.11,ocean:.09}[worldId];
      orbitMaterials.forEach((m,i)=>{m.color.copy(color);m.opacity=visibility*(1-i*.2)*(1+scatter*.4);});
      dust.material.uniforms.uFraming.value=framing;geometry.setDrawRange(0,Math.max(400,Math.round(count*quality)));floor.material.uniforms.uTime.value=time;
    }
  };
}
