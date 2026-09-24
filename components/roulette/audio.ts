/**
 * Web Audio API synthesized mechanical pawl ticks and settle sound.
 * Zero external audio files. Safe to call on any browser.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Mechanical pawl tick sound as the wheel clicks past sector dividers.
 */
export function playTick(pitchMultiplier = 1): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800 * pitchMultiplier, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.015);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}

/**
 * Authentic CS:GO case opening tick sound:
 * Crisp, punchy mechanical transient click with a subtle hollow plastic/wood resonance.
 */
export function playCsgoTick(speedFactor = 1): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // High transient snap (the plastic pawl catching the divider)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    osc1.type = "square";
    // Slightly lower pitch when moving slowly for that heavy suspense feel
    const baseFreq = 1600 + Math.min(600, speedFactor * 400);
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(240, now + 0.009);

    filter1.type = "bandpass";
    filter1.frequency.setValueAtTime(2200, now);
    filter1.Q.setValueAtTime(4, now);

    gain1.gain.setValueAtTime(0.16, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.014);

    // Body resonance (subtle hollow thud)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.018);

    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.022);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Mechanical settle detent sound when the wheel lands on the winning sector.
 */
export function playSettle(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Iconic CS:GO Case Opening Unbox Settle Sound:
 * Heavy impact sub-bass + triumphant golden rarity harmonic chime.
 */
export function playCsgoSettle(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep impact bass drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    subGain.gain.setValueAtTime(0.28, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.45);

    // 2. Dual Golden Chime
    const chord = [587.33, 880.0, 1174.66]; // D5, A5, D6 harmonic
    chord.forEach((freq, idx) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();

      chimeOsc.type = "triangle";
      chimeOsc.frequency.setValueAtTime(freq, now + idx * 0.03);

      chimeGain.gain.setValueAtTime(0.12 / (idx + 1), now + idx * 0.03);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chimeOsc.start(now + idx * 0.03);
      chimeOsc.stop(now + 0.65);
    });
  } catch {
    // Ignore audio failures
  }
}

/**
 * Mechanical hardware toggle click when locking or unlocking a DNA parameter.
 */
export function playLockClick(locked: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    const startFreq = locked ? 520 : 380;
    const endFreq = locked ? 740 : 260;

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Ignore audio failures
  }
}
