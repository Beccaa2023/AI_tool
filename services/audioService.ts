// Audio Context Singleton
let audioContext: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    // Do not force sampleRate in the constructor. Let the browser/OS decide (usually 44.1kHz or 48kHz).
    // Forcing it can cause silence or failure on some devices.
    // We will define the sample rate (24000) when creating the buffer, and Web Audio handles resampling.
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Helper to decode Base64 string to Uint8Array
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to convert Raw PCM (Int16) to AudioBuffer
const pcmToAudioBuffer = (
  pcmData: Uint8Array, 
  ctx: AudioContext, 
  sampleRate: number = 24000 // Gemini TTS default
): AudioBuffer => {
  // Ensure we are reading 16-bit integers correctly
  const int16Array = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
  
  const frameCount = int16Array.length;
  const audioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
    channelData[i] = int16Array[i] / 32768.0;
  }

  return audioBuffer;
};

export const playAudioData = async (base64Audio: string) => {
  try {
    const ctx = getAudioContext();
    
    // Always check state and resume if needed (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const rawBytes = decodeBase64(base64Audio);
    
    // Gemini API returns raw PCM data.
    // We create a buffer at 24kHz. The context (running at 44.1/48k) will automatically resample it during playback.
    const audioBuffer = pcmToAudioBuffer(rawBytes, ctx, 24000);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0); // Start immediately
  } catch (error) {
    console.error("Failed to play audio", error);
  }
};