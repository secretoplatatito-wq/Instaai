import { AudioMetrics, AudioTrackInfo } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;

  private currentBuffer: AudioBuffer | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private playbackRate: number = 1.0;

  // Analysis buffers
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;

  // Beat detection state
  private energyHistory: number[] = [];
  private readonly historySize = 43; // ~1 second at 40-50fps
  private beatIntervals: number[] = [];
  private lastBeatTime: number = 0;
  private currentBpm: number = 120;
  private manualBpm: number | null = null;

  // Smoothing
  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;
  private smoothedEnergy = 0;

  // Callbacks
  private onTrackEnded?: () => void;

  constructor() {
    // Lazily initialize AudioContext on user interaction
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.85;

      this.streamDest = this.ctx.createMediaStreamDestination();

      // Output to both physical speakers and recording stream destination
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.connect(this.streamDest);

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getAudioStream(): MediaStream | null {
    this.initContext();
    return this.streamDest ? this.streamDest.stream : null;
  }

  public async loadAudioFile(file: File): Promise<AudioTrackInfo> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    this.currentBuffer = audioBuffer;
    this.pauseOffset = 0;
    this.stop();

    // Estimate BPM from audio buffer
    const estimatedBpm = this.estimateBpmFromBuffer(audioBuffer);
    this.currentBpm = estimatedBpm;

    return {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      sizeBytes: file.size,
      isBuiltIn: false,
      bpmEstimate: estimatedBpm,
    };
  }

  public async loadBuiltinTrack(trackId: 'gravity-chimes' | 'neon-velocity' | 'kinetic-trap'): Promise<AudioTrackInfo> {
    const ctx = this.initContext();
    let buffer: AudioBuffer;
    let name: string;
    let bpm: number;

    if (trackId === 'gravity-chimes') {
      name = 'Gravity Chimes (Satisfying Ambient)';
      bpm = 110;
      buffer = this.synthesizeGravityChimes(ctx, bpm, 30);
    } else if (trackId === 'neon-velocity') {
      name = 'Neon Velocity (Cyberpunk 128 BPM)';
      bpm = 128;
      buffer = this.synthesizeSynthwaveTrack(ctx, bpm, 30);
    } else {
      name = 'Kinetic Trap (Heavy 808 Sub)';
      bpm = 140;
      buffer = this.synthesizeTrapTrack(ctx, bpm, 30);
    }

    this.currentBuffer = buffer;
    this.currentBpm = bpm;
    this.pauseOffset = 0;
    this.stop();

    return {
      id: trackId,
      name,
      artist: 'Biome Beat Studio',
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      isBuiltIn: true,
      bpmEstimate: bpm,
    };
  }

  public play(onEnded?: () => void) {
    if (!this.currentBuffer) return;
    const ctx = this.initContext();

    if (this.isPlaying) {
      this.stop();
    }

    this.onTrackEnded = onEnded;
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.currentBuffer;
    this.sourceNode.playbackRate.value = this.playbackRate;

    if (this.analyser) {
      this.sourceNode.connect(this.analyser);
    }

    this.sourceNode.onended = () => {
      if (this.isPlaying && this.getCurrentTime() >= (this.currentBuffer?.duration ?? 0) - 0.1) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        this.onTrackEnded?.();
      }
    };

    const offset = Math.min(this.pauseOffset, this.currentBuffer.duration);
    this.sourceNode.start(0, offset);
    this.startTime = ctx.currentTime - offset / this.playbackRate;
    this.isPlaying = true;
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.stop();
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Source node may already be stopped
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  public seek(timeSeconds: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    const maxDur = this.currentBuffer?.duration || 0;
    this.pauseOffset = Math.max(0, Math.min(timeSeconds, maxDur));
    if (wasPlaying) {
      this.play(this.onTrackEnded);
    }
  }

  public getCurrentTime(): number {
    if (!this.ctx || !this.currentBuffer) return this.pauseOffset;
    if (this.isPlaying) {
      const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
      return Math.min(elapsed, this.currentBuffer.duration);
    }
    return this.pauseOffset;
  }

  public getDuration(): number {
    return this.currentBuffer ? this.currentBuffer.duration : 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(vol: number) {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(vol, 1.5)), this.ctx?.currentTime || 0, 0.05);
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(rate, 2.0));
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = this.playbackRate;
    }
  }

  public setManualBpm(bpm: number | null) {
    this.manualBpm = bpm;
  }

  /**
   * Real-time audio metrics extraction
   */
  public getMetrics(sensitivity: number = 1.0, smoothing: number = 0.8): AudioMetrics {
    if (!this.analyser || !this.freqData || !this.timeData || !this.isPlaying) {
      return {
        bass: 0,
        subBass: 0,
        lowMid: 0,
        mid: 0,
        highMid: 0,
        treble: 0,
        energy: 0,
        rms: 0,
        beat: false,
        beatStrength: 0,
        bpm: this.manualBpm || this.currentBpm,
        spectralFlux: 0,
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    const binCount = this.analyser.frequencyBinCount; // 512 bins
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const binHz = nyquist / binCount; // ~43 Hz per bin

    // Frequency ranges to bin indices
    const subBassEnd = Math.max(1, Math.round(60 / binHz));
    const bassEnd = Math.round(180 / binHz);
    const lowMidEnd = Math.round(500 / binHz);
    const midEnd = Math.round(2000 / binHz);
    const highMidEnd = Math.round(5000 / binHz);
    const trebleEnd = Math.min(binCount - 1, Math.round(16000 / binHz));

    const calcBandAverage = (start: number, end: number) => {
      let sum = 0;
      for (let i = start; i <= end; i++) {
        sum += this.freqData![i];
      }
      return (sum / (end - start + 1)) / 255;
    };

    const rawSubBass = calcBandAverage(0, subBassEnd);
    const rawBass = calcBandAverage(subBassEnd + 1, bassEnd);
    const rawLowMid = calcBandAverage(bassEnd + 1, lowMidEnd);
    const rawMid = calcBandAverage(lowMidEnd + 1, midEnd);
    const rawHighMid = calcBandAverage(midEnd + 1, highMidEnd);
    const rawTreble = calcBandAverage(highMidEnd + 1, trebleEnd);

    // RMS Calculation from time domain
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);

    // Overall energy (weighted toward bass and mid)
    const rawEnergy = (rawBass * 0.4 + rawMid * 0.35 + rawTreble * 0.25) * sensitivity;

    // Exponential smoothing
    const alpha = 1 - Math.max(0.05, Math.min(smoothing, 0.95));
    this.smoothedBass += (rawBass * sensitivity - this.smoothedBass) * alpha;
    this.smoothedMid += (rawMid * sensitivity - this.smoothedMid) * alpha;
    this.smoothedTreble += (rawTreble * sensitivity - this.smoothedTreble) * alpha;
    this.smoothedEnergy += (rawEnergy - this.smoothedEnergy) * alpha;

    // Adaptive Beat Detection
    const instantEnergy = rawBass * 0.7 + rawLowMid * 0.3;
    let isBeat = false;
    let beatStrength = 0;

    if (this.energyHistory.length > 0) {
      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      let variance = 0;
      for (let i = 0; i < this.energyHistory.length; i++) {
        variance += Math.pow(this.energyHistory[i] - avgEnergy, 2);
      }
      variance /= this.energyHistory.length;

      // Dynamic threshold multiplier (C)
      const thresholdC = Math.max(1.15, 1.45 - variance * 2.5);
      const threshold = avgEnergy * thresholdC;
      const now = performance.now();

      // Only trigger if energy exceeds threshold and at least 200ms has elapsed since last beat
      if (instantEnergy > threshold && instantEnergy > 0.25 && now - this.lastBeatTime > 200) {
        isBeat = true;
        beatStrength = Math.min(1.0, (instantEnergy - threshold) * 2.5);

        if (this.lastBeatTime > 0) {
          const interval = now - this.lastBeatTime;
          if (interval >= 300 && interval <= 1200) {
            this.beatIntervals.push(interval);
            if (this.beatIntervals.length > 10) this.beatIntervals.shift();
            // Estimate BPM from intervals
            const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
            this.currentBpm = Math.round(60000 / avgInterval);
          }
        }
        this.lastBeatTime = now;
      }
    }

    this.energyHistory.push(instantEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    return {
      bass: Math.min(1.0, this.smoothedBass),
      subBass: Math.min(1.0, rawSubBass * sensitivity),
      lowMid: Math.min(1.0, rawLowMid * sensitivity),
      mid: Math.min(1.0, this.smoothedMid),
      highMid: Math.min(1.0, rawHighMid * sensitivity),
      treble: Math.min(1.0, this.smoothedTreble),
      energy: Math.min(1.0, this.smoothedEnergy),
      rms: Math.min(1.0, rms * 1.5),
      beat: isBeat,
      beatStrength,
      bpm: this.manualBpm || this.currentBpm,
      spectralFlux: Math.abs(instantEnergy - (this.energyHistory[this.energyHistory.length - 2] || 0)),
    };
  }

  /**
   * Generates peak data for waveform visualizer
   */
  public getWaveformData(numBars: number = 100): number[] {
    if (!this.currentBuffer) {
      return Array(numBars).fill(0.1);
    }
    const channelData = this.currentBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numBars);
    const peaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1.0, max * 1.2));
    }
    return peaks;
  }

  private estimateBpmFromBuffer(buffer: AudioBuffer): number {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowLength = Math.min(data.length, sampleRate * 30); // Analyze first 30 seconds
    const step = 256;
    const peaks: number[] = [];

    for (let i = 0; i < windowLength; i += step) {
      let sum = 0;
      for (let j = 0; j < step && i + j < windowLength; j++) {
        sum += Math.abs(data[i + j]);
      }
      peaks.push(sum / step);
    }

    // Autocorrelation to detect period
    let bestCorrelation = 0;
    let bestLag = 0;
    const minBpm = 70;
    const maxBpm = 180;
    const minLag = Math.floor((60 / maxBpm) * (sampleRate / step));
    const maxLag = Math.floor((60 / minBpm) * (sampleRate / step));

    for (let lag = minLag; lag < maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < peaks.length - lag; i++) {
        correlation += peaks[i] * peaks[i + lag];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    if (bestLag > 0) {
      const bpm = (60 * sampleRate) / (bestLag * step);
      if (bpm >= 70 && bpm <= 180) return Math.round(bpm);
    }
    return 120;
  }

  // --- High-Quality Procedural Synthesizers for Sample Tracks ---

  private synthesizeGravityChimes(ctx: AudioContext, bpm: number, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * durationSec, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatDur = 60 / bpm;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

    // Seeded random for consistency
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const totalBeats = Math.floor(durationSec / beatDur);

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = beat * beatDur;
      const startSample = Math.floor(beatTime * sampleRate);

      // Deep kick every 2 beats
      if (beat % 2 === 0) {
        for (let s = 0; s < sampleRate * 0.4 && startSample + s < left.length; s++) {
          const t = s / sampleRate;
          const freq = 120 * Math.exp(-t * 22);
          const env = Math.exp(-t * 8);
          const val = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
          left[startSample + s] += val;
          right[startSample + s] += val;
        }
      }

      // Bell chime on syncopated 16th notes
      const notesInBar = [0, 0.5, 0.75, 1.25, 1.5, 2.0, 2.5, 2.75, 3.25, 3.5];
      const offsetBeats = notesInBar[Math.floor(rand() * notesInBar.length)];
      const noteSample = Math.floor((beatTime + offsetBeats * 0.25) * sampleRate);

      if (noteSample < left.length) {
        const pitch = pentatonic[Math.floor(rand() * pentatonic.length)];
        const pan = rand() * 0.8 - 0.4;
        const chimeDuration = sampleRate * 1.8;

        for (let s = 0; s < chimeDuration && noteSample + s < left.length; s++) {
          const t = s / sampleRate;
          const fund = Math.sin(2 * Math.PI * pitch * t);
          const overtone1 = Math.sin(2 * Math.PI * pitch * 2.76 * t) * 0.4;
          const overtone2 = Math.sin(2 * Math.PI * pitch * 5.4 * t) * 0.15;
          const env = Math.exp(-t * 3.5);
          const sampleVal = (fund + overtone1 + overtone2) * env * 0.35;

          left[noteSample + s] += sampleVal * (0.5 - pan);
          right[noteSample + s] += sampleVal * (0.5 + pan);
        }
      }
    }

    return buffer;
  }

  private synthesizeSynthwaveTrack(ctx: AudioContext, bpm: number, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * durationSec, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatDur = 60 / bpm;
    const totalBeats = Math.floor(durationSec / beatDur);
    const bassNotes = [55.0, 55.0, 65.41, 73.42, 48.99, 48.99, 55.0, 65.41]; // A1, C2, D2, G1

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = beat * beatDur;
      const startSample = Math.floor(beatTime * sampleRate);

      // Four-on-the-floor kick
      for (let s = 0; s < sampleRate * 0.35 && startSample + s < left.length; s++) {
        const t = s / sampleRate;
        const freq = 140 * Math.exp(-t * 26);
        const env = Math.exp(-t * 10);
        const val = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
        left[startSample + s] += val;
        right[startSample + s] += val;
      }

      // Snare on 2 and 4
      if (beat % 2 === 1) {
        for (let s = 0; s < sampleRate * 0.25 && startSample + s < left.length; s++) {
          const t = s / sampleRate;
          const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 20) * 0.4;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 14) * 0.35;
          left[startSample + s] += tone + noise;
          right[startSample + s] += tone + noise;
        }
      }

      // Hi-hats on 8th and 16th notes
      for (let sub = 0; sub < 4; sub++) {
        const subSample = startSample + Math.floor((sub * beatDur / 4) * sampleRate);
        if (subSample < left.length) {
          const vol = sub === 2 ? 0.3 : 0.15;
          for (let s = 0; s < sampleRate * 0.05 && subSample + s < left.length; s++) {
            const t = s / sampleRate;
            const noise = (Math.random() * 2 - 1) * Math.exp(-t * 80) * vol;
            left[subSample + s] += noise;
            right[subSample + s] += noise;
          }
        }
      }

      // 16th note rolling arpeggiated bassline
      const root = bassNotes[(Math.floor(beat / 4)) % bassNotes.length];
      for (let sub = 0; sub < 4; sub++) {
        const bassSample = startSample + Math.floor((sub * beatDur / 4) * sampleRate);
        const octaveMul = sub % 2 === 0 ? 1 : 2;
        const f = root * octaveMul;

        for (let s = 0; s < sampleRate * 0.15 && bassSample + s < left.length; s++) {
          const t = s / sampleRate;
          // Sawtooth approximation (3 harmonics)
          const saw = (Math.sin(2 * Math.PI * f * t) +
            0.5 * Math.sin(2 * Math.PI * 2 * f * t) +
            0.25 * Math.sin(2 * Math.PI * 3 * f * t)) * Math.exp(-t * 12) * 0.28;
          left[bassSample + s] += saw;
          right[bassSample + s] += saw;
        }
      }
    }

    return buffer;
  }

  private synthesizeTrapTrack(ctx: AudioContext, bpm: number, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * durationSec, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatDur = 60 / bpm;
    const totalBeats = Math.floor(durationSec / beatDur);

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = beat * beatDur;
      const startSample = Math.floor(beatTime * sampleRate);

      // Heavy 808 Sub Kick on beat 0 and syncopations
      if (beat % 4 === 0 || beat % 4 === 2.5) {
        for (let s = 0; s < sampleRate * 0.7 && startSample + s < left.length; s++) {
          const t = s / sampleRate;
          const freq = 65 * Math.exp(-t * 4); // Sustained deep 808
          const env = Math.exp(-t * 2.5);
          const val = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
          left[startSample + s] += val;
          right[startSample + s] += val;
        }
      }

      // Hard Clap / Rimshot on beat 2 of each 4-beat bar
      if (beat % 4 === 2) {
        for (let s = 0; s < sampleRate * 0.25 && startSample + s < left.length; s++) {
          const t = s / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.5;
          left[startSample + s] += noise;
          right[startSample + s] += noise;
        }
      }

      // Fast Trap Hi-Hat rolls
      const rolls = beat % 2 === 1 ? 8 : 4;
      for (let r = 0; r < rolls; r++) {
        const rollSample = startSample + Math.floor((r * beatDur / rolls) * sampleRate);
        if (rollSample < left.length) {
          for (let s = 0; s < sampleRate * 0.04 && rollSample + s < left.length; s++) {
            const t = s / sampleRate;
            const hat = (Math.random() * 2 - 1) * Math.exp(-t * 100) * 0.22;
            left[rollSample + s] += hat;
            right[rollSample + s] += hat;
          }
        }
      }
    }

    return buffer;
  }
}
