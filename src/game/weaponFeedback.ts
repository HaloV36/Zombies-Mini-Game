import type { Weapon } from '../types';

export function weaponFamily(w:Weapon) {
 return w.category ?? ({pistol:'pistol',carbine:'rifle',thompson:'smg',shotgun:'shotgun'} as const)[w.id] ?? 'rifle';
}
export function feedbackProfile(w:Weapon) {
 const family=weaponFamily(w);
 const base={pistol:[180,.16,.13,.038,.08],revolver:[125,.24,.22,.055,.12],shotgun:[75,.38,.31,.075,.17],rifle:[145,.21,.12,.03,.07],smg:[220,.12,.075,.022,.045],sniper:[90,.42,.26,.065,.14]}[family];
 let seed=2166136261;for(const ch of w.id) seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 const variant=(seed%997)/997;
 return {family,seed,bodyHz:base[0]*(.84+variant*.32),tail:base[1]*(.85+variant*.3),crackHz:1800+variant*2800,
  pitch:base[2]*(.9+variant*.2),rise:base[3],push:base[4],mechanism:.025+variant*.045};
}

// Offline PCM synthesis: pressure crack + body + filtered outdoor reflections,
// with a seeded mechanical signature per gun. No pitched arcade oscillator shot.
export function synthesizeShot(w:Weapon,rate=44100):Float32Array {
 const p=feedbackProfile(w),out=new Float32Array(Math.ceil((p.tail*2+.18)*rate));
 let seed=p.seed,low=0,bodyPhase=0;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 const cutoff=1-Math.exp(-2*Math.PI*p.crackHz/rate);
 for(let i=0;i<out.length;i++) {
  const t=i/rate,n=random();low+=cutoff*(n-low);
  bodyPhase+=2*Math.PI*p.bodyHz*Math.exp(-t*7)/rate;
  const attack=Math.min(1,t/.0007);
  let sample=(n-low)*Math.exp(-t/.008)*.8+low*Math.exp(-t/(p.tail*.2))*.7;
  sample+=Math.sin(bodyPhase)*Math.exp(-t/(p.tail*.24))*.38;
  const m=t-p.mechanism;if(m>0)sample+=(n*.28+Math.sin(m*2*Math.PI*2400)*.12)*Math.exp(-m/.012);
  for(const delay of [.047,.089,.151]) if(t>delay)sample+=low*.11*Math.exp(-(t-delay)/(p.tail*.45));
  out[i]=Math.tanh(sample*attack*1.3)*.68;
 }
 return out;
}

export const RELOAD_EVENTS={
 pistol:[[.06,1700,.035],[.35,420,.06],[.67,1000,.04],[.85,2100,.05]],
 revolver:[[.04,850,.05],[.25,2700,.12],[.47,1600,.1],[.75,600,.065],[.91,1900,.025]],
 shotgun:[[.04,380,.1],[.23,1300,.05],[.40,1300,.05],[.57,1300,.05],[.75,480,.11],[.89,900,.07]],
 rifle:[[.05,1100,.05],[.28,500,.065],[.61,700,.07],[.81,2100,.045],[.93,850,.03]],
 smg:[[.04,1900,.025],[.22,800,.04],[.57,1400,.04],[.76,3000,.035],[.9,1100,.035]],
 sniper:[[.03,650,.12],[.25,1800,.04],[.53,500,.075],[.77,750,.1],[.92,1400,.035]],
} as const;

export function synthesizeReload(w:Weapon,duration:number,rate=44100):Float32Array {
 const out=new Float32Array(Math.ceil(duration*rate));let seed=feedbackProfile(w).seed;
 for(const [fraction,hz,decay] of RELOAD_EVENTS[weaponFamily(w)]) {
  const start=Math.floor(fraction*out.length);const length=Math.min(out.length-start,Math.ceil(decay*4*rate));let low=0;
  for(let i=0;i<length;i++) {
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;
   low+=(1-Math.exp(-2*Math.PI*hz/rate))*(n-low);const t=i/rate;
   out[start+i]+=(low*.65+Math.sin(2*Math.PI*hz*t)*.08)*Math.exp(-t/decay)*Math.min(1,t/.001)*.5;
  }
 }
 return out;
}
