import * as THREE from 'three';
import { SATURN_KEY } from './scene-lighting.js';

export function cloudBands() {
  const width = 768, height = 384;
  const pixels = new Uint8Array(width * height * 4);
  const turn = Math.PI * 2;
  const longitudes = Array.from({ length: width }, (_, x) => {
    const angle = x / width * turn;
    return {
      storm: (.5 + .5 * Math.cos(angle - 2.15)) ** 18,
      lowSin: Math.sin(angle * 4), lowCos: Math.cos(angle * 4),
      highSin: Math.sin(angle * 11), highCos: Math.cos(angle * 11),
      cloud: angle * 22,
    };
  });
  for (let y = 0; y < height; y++) {
    const lat = y / (height - 1), pole = Math.abs(lat - .5) * 2;
    const stormLatitude = Math.exp(-((lat - .64) ** 2) / .0011);
    const lowSin = Math.sin(lat * 38), lowCos = Math.cos(lat * 38);
    const highSin = Math.sin(lat * 29), highCos = Math.cos(lat * 29);
    for (let x = 0; x < width; x++) {
      const longitude = longitudes[x];
      const storm = stormLatitude * longitude.storm;
      const curl = (longitude.lowSin * lowCos + longitude.lowCos * lowSin) * .006 +
        (longitude.highSin * highCos - longitude.highCos * highSin) * .0025;
      const band = (lat + curl + storm * .017) * turn;
      const waves = .17 * Math.sin(band * 8.4) + .11 * Math.sin(band * 17.7 + .7) + .04 * Math.sin(band * 45.2);
      const cloud = waves + .032 * Math.sin(longitude.cloud + band * 26);
      const contrast = .53 + cloud - pole * .11;
      const i = (y * width + x) * 4;
      pixels[i] = 145 + contrast * 77 + storm * 9;
      pixels[i + 1] = 111 + contrast * 75 + pole * 8 + storm * 6;
      pixels[i + 2] = 83 + contrast * 64 + pole * 13;
      pixels[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function planetaryRings() {
  const light = new THREE.Vector3();
  const source = new THREE.Vector3(...SATURN_KEY).normalize();
  const rotation = new THREE.Quaternion();
  const uniforms = { uOpacity: { value: 1 }, uLight: { value: light } };
  const mesh = new THREE.Mesh(new THREE.RingGeometry(2.75, 5.46, 224, 1), new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec2 vRing;
      void main(){vRing=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uLight;
      varying vec2 vRing;
      float gap(float r,float center,float width){return 1.-smoothstep(width*.52,width,abs(r-center));}
      void main(){
        float r=length(vRing);
        float t=(r-2.75)/2.71;
        float footprint=fwidth(r);
        float fine=sin(r*140.)*(1.-smoothstep(.008,.028,footprint));
        float bands=.53+.13*sin(r*28.)+.09*sin(r*57.)+.07*fine+.09*sin(r*9.);
        float divisions=1.-gap(r,4.14,.073)*.89-gap(r,4.86,.031)*.66-gap(r,3.08,.039)*.54;
        float edge=smoothstep(0.,.09,t)*(1.-smoothstep(.97,1.,t));
        vec3 p=vec3(vRing.x,0.,-vRing.y);
        float along=min(dot(p,uLight),0.);
        float terminator=smoothstep(2.00,2.22,length(p-uLight*along));
        vec3 stone=mix(vec3(.26,.17,.12),vec3(.89,.70,.46),bands);
        stone=mix(stone,vec3(.68,.66,.68),smoothstep(.62,.91,t)*.29);
        float glint=.13+.10*smoothstep(-3.,4.,dot(vRing,vec2(.82,.4)));
        vec3 lit=stone*(.13+.87*terminator)+vec3(.08,.10,.15)*(1.-terminator);
        gl_FragColor=vec4(lit,(bands*.74+glint)*divisions*edge*uOpacity);
      }`,
  }));
  mesh.rotation.x = -Math.PI / 2;
  return {
    mesh,
    update(root, planet, opacity) {
      uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > .005;
      if (mesh.visible) {
        rotation.multiplyQuaternions(root.quaternion, planet.quaternion).invert();
        light.copy(source).applyQuaternion(rotation);
      }
    },
  };
}
