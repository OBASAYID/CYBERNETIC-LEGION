import { useRef, useCallback } from "react";

export interface AudioEnhancementOptions {
  normalize: boolean;
  removeNoise: boolean;
  smoothTransitions: boolean;
  addWarmth: boolean;
  compressionRatio: number;
}

const defaultOptions: AudioEnhancementOptions = {
  normalize: true,
  removeNoise: true,
  smoothTransitions: true,
  addWarmth: true,
  compressionRatio: 3,
};

export function useAudioProcessing() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const warmthFilterRef = useRef<BiquadFilterNode | null>(null);

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const createProcessingChain = useCallback((ctx: AudioContext, options: AudioEnhancementOptions) => {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
    compressor.knee.setValueAtTime(30, ctx.currentTime);
    compressor.ratio.setValueAtTime(options.compressionRatio, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    compressorRef.current = compressor;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
    gainNodeRef.current = gainNode;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(8000, ctx.currentTime);
    lowpass.Q.setValueAtTime(0.5, ctx.currentTime);
    lowpassRef.current = lowpass;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(80, ctx.currentTime);
    highpass.Q.setValueAtTime(0.5, ctx.currentTime);
    highpassRef.current = highpass;

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = "peaking";
    warmthFilter.frequency.setValueAtTime(200, ctx.currentTime);
    warmthFilter.Q.setValueAtTime(1.0, ctx.currentTime);
    warmthFilter.gain.setValueAtTime(options.addWarmth ? 3 : 0, ctx.currentTime);
    warmthFilterRef.current = warmthFilter;

    const presenceFilter = ctx.createBiquadFilter();
    presenceFilter.type = "peaking";
    presenceFilter.frequency.setValueAtTime(3000, ctx.currentTime);
    presenceFilter.Q.setValueAtTime(1.0, ctx.currentTime);
    presenceFilter.gain.setValueAtTime(2, ctx.currentTime);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    return { compressor, gainNode, lowpass, highpass, warmthFilter, presenceFilter, analyser };
  }, []);

  const processAudioBlob = useCallback(async (
    audioBlob: Blob,
    options: Partial<AudioEnhancementOptions> = {}
  ): Promise<Blob> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const ctx = initializeAudioContext();
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const { compressor, gainNode, lowpass, highpass, warmthFilter, presenceFilter } = 
      createProcessingChain(offlineCtx as unknown as AudioContext, mergedOptions);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(warmthFilter);
    warmthFilter.connect(presenceFilter);
    presenceFilter.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start();
    const renderedBuffer = await offlineCtx.startRendering();

    const wavBlob = audioBufferToWav(renderedBuffer);
    return wavBlob;
  }, [initializeAudioContext, createProcessingChain]);

  const playEnhancedAudio = useCallback(async (
    audioBlob: Blob,
    options: Partial<AudioEnhancementOptions> = {},
    onEnd?: () => void
  ): Promise<HTMLAudioElement> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const ctx = initializeAudioContext();
    
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const { compressor, gainNode, lowpass, highpass, warmthFilter, presenceFilter, analyser } = 
      createProcessingChain(ctx, mergedOptions);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(warmthFilter);
    warmthFilter.connect(presenceFilter);
    presenceFilter.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);

    if (mergedOptions.smoothTransitions && audioBuffer.duration > 0.2) {
      const fadeTime = Math.min(0.05, audioBuffer.duration * 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + fadeTime);
      
      const duration = audioBuffer.duration;
      if (duration > fadeTime * 2) {
        gainNode.gain.setValueAtTime(1.0, ctx.currentTime + duration - fadeTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      }
    }

    source.onended = () => {
      onEnd?.();
    };

    source.start();

    const dummyAudio = new Audio();
    return dummyAudio;
  }, [initializeAudioContext, createProcessingChain]);

  const playAudioFromUrl = useCallback(async (
    url: string,
    options: Partial<AudioEnhancementOptions> = {},
    onEnd?: () => void
  ): Promise<void> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await playEnhancedAudio(blob, options, onEnd);
    } catch (error) {
      console.error("Failed to play enhanced audio:", error);
      const audio = new Audio(url);
      audio.onended = () => onEnd?.();
      audio.play();
    }
  }, [playEnhancedAudio]);

  const setVolume = useCallback((volume: number) => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        audioContextRef.current.currentTime
      );
    }
  }, []);

  const cleanup = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    processAudioBlob,
    playEnhancedAudio,
    playAudioFromUrl,
    setVolume,
    cleanup,
    initializeAudioContext,
  };
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
