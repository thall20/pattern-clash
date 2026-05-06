import { BUTTON_NOTES } from "../engine/difficultyConfig";

function ctx(): AudioContext | null {
  try { return new AudioContext(); } catch { return null; }
}

export function playNote(index: number) {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  const freq = BUTTON_NOTES[index] ?? BUTTON_NOTES[0];

  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.frequency.value = freq; osc.type = "triangle";
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.28, t + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc.start(t); osc.stop(t + 0.22);

  const osc2 = ac.createOscillator(); const gain2 = ac.createGain();
  osc2.connect(gain2); gain2.connect(ac.destination);
  osc2.frequency.value = freq / 2; osc2.type = "sine";
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.linearRampToValueAtTime(0.08, t + 0.018);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc2.start(t); osc2.stop(t + 0.14);
}

export function playLock() {
  const ac = ctx(); if (!ac) return;
  [392, 523, 784].forEach((freq, i) => {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = freq; osc.type = "sine";
    const t = ac.currentTime + i * 0.09;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.18);
  });
}

export function playSuccess() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = freq; osc.type = "sine";
    const s = t + i * 0.115;
    gain.gain.setValueAtTime(0, s);
    gain.gain.linearRampToValueAtTime(0.24, s + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, s + 0.22);
    osc.start(s); osc.stop(s + 0.22);
  });
  [523, 659, 784].forEach((freq) => {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = freq; osc.type = "sine";
    const s = t + 0.5;
    gain.gain.setValueAtTime(0.12, s);
    gain.gain.exponentialRampToValueAtTime(0.001, s + 0.6);
    osc.start(s); osc.stop(s + 0.6);
  });
}

export function playFail() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.42);
  osc.type = "sawtooth";
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.setValueAtTime(0.22, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  osc.start(t); osc.stop(t + 0.42);
}

export function playLevelUp() {
  const ac = ctx(); if (!ac) return;
  const t = ac.currentTime;
  [392, 523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = freq; osc.type = "sine";
    const s = t + i * 0.09;
    gain.gain.setValueAtTime(0, s);
    gain.gain.linearRampToValueAtTime(0.2, s + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, s + 0.18);
    osc.start(s); osc.stop(s + 0.18);
  });
}
