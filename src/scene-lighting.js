import * as THREE from 'three';

export const SATURN_KEY = [-6, 5, 4];

// A different set of studio lights for each sculpture.
const lighting = {
  saturn: { key: ['#ffe1b2', 3.15, SATURN_KEY], fill: ['#b7c9f4', .48], rim: ['#8dbaf4', 1.45], sky: '#b2c4e9', ground: '#383049', ambient: .32, bloom: [.51, 1.11] },
  heart: { key: ['#ffe3e9', 2.25, [-5, 7, 5]], fill: ['#b4a6e2', .62], rim: ['#b8c7ff', 1.7], sky: '#c5b4e8', ground: '#5e203f', ambient: .38, bloom: [.41, 1.13] },
  tree: { key: ['#ffe4b4', 3.25, [-4, 7, 5]], fill: ['#a2c8c1', .74], rim: ['#76d3ae', 1.65], sky: '#a1c9b4', ground: '#39443d', ambient: .55, bloom: [.63, 1.07] },
  flower: { key: ['#fff2e5', 2.7, [-5, 7, 5]], fill: ['#c7a2d9', .78], rim: ['#ffd5b5', 1.75], sky: '#e0c6f0', ground: '#663657', ambient: .49, bloom: [.37, 1.19] },
  ocean: { key: ['#ccf7f1', 2.1, [-4, 8, 4]], fill: ['#889fdd', .66], rim: ['#84e8dc', 1.52], sky: '#90b9dd', ground: '#252a54', ambient: .3, bloom: [.64, 1.05] },
};

export function createStageLights(scene) {
  const ambient = new THREE.HemisphereLight();
  const key = new THREE.DirectionalLight();
  const fill = new THREE.DirectionalLight();
  const rim = new THREE.DirectionalLight();
  fill.position.set(5, 1, 6);
  rim.position.set(3, 3, -6);
  scene.add(ambient, key, fill, rim);
  return {
    setWorld(id) {
      const profile = lighting[id];
      ambient.color.set(profile.sky);
      ambient.groundColor.set(profile.ground);
      ambient.intensity = profile.ambient;
      key.position.set(...profile.key[2]);
      for (const [light, [color, intensity]] of [[key, profile.key], [fill, profile.fill], [rim, profile.rim]]) {
        light.color.set(color);
        light.intensity = intensity;
      }
      return profile.bloom;
    },
  };
}
