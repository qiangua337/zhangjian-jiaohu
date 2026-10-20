import * as THREE from 'three';

export function createResponseField(){
  const root=new THREE.Group();root.visible=false;
  const uniforms={uAge:{value:10},uPower:{value:0},uColor:{value:new THREE.Color('#edcc9f')},uReduced:{value:0}};
  const wave=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uAge;uniform float uPower;uniform float uReduced;uniform vec3 uColor;varying vec2 vUv;
    void main(){vec2 p=(vUv-.5)*2.;float r=length(p),radius=mix(.07+min(uAge*.58,.85),.22,uReduced);float ring=exp(-pow((r-radius)*95.,2.));float mist=exp(-r*r*22.)*.09;float a=(ring*.48+mist)*uPower;gl_FragColor=vec4(uColor*1.7,a);}`
  }));root.add(wave);
  const positions=[],seeds=[];
  for(let i=0;i<144;i++){const a=i*2.3999632297,r=.4+(i*.75487766625)%1;positions.push(Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*1.7)*.55);seeds.push((i*.61803398875)%1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
  const sparks=new THREE.Points(geometry,new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uAge;uniform float uReduced;attribute float aSeed;varying float vLight;void main(){vec3 p=position*(.16+uAge*2.8)*(1.-uReduced);p.y+=uAge*uAge*.18*(1.-uReduced);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((2.+aSeed*3.)*14./-mv.z,1.,6.);vLight=.4+aSeed*.6;}`,
    fragmentShader:`uniform float uPower;uniform float uReduced;uniform vec3 uColor;varying float vLight;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(uColor*2.,exp(-r*r*5.)*uPower*vLight*(1.-uReduced));}`
  }));sparks.frustumCulled=false;root.add(sparks);
  return{root,fire(position,color){root.position.copy(position);uniforms.uColor.value.set(color);},update(age,power,reduced,camera){root.visible=power>.004;uniforms.uAge.value=age;uniforms.uPower.value=power;uniforms.uReduced.value=reduced?1:0;wave.quaternion.copy(camera.quaternion);}};
}
