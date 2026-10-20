import {heartSurface} from './sculptures.js';

const TAU=Math.PI*2;
export const WORLD_STAGES={
  saturn:[['星环',0],['轨道',.45],['星系',1]],
  heart:[['凝聚',0],['心动',.42],['星团',1]],
  tree:[['成树',0],['流光',.5],['星雨',1]],
  flower:[['花苞',0],['盛放',.55],['花雨',1]],
  ocean:[['静游',0],['潮汐',.48],['微光群',1]],
};

// Randomized volume sampling keeps a low-quality prefix spatially complete.
export function heartCloud(random){
  const p=heartSurface(Math.acos(random()*2-1),random()*TAU),r=Math.cbrt(random());
  return[p[0]*r*1.62,(p[1]+.35)*r*1.45-.25,p[2]*r*1.65];
}
export function galaxyArm(random,index){
  const radius=.8+Math.sqrt(random())*5.6,angle=index%4/4*TAU+radius*.58+(random()-.5)*.45;
  return[Math.cos(angle)*radius,Math.sin(angle)*radius*.45+(random()-.5)*.65,Math.sin(angle)*radius*.58];
}
export function oceanCurrent(random,index){
  const level=(index*.61803398875)%1,angle=index*2.3999632297,radius=.9+Math.sqrt(random())*4.7;
  return[Math.cos(angle)*radius,(level-.5)*8.3,Math.sin(angle)*2.9+(random()-.5)*.5];
}
