let audioCtx;
let soundOn = true;

export function initAudio(){
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
}

function tone(freq=440, dur=0.12, type='sine', gain=0.04){
  if(!soundOn || !audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.value = 0; g.gain.setTargetAtTime(gain, t, 0.01);
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  g.gain.setTargetAtTime(0, t+dur, 0.05);
  osc.stop(t + dur + 0.1);
}

export const sfx = {
  toggle(v){ soundOn = v; },
  correct(){ tone(740, .08, 'triangle'); setTimeout(()=>tone(880,.12,'triangle'), 60); },
  wrong(){ tone(180,.18,'sawtooth', .06); },
  ui(){ tone(520,.08,'sine'); }
};
