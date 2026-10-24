// Menu music: a laid-back jazz trio played live with Web Audio.
// Electric piano chords, a walking bass, brushes and ride cymbal, and a
// vibraphone that improvises over the changes. Nothing is downloaded and
// nothing is copyrighted: every note is generated here.

const BPM = 88;
const BEAT = 60 / BPM;
const SWING = 2 / 3; // the "and" of each beat lands two thirds of the way through
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// 8-bar loop in F. Each entry: beats, bass root, piano voicing, melody notes.
const CHANGES = [
  [{ b: 4, root: 41, v: [57, 60, 64, 67], mel: [65, 67, 69, 72, 74, 76] }],                               // Fmaj9
  [{ b: 2, root: 40, v: [55, 58, 62], mel: [64, 67, 70, 74] }, { b: 2, root: 45, v: [55, 61, 65], mel: [64, 67, 69, 70, 73] }], // Em7b5  A7b9
  [{ b: 4, root: 38, v: [53, 57, 60, 64], mel: [62, 65, 69, 72, 74, 76] }],                               // Dm9
  [{ b: 2, root: 36, v: [51, 55, 58, 62], mel: [63, 67, 70, 72, 74] }, { b: 2, root: 41, v: [51, 57, 62], mel: [63, 65, 69, 72, 74] }], // Cm7  F7
  [{ b: 4, root: 46, v: [57, 60, 62, 65], mel: [65, 69, 70, 72, 74, 77] }],                               // Bbmaj9
  [{ b: 4, root: 46, v: [58, 61, 65, 67], mel: [65, 67, 70, 73, 77] }],                                   // Bbm6
  [{ b: 2, root: 45, v: [55, 60, 64], mel: [64, 67, 69, 72, 76] }, { b: 2, root: 38, v: [54, 60, 64], mel: [66, 69, 72, 74] }], // Am7  D7
  [{ b: 2, root: 43, v: [53, 58, 62], mel: [65, 67, 70, 74] }, { b: 2, root: 36, v: [58, 64, 69], mel: [64, 67, 69, 70, 72] }], // Gm7  C7
];
const SEGMENTS = CHANGES.flat();
const COMP = [
  [[0, 1.4, 0.9], [1 + SWING, 0.5, 0.7]],
  [[SWING, 0.4, 0.8], [2, 1.2, 0.8]],
  [[0, 0.6, 0.8], [2 + SWING, 1.2, 0.85]],
  [[1, 0.5, 0.75], [2 + SWING, 0.4, 0.7]],
  [[0, 2.2, 0.85]],
];

export function createJazz() {
  let ac = null, out = null, timer = null, playing = false;
  let nextTime = 0, seg = 0, prevMel = 69, noiseBuf = null;

  function setup(ctx) {
    ac = ctx;
    const master = ac.createGain(); master.gain.value = 0;
    const tone = ac.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 6500;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    const dry = ac.createGain(); dry.gain.value = 1;
    const wet = ac.createGain(); wet.gain.value = 0.22;
    const verb = ac.createConvolver(); verb.buffer = impulse(2.2);
    dry.connect(tone); wet.connect(verb); verb.connect(tone);
    tone.connect(comp); comp.connect(master); master.connect(ac.destination);
    out = { master, dry, wet };
    const len = ac.sampleRate;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function impulse(sec) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
  function send(node, wetAmt = 0.6) { node.connect(out.dry); const g = ac.createGain(); g.gain.value = wetAmt; node.connect(g); g.connect(out.wet); }

  // Electric piano: two slightly detuned tones and a soft bell on top, with a slow tremolo.
  function piano(t, notes, dur, vel) {
    const bus = ac.createGain(); bus.gain.value = 0;
    const trem = ac.createOscillator(), tg = ac.createGain(); trem.frequency.value = 4.5; tg.gain.value = 0.08; trem.connect(tg); tg.connect(bus.gain);
    bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(0.055 * vel, t + 0.012); bus.gain.setTargetAtTime(0.03 * vel, t + 0.05, 0.4); bus.gain.setTargetAtTime(0, t + dur, 0.12);
    for (const n of notes) {
      const tt = t + rand(0, 0.018);
      for (const [type, det, lvl] of [["sine", 0, 1], ["triangle", 4, 0.35], ["sine", 1200 + 2, 0.08]]) {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = midi(n); o.detune.value = det; g.gain.value = lvl;
        o.connect(g); g.connect(bus); o.start(tt); o.stop(t + dur + 0.6);
      }
    }
    trem.start(t); trem.stop(t + dur + 0.6);
    send(bus, 0.7);
  }
  // Upright bass: a round pluck with a little finger noise.
  function bass(t, n, dur, vel) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "triangle"; o2.type = "sine"; o.frequency.value = midi(n); o2.frequency.value = midi(n);
    f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.25); f.Q.value = 2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.008); g.gain.setTargetAtTime(0.12 * vel, t + 0.03, 0.18); g.gain.setTargetAtTime(0, t + dur * 0.92, 0.05);
    o.connect(f); o2.connect(f); f.connect(g); send(g, 0.15);
    o.start(t); o2.start(t); o.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
  }
  function noise(t, dur, freq, type, vol, q = 1, wetAmt = 0.3) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); send(g, wetAmt);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function ride(t, vol) {
    noise(t, 0.9, 7800, "bandpass", 0.05 * vol, 0.8, 0.35);
    const o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = 5200 + rand(-60, 60);
    const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 4000;
    g.gain.setValueAtTime(0.006 * vol, t); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.5);
    o.connect(f); f.connect(g); send(g, 0.3); o.start(t); o.stop(t + 0.55);
  }
  function brush(t, beat) { noise(t, beat * 0.9, 3000, "bandpass", 0.012, 0.6, 0.2); }
  function snare(t) { noise(t, 0.16, 1800, "bandpass", 0.035, 0.9, 0.4); }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); send(g, 0.1); o.start(t); o.stop(t + 0.32);
  }
  // Vibraphone: a sine with a soft overtone, a long ring and gentle vibrato.
  function vibes(t, n, dur, vel) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 0.25;
    o.frequency.value = midi(n); o2.frequency.value = midi(n) * 4; g2.gain.value = 0.12;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.006); g.gain.setTargetAtTime(0, t + 0.02, Math.max(0.25, dur * 0.8));
    const amp = ac.createGain(); amp.gain.value = 1; lfo.connect(lg); lg.connect(amp.gain);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(amp); send(amp, 0.8);
    o.start(t); o2.start(t); lfo.start(t); const end = t + dur * 3 + 0.5; o.stop(end); o2.stop(end); lfo.stop(end);
  }

  function walk(s, next, beats, t) {
    const tones = [s.root + 7, s.root + 12, s.root + (s.v.some((n) => (n - s.root) % 12 === 3) ? 3 : 4), s.root + 10, s.root + 5];
    let last = s.root;
    for (let i = 0; i < beats; i++) {
      let n;
      if (i === 0) n = s.root;
      else if (i === beats - 1) n = next.root + (Math.random() < 0.5 ? 1 : -1);
      else { n = pick(tones); while (n === last) n = pick(tones); }
      while (n > 52) n -= 12; while (n < 33) n += 12;
      bass(t + i * BEAT + rand(0, 0.01), n, BEAT * 0.95, i === 0 ? 1 : 0.85);
      last = n;
    }
  }
  function melody(s, t) {
    if (Math.random() < 0.3) return;
    const slots = []; for (let i = 0; i < s.b; i++) { slots.push(i); slots.push(i + SWING); }
    const count = Math.min(slots.length, Math.floor(rand(2, s.b + 2))), start = Math.floor(rand(0, slots.length - count + 1));
    for (let k = 0; k < count; k++) {
      const pos = slots[start + k];
      const near = s.mel.slice().sort((a, b) => Math.abs(a - prevMel) - Math.abs(b - prevMel));
      const n = Math.random() < 0.7 ? near[Math.floor(rand(0, Math.min(3, near.length)))] : pick(s.mel);
      prevMel = n;
      const dur = k === count - 1 ? BEAT * rand(1, 2) : BEAT * 0.45;
      vibes(t + pos * BEAT + rand(0, 0.015), n, dur, k === 0 ? 1 : rand(0.65, 0.9));
    }
  }
  function playSegment(s, next, t) {
    walk(s, next, s.b, t);
    const pattern = s.b === 4 ? pick(COMP) : pick([[[0, 1.2, 0.85]], [[SWING, 0.9, 0.8]], [[0, 0.5, 0.8], [1 + SWING, 0.4, 0.7]]]);
    for (const [pos, len, vel] of pattern) if (pos < s.b) piano(t + pos * BEAT, s.v, len * BEAT, vel);
    for (let i = 0; i < s.b; i++) {
      const bt = t + i * BEAT, strong = (seg + i) % 2 === 1;
      ride(bt, strong ? 1 : 0.75);
      if (strong) { ride(bt + SWING * BEAT, 0.55); snare(bt + 0.01); }
      brush(bt, BEAT);
      if (i === 0 && s.b === 4) kick(bt);
    }
    melody(s, t);
  }
  function schedule(ahead = 0.6) {
    while (nextTime < ac.currentTime + ahead) {
      const s = SEGMENTS[seg % SEGMENTS.length], next = SEGMENTS[(seg + 1) % SEGMENTS.length];
      playSegment(s, next, nextTime);
      nextTime += s.b * BEAT; seg++;
    }
  }

  return {
    get playing() { return playing; },
    start(ctx, volume = 0.5) {
      if (!ac) setup(ctx);
      if (ac.state === "suspended") ac.resume().catch(() => {});
      if (playing) return;
      playing = true;
      nextTime = Math.max(nextTime, ac.currentTime + 0.1);
      const g = out.master.gain; g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(g.value, ac.currentTime); g.linearRampToValueAtTime(volume, ac.currentTime + 2);
      schedule();
      timer = setInterval(() => schedule(), 120);
    },
    stop(fade = 1) {
      if (!playing || !ac) return;
      playing = false; clearInterval(timer); timer = null;
      const g = out.master.gain; g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(g.value, ac.currentTime); g.linearRampToValueAtTime(0, ac.currentTime + fade);
      nextTime = ac.currentTime + fade + 0.05;
    },
    // For tests: render a few bars into an offline context.
    render(ctx, seconds) { setup(ctx); out.master.gain.value = 0.5; nextTime = 0.05; schedule(seconds); },
  };
}
