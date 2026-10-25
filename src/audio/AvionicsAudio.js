/**
 * AvionicsAudio
 * Procedural Web Audio API sound generator for authentic glass cockpit avionics,
 * jet turbine spool acoustics, mechanical pedestal detents, and the infamous A320 PTU "Barking Dog".
 */
export class AvionicsAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Spool drone nodes
    this.n1Osc = null;
    this.n2Osc = null;
    this.spoolGain = null;
    this.spoolFilter = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.isInitialized = true;
      this.setupEngineSpool();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Continuous jet engine spool drone (N1 fan low hum + N2 high-pressure turbine whine)
   */
  setupEngineSpool() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // N1 Low-frequency rumble
    this.n1Osc = this.ctx.createOscillator();
    this.n1Osc.type = 'sawtooth';
    this.n1Osc.frequency.setValueAtTime(55, now);

    // N2 High-frequency compressor whine
    this.n2Osc = this.ctx.createOscillator();
    this.n2Osc.type = 'sine';
    this.n2Osc.frequency.setValueAtTime(420, now);

    // Low-pass filter to simulate engine casing containment
    this.spoolFilter = this.ctx.createBiquadFilter();
    this.spoolFilter.type = 'lowpass';
    this.spoolFilter.frequency.setValueAtTime(480, now);

    this.spoolGain = this.ctx.createGain();
    this.spoolGain.gain.setValueAtTime(0.015, now);

    this.n1Osc.connect(this.spoolFilter);
    this.n2Osc.connect(this.spoolFilter);
    this.spoolFilter.connect(this.spoolGain);
    this.spoolGain.connect(this.ctx.destination);

    this.n1Osc.start();
    this.n2Osc.start();
  }

  /**
   * Modulate jet engine spool sound based on N1 percentage (0 to 105%)
   */
  updateEngineSpool(n1Percent) {
    if (!this.ctx || !this.n1Osc || !this.n2Osc || this.isMuted) return;
    const norm = Math.max(0.1, Math.min(1.05, n1Percent / 100));
    const now = this.ctx.currentTime;

    // N1 frequency sweeps from 45 Hz (idle) to 135 Hz (TOGA)
    const n1Freq = 40 + norm * 95;
    this.n1Osc.frequency.setTargetAtTime(n1Freq, now, 0.2);

    // N2 turbine whine sweeps from 380 Hz to 1,450 Hz
    const n2Freq = 350 + norm * 1100;
    this.n2Osc.frequency.setTargetAtTime(n2Freq, now, 0.2);

    // Filter opens up as thrust increases
    const filterFreq = 300 + norm * 1200;
    this.spoolFilter.frequency.setTargetAtTime(filterFreq, now, 0.2);

    // Volume level
    const targetGain = 0.01 + norm * 0.035;
    this.spoolGain.gain.setTargetAtTime(targetGain, now, 0.15);
  }

  /**
   * Master Caution chime ("ding-ding" two-tone chime)
   */
  playMasterCaution() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.15); // A5

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  /**
   * Pedestal tactile mechanical detent click
   */
  playPedestalClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * The infamous Airbus A320 PTU (Power Transfer Unit) "Barking Dog"
   * A bidirectional hydraulic motor-pump transferring pressure between Green and Yellow systems.
   * Procedurally generates the rhythmic hydraulic valve "woof-woof-woof" pulses.
   */
  playPTUBark(cycleCount = 4) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    for (let i = 0; i < cycleCount; i++) {
      const delay = i * 0.16;
      this.triggerPTUPulse(this.ctx.currentTime + delay);
    }
  }

  triggerPTUPulse(startTime) {
    // Noise buffer for the cavitation hydraulic valve hiss
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    // Bandpass filter for the hollow "bark" acoustic signature
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, startTime);
    filter.Q.setValueAtTime(4.5, startTime);

    // Mechanical clunk oscillator
    const clunkOsc = this.ctx.createOscillator();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(180, startTime);
    clunkOsc.frequency.exponentialRampToValueAtTime(65, startTime + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    clunkOsc.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + 0.13);
    clunkOsc.start(startTime);
    clunkOsc.stop(startTime + 0.13);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.spoolGain) {
      this.spoolGain.gain.setValueAtTime(this.isMuted ? 0 : 0.02, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const avionicsAudio = new AvionicsAudio();
