/**
 * Offline render of SEVEN distinct soundtracks for the week-1 campaign →
 * public/week1-day{1..7}.wav — one per video, each with its own tempo, key,
 * groove and mood, and with every SFX cue aligned to that day's actual scene
 * timings in src/Campaign.tsx.
 *
 *   node scripts/render-week1-audio.mjs
 *
 * Engine notes (same constraints as render-audio.mjs):
 *  - node-web-audio-api's setTargetAtTime is unstable → linear ramps only.
 *  - exponentialRampToValueAtTime can't hit 0 → land on 0.0001.
 */
import { OfflineAudioContext } from "node-web-audio-api";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// ── reusable track builder ────────────────────────────────────────────────────
async function renderTrack(spec) {
  const { file, dur } = spec;
  const ctx = new OfflineAudioContext({
    numberOfChannels: 1,
    length: Math.ceil(dur * SR),
    sampleRate: SR,
  });

  const master = ctx.createGain();
  master.gain.value = 0.72;
  master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 28;
  comp.ratio.value = 6;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  comp.connect(master);
  const bus = comp;

  // Pad / drone --------------------------------------------------------------
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 400;
  padFilter.Q.value = 1.3;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.0001;
  padFilter.connect(padGain);
  padGain.connect(bus);

  spec.chord.forEach(([f, vol, wave]) => {
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = f;
    const det = ctx.createOscillator();
    det.type = wave;
    det.frequency.value = f * 1.004;
    const g = ctx.createGain();
    g.gain.value = vol;
    o.connect(g);
    det.connect(g);
    g.connect(padFilter);
    o.start(0);
    det.start(0);
    o.stop(dur);
    det.stop(dur);
  });

  const lfo = ctx.createOscillator();
  lfo.frequency.value = spec.lfoRate ?? 0.08;
  const lfoG = ctx.createGain();
  lfoG.gain.value = spec.lfoDepth ?? 140;
  lfo.connect(lfoG);
  lfoG.connect(padFilter.frequency);
  lfo.start(0);
  lfo.stop(dur);

  // Buses for groove voices ----------------------------------------------------
  const arpGain = ctx.createGain();
  arpGain.gain.value = 0.0001;
  arpGain.connect(bus);
  const kickGain = ctx.createGain();
  kickGain.gain.value = 0.0001;
  kickGain.connect(bus);
  const hatGain = ctx.createGain();
  hatGain.gain.value = 0.0001;
  hatGain.connect(bus);

  const noiseBuf = ctx.createBuffer(1, Math.floor(SR * 1.2), SR);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const automate = (param, v0, steps) => {
    param.setValueAtTime(v0, 0);
    let prev = v0;
    let lastT = 0;
    for (const { at, to, dur: d } of steps) {
      if (at > lastT) param.setValueAtTime(prev, at);
      param.linearRampToValueAtTime(to, at + d);
      prev = to;
      lastT = at + d;
    }
  };

  automate(padGain.gain, 0.0001, spec.padAuto);
  automate(padFilter.frequency, spec.padFreq0, spec.padFreqAuto);
  automate(arpGain.gain, 0.0001, spec.arpAuto);
  automate(kickGain.gain, 0.0001, spec.kickAuto);
  if (spec.hatAuto) automate(hatGain.gain, 0.0001, spec.hatAuto);

  // Voices ---------------------------------------------------------------------
  function pluck(freq, t, d, vel = 1, bright = 2600) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = "square";
    o2.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = bright;
    f.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const sub = ctx.createGain();
    sub.gain.value = 0.5;
    o.connect(g);
    o2.connect(sub);
    sub.connect(g);
    g.connect(f);
    f.connect(arpGain);
    o.start(t);
    o2.start(t);
    o.stop(t + d + 0.02);
    o2.stop(t + d + 0.02);
  }

  function kick(t, vel = 1, punch = 150) {
    const o = ctx.createOscillator();
    o.type = "sine";
    const g = ctx.createGain();
    o.frequency.setValueAtTime(punch, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g);
    g.connect(kickGain);
    o.start(t);
    o.stop(t + 0.26);
  }

  function hat(t, vel = 1, open = false) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7000;
    const g = ctx.createGain();
    const d = open ? 0.2 : 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f);
    f.connect(g);
    g.connect(hatGain);
    src.start(t);
    src.stop(t + d + 0.02);
  }

  // Groove — spec decides what plays on each 16th step.
  const sixteenth = 60 / spec.bpm / 4;
  for (let step = 0; step * sixteenth < dur; step++) {
    const t = step * sixteenth;
    spec.groove({ step, t, beat: step % 4, bar16: step % 16, kick, pluck, hat, sixteenth });
  }

  // One-shot SFX ---------------------------------------------------------------
  function noise(t, d, type = "highpass", freq = 1000, peak = 0.5, sweep = null) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.8;
    if (sweep) {
      f.frequency.setValueAtTime(sweep[0], t);
      f.frequency.exponentialRampToValueAtTime(sweep[1], t + d);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + d * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t);
    src.stop(t + d + 0.02);
  }

  function sfx(type, t, opt = {}) {
    if (t >= dur - 0.05) return;
    if (type === "impact") {
      const o = ctx.createOscillator();
      o.type = "sine";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.28);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.5);
      noise(t, 0.18, "bandpass", 1800, 0.5);
    } else if (type === "glitch") {
      noise(t, 0.08, "highpass", 2600, 0.35);
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 90;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.08);
    } else if (type === "riser") {
      const d = opt.dur ?? 1.0;
      noise(t, d, "bandpass", 600, 0.42, [400, 6000]);
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + d * 0.95);
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(440, t + d);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + d + 0.05);
    } else if (type === "whoosh") {
      noise(t, 0.55, "bandpass", 800, 0.5, [300, 4000]);
    } else if (type === "boom") {
      const o = ctx.createOscillator();
      o.type = "sine";
      const g = ctx.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
      g.gain.setValueAtTime(1.0, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.95);
    } else if (type === "tick") {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = opt.freq ?? 1500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(opt.vel ?? 0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.05);
    } else if (type === "pop") {
      const o = ctx.createOscillator();
      o.type = "sine";
      const g = ctx.createGain();
      const f0 = opt.freq ?? 520;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.7, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(opt.vel ?? 0.32, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.14);
    } else if (type === "ding") {
      const base = opt.freq ?? 880;
      [base, base * 1.5, base * 2].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = ctx.createGain();
        const peak = (opt.vel ?? 0.22) / (i + 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g);
        g.connect(bus);
        o.start(t);
        o.stop(t + 0.65);
      });
    } else if (type === "powerup") {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(5000, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.5);
      o.connect(f);
      f.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.65);
    } else if (type === "chime") {
      [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = fr * (opt.mult ?? 1);
        const g = ctx.createGain();
        const st = t + i * 0.06;
        const peak = 0.18 / (i * 0.5 + 1);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(peak, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 1.1);
        o.connect(g);
        g.connect(bus);
        o.start(st);
        o.stop(st + 1.2);
      });
    } else if (type === "typebell") {
      // Typewriter carriage bell — softer, single partial.
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 1318.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.55);
    }
  }

  for (const [ct, type, opt] of spec.cues) sfx(type, ct, opt);

  // Render + WAV ---------------------------------------------------------------
  const buffer = await ctx.startRendering();
  const data = buffer.getChannelData(0);
  const n = data.length;
  const dataSize = n * 2;
  const out = Buffer.alloc(44 + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
    out.writeInt16LE((s < 0 ? s * 0x8000 : s * 0x7fff) | 0, 44 + i * 2);
  }
  const dest = path.join(PUB, file);
  fs.writeFileSync(dest, out);
  console.log(`${file}  ${dur}s  peak ${peak.toFixed(2)}`);
}

// ── note helpers ──────────────────────────────────────────────────────────────
const N = {
  A1: 55, A2: 110, B2: 123.47, C2: 65.41, C3: 130.81, D3: 146.83, E2: 82.41,
  E3: 164.81, F2: 87.31, F3: 174.61, G2: 98, G3: 196, A3: 220, C4: 261.63,
  Cs4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392,
  A4: 440, B4: 493.88, C5: 523.25, Cs5: 554.37, D5: 587.33, E5: 659.25,
  G5: 783.99,
};

// ══ DAY 1 — 12s · "5-Second Test" · urgent countdown → triumphant flip ════════
// Scenes: hook 0–1.1 · countdown digits at 1.1/1.7/2.3/2.9/3.5 · light morph 4.2
// · rescored tile ~5.2 · CTA 8.0.
const day1 = {
  file: "week1-day1.wav",
  dur: 12,
  bpm: 140,
  chord: [
    [N.A1, 0.24, "sawtooth"], [N.A2, 0.13, "sawtooth"], [N.E3, 0.11, "sawtooth"],
    [N.A3, 0.07, "triangle"], [N.C4, 0.05, "triangle"], // A minor — tense
  ],
  padFreq0: 300,
  padAuto: [
    { at: 0, to: 0.55, dur: 0.5 },
    { at: 4.2, to: 0.34, dur: 0.3 },
    { at: 8.0, to: 0.46, dur: 0.3 },
  ],
  padFreqAuto: [
    { at: 0, to: 700, dur: 4.0 },
    { at: 4.2, to: 2200, dur: 0.3 },
    { at: 8.0, to: 1200, dur: 0.4 },
  ],
  arpAuto: [{ at: 4.2, to: 0.38, dur: 0.2 }, { at: 11.3, to: 0.12, dur: 0.5 }],
  kickAuto: [
    { at: 1.1, to: 0.55, dur: 0.1 },
    { at: 4.2, to: 0.95, dur: 0.1 },
    { at: 11.2, to: 0.0001, dur: 0.4 },
  ],
  hatAuto: [{ at: 4.2, to: 0.8, dur: 0.1 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (t < 4.2) {
      if (beat === 0) kick(t, 0.8, 120); // heartbeat under the countdown
      return;
    }
    if (beat === 0) kick(t, 1);
    if (bar16 === 10) kick(t, 0.5);
    if (beat === 2) hat(t, 1);
    const scale = [N.A3, N.C4, N.E4, N.A4, N.E4, N.C4];
    pluck(scale[step % scale.length], t, sixteenth * 1.6, 0.9);
  },
  cues: [
    [0.08, "impact"], [0.16, "glitch"],
    // countdown ticks on each digit (5→1)
    [1.1, "tick", { vel: 0.3 }], [1.7, "tick", { vel: 0.32 }],
    [2.3, "tick", { vel: 0.34, freq: 1700 }], [2.9, "tick", { vel: 0.36, freq: 1900 }],
    [3.5, "tick", { vel: 0.4, freq: 2100 }],
    [1.7, "glitch"], [2.9, "glitch"],
    [3.3, "riser", { dur: 0.9 }],
    [4.2, "boom"], [4.24, "whoosh"],
    [4.7, "chime"],
    [5.3, "ding"], [6.1, "ding", { freq: 1174.66 }],
    [7.6, "riser", { dur: 0.5 }],
    [8.0, "boom"], [8.5, "pop"], [9.0, "ding"],
    [10.4, "chime"],
  ],
};

// ══ DAY 2 — 14s · "AI grades my hook" · playful, curious demo ═════════════════
// Scenes: card ~0.4 · typing 0.7–2.2 · tiles 2.6/3.5/4.4 · amber flash 8.1 ·
// verdict pill 8.0 · dark CTA 11.2.
const day2 = {
  file: "week1-day2.wav",
  dur: 14,
  bpm: 112,
  chord: [
    [N.C2, 0.18, "triangle"], [N.C3, 0.12, "triangle"], [N.G3, 0.09, "triangle"],
    [N.E4, 0.05, "sine"], // C major — friendly
  ],
  padFreq0: 600,
  lfoRate: 0.15,
  padAuto: [
    { at: 0, to: 0.4, dur: 0.6 },
    { at: 11.2, to: 0.5, dur: 0.4 },
  ],
  padFreqAuto: [
    { at: 0, to: 1400, dur: 2.0 },
    { at: 11.2, to: 900, dur: 0.5 },
  ],
  arpAuto: [
    { at: 0.4, to: 0.24, dur: 0.3 },
    { at: 2.6, to: 0.34, dur: 0.2 },
    { at: 13.3, to: 0.1, dur: 0.5 },
  ],
  kickAuto: [{ at: 2.6, to: 0.7, dur: 0.2 }, { at: 13.2, to: 0.0001, dur: 0.5 }],
  hatAuto: [{ at: 4.4, to: 0.7, dur: 0.2 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (beat === 0 && t >= 2.6) kick(t, 0.85, 130);
    if (bar16 === 8 && t >= 4.4) kick(t, 0.45, 130);
    if (beat === 2 && t >= 4.4) hat(t, 0.8);
    // sparse marimba-ish plucks on the off-beats
    const scale = [N.C4, N.E4, N.G4, N.C5, N.G4, N.E4, N.D4, N.G4];
    if (step % 2 === 0) pluck(scale[(step / 2) % scale.length], t, sixteenth * 2.2, 0.75, 3200);
  },
  cues: [
    [0.3, "whoosh"],
    // typing blips while the hook line types in
    [0.8, "tick", { vel: 0.12, freq: 2400 }], [1.05, "tick", { vel: 0.11, freq: 2300 }],
    [1.3, "tick", { vel: 0.12, freq: 2500 }], [1.55, "tick", { vel: 0.11, freq: 2350 }],
    [1.8, "tick", { vel: 0.12, freq: 2450 }], [2.05, "tick", { vel: 0.1, freq: 2400 }],
    // one ding per score tile, rising pitch
    [2.9, "ding", { freq: 784 }], [3.8, "ding", { freq: 988 }], [4.7, "ding", { freq: 1175 }],
    [8.0, "whoosh"], [8.15, "pop", { freq: 620 }],
    [8.4, "glitch"], // the amber "fix retention" nudge
    [10.6, "riser", { dur: 0.55 }],
    [11.2, "boom"], [11.7, "chime"], [12.4, "ding"],
  ],
};

// ══ DAY 3 — 15s · "Why it flopped" · moody list → uplifting fix ═══════════════
// Scenes: rows at 1.6/2.9/4.2 · light morph 7.0 · fixes 7.4–9.2 · dark CTA 11.5.
const day3 = {
  file: "week1-day3.wav",
  dur: 15,
  bpm: 120,
  chord: [
    [N.E2, 0.22, "sawtooth"], [N.E3, 0.12, "sawtooth"], [N.G3, 0.1, "triangle"],
    [N.B2, 0.1, "sawtooth"], // E minor — brooding
  ],
  padFreq0: 320,
  lfoRate: 0.06,
  padAuto: [
    { at: 0, to: 0.52, dur: 0.8 },
    { at: 7.0, to: 0.34, dur: 0.4 },
    { at: 11.5, to: 0.48, dur: 0.4 },
  ],
  padFreqAuto: [
    { at: 0, to: 520, dur: 6.5 },
    { at: 7.0, to: 2100, dur: 0.4 },
    { at: 11.5, to: 1000, dur: 0.5 },
  ],
  arpAuto: [{ at: 7.0, to: 0.36, dur: 0.2 }, { at: 14.3, to: 0.1, dur: 0.5 }],
  kickAuto: [
    { at: 0.6, to: 0.5, dur: 0.2 },
    { at: 7.0, to: 0.9, dur: 0.15 },
    { at: 14.2, to: 0.0001, dur: 0.5 },
  ],
  hatAuto: [{ at: 7.0, to: 0.75, dur: 0.2 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (t < 7.0) {
      if (beat === 0) kick(t, 0.7, 110); // slow funeral pulse
      return;
    }
    if (beat === 0) kick(t, 1);
    if (bar16 === 10) kick(t, 0.5);
    if (beat === 2) hat(t, 0.9);
    const scale = [N.G3, N.B4 / 2, N.D4, N.G4, N.D4, N.B4 / 2]; // relative major lift
    pluck(scale[step % scale.length], t, sixteenth * 1.6, 0.85);
  },
  cues: [
    [0.08, "impact"],
    // each ✕ row lands with a thud + glitch
    [1.6, "impact"], [1.66, "glitch"],
    [2.9, "impact"], [2.96, "glitch"],
    [4.2, "impact"], [4.26, "glitch"],
    [5.4, "glitch"],
    [6.2, "riser", { dur: 0.8 }],
    [7.0, "boom"], [7.04, "whoosh"],
    [7.5, "chime"],
    [8.05, "ding"], // hook 41→89
    // hashtag chips
    [8.5, "pop"], [8.62, "pop", { freq: 580 }], [8.74, "pop", { freq: 640 }], [8.86, "pop", { freq: 700 }],
    [9.3, "powerup"], // gradient best-time pill
    [10.9, "riser", { dur: 0.55 }],
    [11.5, "boom"], [12.0, "chime"], [12.7, "ding"],
  ],
};

// ══ DAY 4 — 13s · "One click. +30." · restrained → celebratory ════════════════
// Scenes: chips in ~1.0 · optimize pill 2.4 · flips 4.0/4.35/4.7 · "+30" 5.9 ·
// dark CTA 9.0.
const day4 = {
  file: "week1-day4.wav",
  dur: 13,
  bpm: 124,
  chord: [
    [N.F2, 0.16, "triangle"], [N.F3, 0.11, "triangle"], [N.A3, 0.08, "triangle"],
    [N.C4, 0.06, "sine"], // F major — warm optimism
  ],
  padFreq0: 700,
  lfoRate: 0.12,
  padAuto: [
    { at: 0, to: 0.38, dur: 0.6 },
    { at: 4.0, to: 0.3, dur: 0.3 },
    { at: 9.0, to: 0.46, dur: 0.4 },
  ],
  padFreqAuto: [
    { at: 0, to: 1500, dur: 3.5 },
    { at: 4.0, to: 2400, dur: 0.4 },
    { at: 9.0, to: 1000, dur: 0.5 },
  ],
  arpAuto: [
    { at: 0.6, to: 0.18, dur: 0.3 },
    { at: 4.0, to: 0.4, dur: 0.2 },
    { at: 12.3, to: 0.12, dur: 0.5 },
  ],
  kickAuto: [
    { at: 1.0, to: 0.55, dur: 0.2 },
    { at: 4.0, to: 0.95, dur: 0.1 },
    { at: 12.2, to: 0.0001, dur: 0.5 },
  ],
  hatAuto: [{ at: 4.0, to: 0.85, dur: 0.1 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (beat === 0 && t >= 1.0) kick(t, t < 4.0 ? 0.7 : 1);
    if (bar16 === 10 && t >= 4.0) kick(t, 0.5);
    if (t >= 4.0 && (beat === 1 || beat === 3)) hat(t, 0.8);
    const pre = [N.F3, N.A3, N.C4, N.A3];
    const post = [N.F4, N.A4, N.C5, N.F4 * 1.5, N.C5, N.A4];
    if (t < 4.0) {
      if (step % 4 === 0) pluck(pre[(step / 4) % pre.length], t, sixteenth * 3, 0.6);
    } else {
      pluck(post[step % post.length], t, sixteenth * 1.6, 0.9, 3400);
    }
  },
  cues: [
    [0.3, "whoosh"],
    [2.4, "powerup"], // One-Click Optimize pill
    [3.5, "riser", { dur: 0.5 }],
    // each stat flips green, rising dings
    [4.0, "ding", { freq: 880 }], [4.35, "ding", { freq: 1108.7 }], [4.7, "ding", { freq: 1318.5 }],
    [4.75, "pop", { freq: 700 }],
    [5.9, "boom"], [5.94, "chime", { mult: 1.5 }], // "+30 points total"
    [8.4, "riser", { dur: 0.55 }],
    [9.0, "boom"], [9.5, "chime"], [10.2, "ding"],
  ],
};

// ══ DAY 5 — 16s · Studio script writer · chill lo-fi focus ════════════════════
// Scenes: card 1.6 · lines type at 2.0/4.2/6.4/8.6 (~1.2s each) · dark CTA 12.0.
const day5 = {
  file: "week1-day5.wav",
  dur: 16,
  bpm: 88,
  chord: [
    [N.F2, 0.18, "triangle"], [N.C3, 0.12, "triangle"], [N.F3, 0.1, "triangle"],
    [N.A3, 0.07, "sine"], [N.E4, 0.04, "sine"], // Fmaj7 — mellow
  ],
  padFreq0: 500,
  lfoRate: 0.09,
  lfoDepth: 220,
  padAuto: [
    { at: 0, to: 0.46, dur: 1.0 },
    { at: 12.0, to: 0.52, dur: 0.5 },
  ],
  padFreqAuto: [
    { at: 0, to: 1100, dur: 3.0 },
    { at: 12.0, to: 800, dur: 0.6 },
  ],
  arpAuto: [{ at: 0.8, to: 0.22, dur: 0.4 }, { at: 15.2, to: 0.08, dur: 0.6 }],
  kickAuto: [{ at: 0.8, to: 0.6, dur: 0.3 }, { at: 15.0, to: 0.0001, dur: 0.7 }],
  hatAuto: [{ at: 2.0, to: 0.5, dur: 0.3 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (beat === 0 && (bar16 === 0 || bar16 === 8)) kick(t, 0.85, 100); // laid-back 1 & 3
    if (bar16 === 14) kick(t, 0.35, 100);
    if (beat === 2) hat(t, 0.55);
    const scale = [N.A3, N.C4, N.E4, N.F4, N.E4, N.C4];
    if (step % 4 === 0) pluck(scale[(step / 4) % scale.length], t, sixteenth * 3.4, 0.65, 2200);
  },
  cues: (() => {
    const cues = [
      [0.15, "whoosh"],
      [1.6, "pop", { freq: 480, vel: 0.24 }],
      [12.0, "boom"], [12.5, "chime"], [13.2, "ding"],
      [11.4, "riser", { dur: 0.55 }],
    ];
    // soft typewriter clicks under each typed line + a carriage bell at line end
    const lines = [2.0, 4.2, 6.4, 8.6];
    for (const start of lines) {
      for (let i = 0; i < 7; i++) {
        cues.push([start + i * 0.17, "tick", { vel: 0.07, freq: 3000 + (i % 3) * 250 }]);
      }
      cues.push([start + 1.35, "typebell"]);
    }
    return cues;
  })(),
};

// ══ DAY 6 — 11s · best time to post · bright & bouncy, clock motif ════════════
// Scenes: grid ~0.9 · Tue/Thu light 1.6/1.9 · gradient pill 2.9 · line 6.0 ·
// dark CTA 8.5.
const day6 = {
  file: "week1-day6.wav",
  dur: 11,
  bpm: 118,
  chord: [
    [N.D3, 0.14, "triangle"], [N.A3, 0.1, "triangle"], [N.D4, 0.07, "sine"],
    [N.Fs4, 0.05, "sine"], // D major — sunny
  ],
  padFreq0: 800,
  lfoRate: 0.18,
  padAuto: [
    { at: 0, to: 0.36, dur: 0.5 },
    { at: 8.5, to: 0.46, dur: 0.4 },
  ],
  padFreqAuto: [
    { at: 0, to: 1600, dur: 2.5 },
    { at: 8.5, to: 950, dur: 0.5 },
  ],
  arpAuto: [{ at: 0.3, to: 0.32, dur: 0.3 }, { at: 10.3, to: 0.1, dur: 0.5 }],
  kickAuto: [{ at: 0.3, to: 0.8, dur: 0.2 }, { at: 10.2, to: 0.0001, dur: 0.5 }],
  hatAuto: [{ at: 0.3, to: 0.7, dur: 0.2 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (beat === 0) kick(t, 0.9, 135);
    if (bar16 === 6 || bar16 === 12) kick(t, 0.4, 135);
    if (beat === 2) hat(t, 0.85);
    if (bar16 === 15) hat(t, 0.5, true);
    const scale = [N.D4, N.E4, N.A4, N.D5, N.A4, N.E4]; // D pentatonic bounce
    if (step % 2 === 0) pluck(scale[(step / 2) % scale.length], t, sixteenth * 2.0, 0.8, 3600);
  },
  cues: [
    [0.2, "whoosh"],
    // tick-tock while the week grid is on screen
    [0.9, "tick", { vel: 0.16, freq: 1500 }], [1.15, "tick", { vel: 0.13, freq: 1100 }],
    [1.4, "tick", { vel: 0.16, freq: 1500 }],
    // Tue / Thu cells light up
    [1.6, "pop", { freq: 660 }], [1.9, "pop", { freq: 830 }],
    [2.9, "powerup"], [3.3, "ding", { freq: 1174.66 }],
    [5.9, "whoosh"],
    [7.9, "riser", { dur: 0.55 }],
    [8.5, "boom"], [9.0, "chime"], [9.7, "ding"],
  ],
};

// ══ DAY 7 — 12s · "Start free" · anthemic, montage-driven ═════════════════════
// Scenes: flashes 0/1/2/3 · "Start free" 4.0 · tier card 5.4 · CTA 9.0.
const day7 = {
  file: "week1-day7.wav",
  dur: 12,
  bpm: 128,
  chord: [
    [N.A1, 0.2, "sawtooth"], [N.A2, 0.13, "sawtooth"], [N.E3, 0.1, "sawtooth"],
    [N.A3, 0.07, "triangle"], [N.Cs4, 0.05, "triangle"], // A major drive
  ],
  padFreq0: 500,
  lfoRate: 0.11,
  padAuto: [
    { at: 0, to: 0.42, dur: 0.4 },
    { at: 4.0, to: 0.5, dur: 0.2 },
  ],
  padFreqAuto: [
    { at: 0, to: 1300, dur: 3.8 },
    { at: 4.0, to: 2400, dur: 0.3 },
    { at: 9.0, to: 1400, dur: 0.4 },
  ],
  arpAuto: [{ at: 0.4, to: 0.34, dur: 0.2 }, { at: 11.3, to: 0.12, dur: 0.5 }],
  kickAuto: [{ at: 0.4, to: 0.95, dur: 0.15 }, { at: 11.2, to: 0.0001, dur: 0.4 }],
  hatAuto: [{ at: 0.4, to: 0.85, dur: 0.15 }],
  groove: ({ t, beat, bar16, kick, pluck, hat, step, sixteenth }) => {
    if (beat === 0) kick(t, 1);
    if (bar16 === 10) kick(t, 0.55);
    if (beat === 2) hat(t, 1);
    if (bar16 === 7) hat(t, 0.5, true);
    const scale = [N.A3, N.E4, N.A4, N.Cs5, N.A4, N.E4, N.D4, N.E4];
    pluck(scale[step % scale.length], t, sixteenth * 1.5, 0.95, 3200);
  },
  cues: [
    // montage flash boundaries
    [0.05, "impact"],
    [1.0, "whoosh"], [1.1, "ding", { freq: 880, vel: 0.18 }],
    [2.0, "whoosh"],
    [2.1, "pop"], [2.2, "pop", { freq: 600 }], [2.3, "pop", { freq: 680 }],
    [2.4, "pop", { freq: 760 }], [2.5, "pop", { freq: 840 }],
    [3.0, "whoosh"], [3.15, "tick", { vel: 0.2 }],
    [3.3, "riser", { dur: 0.68 }],
    [4.0, "boom"], [4.04, "whoosh"], [4.5, "chime", { mult: 1.5 }],
    [5.5, "powerup"], // START HERE card
    [8.4, "riser", { dur: 0.55 }],
    [9.0, "boom"], [9.5, "chime"], [10.2, "ding"],
  ],
};

for (const spec of [day1, day2, day3, day4, day5, day6, day7]) {
  await renderTrack(spec);
}
console.log("All week-1 soundtracks rendered.");
