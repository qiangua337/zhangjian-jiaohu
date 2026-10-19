import * as THREE from 'three';

export function studioEnvironment(renderer) {
  const width=512,height=256,data=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/height;
    const softbox=(cx,cy,sx,sy)=>Math.exp(-((u-cx)**2/sx+(v-cy)**2/sy));
    const key=softbox(.22,.29,.014,.055)*3.8,strip=softbox(.73,.43,.004,.07)*2.1,top=softbox(.5,.12,.2,.012)*.8,i=(y*width+x)*4;
    data.set([.035+key*1.08+strip*.78+top,.04+key*.98+strip*.86+top*.94,.065+key*.94+strip*1.16+top*.95,1],i);
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);
  texture.dispose();pmrem.dispose();return target;
}

export function createAtmosphere() {
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uBase:{value:new THREE.Color('#060a13')},uTint:{value:new THREE.Color('#8787b0')}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform vec3 uBase;uniform vec3 uTint;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float cloud(vec2 p){float n=0.,a=.5;for(int i=0;i<3;i++){n+=noise(p)*a;p=p*2.03+vec2(4.2,1.7);a*=.5;}return n;}
    void main(){vec2 p=vUv*vec2(4.5,3.);float n=cloud(p+uTime*.006);float band=exp(-pow((vUv.y-.52+(vUv.x-.6)*.22)*2.8,2.));float focus=exp(-length((vUv-vec2(.65,.55))*vec2(1.4,1.8))*2.);vec3 c=uBase+uTint*pow(n,2.4)*band*focus*.19;float grain=(hash(gl_FragCoord.xy)-.5)/1800.;gl_FragColor=vec4(c+grain,1.);}`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-1000;
  return {mesh,material,setWorld(world){material.uniforms.uBase.value.set(world.bg);material.uniforms.uTint.value.set(world.color);},update(time){material.uniforms.uTime.value=time;}};
}
