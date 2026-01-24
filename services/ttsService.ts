
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils";

// Map our custom personality IDs to the underlying Gemini TTS voice names
// Only 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr' are supported for gemini-2.5-flash-preview-tts.
const VOICE_MAP: Record<string, string> = {
  'Aradhya': 'Kore',
  'Kore': 'Kore',
  'Puck': 'Puck',
  'Charon': 'Charon',
  'Fenrir': 'Fenrir',
  'Zephyr': 'Zephyr'
};

export class TTSService {
  private audioContext: AudioContext | null = null;

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    return this.audioContext;
  }

  /**
   * Synthesizes text to speech, plays it, and returns the raw PCM bytes.
   */
  async synthesizeAndPlay(text: string, voiceId: string): Promise<Uint8Array> {
    const ctx = this.initAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Always create a fresh instance of the AI client with the provided API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const voiceName = VOICE_MAP[voiceId] || 'Kore';

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("Gemini returned no response. This can happen due to safety filtering or account limitations.");
      }

      // Find the first part that contains inline audio data
      const audioPart = candidate.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        // Log candidate info for debugging
        console.debug("TTS Candidate response:", candidate);
        
        // Check for text-only response (which often explains errors/blocks)
        const textResponse = candidate.content?.parts?.find(p => p.text)?.text;
        if (textResponse) {
          throw new Error(`Model returned text instead of audio: "${textResponse}"`);
        }
        
        throw new Error("No audio data received from Gemini. Check console for details.");
      }

      const rawBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        rawBytes,
        ctx,
        24000,
        1,
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      return new Promise((resolve) => {
        source.onended = () => resolve(rawBytes);
        source.start();
      });
    } catch (error: any) {
      console.error("TTS Synthesis Error:", error);
      throw error;
    }
  }
}

export const ttsService = new TTSService();
