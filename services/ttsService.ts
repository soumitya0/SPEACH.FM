import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils";

const GEMINI_API_KEY = "AIzaSyAWDiE0vg00qYkEFUGi1E5h2bq5LWiGWwY";

const VOICE_MAP: Record<string, string> = {
  'Aradhya': 'Kore',
  'Kore': 'Kore',
  'Puck': 'Puck',
  'Charon': 'Charon',
  'Fenrir': 'Fenrir',
  'Zephyr': 'Zephyr'
};

export interface TTSResult {
  rawBytes: Uint8Array;
  duration: number;
  audioContext: AudioContext;
  source: AudioBufferSourceNode;
}

export class TTSService {
  private audioContext: AudioContext | null = null;

  public getContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    return this.audioContext;
  }

  async synthesizeAndPlay(text: string, voiceId: string): Promise<TTSResult> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Always create a new instance as per developer guidelines for up-to-date API keys
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
      if (!candidate || !candidate.content) {
        throw new Error("No response content from AI.");
      }

      // More robust check for audio part - look for any part with inlineData
      const audioPart = candidate.content.parts.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart?.text) {
          throw new Error(`Model returned text instead of audio: "${textPart.text}"`);
        }
        throw new Error("No audio data received from the API.");
      }

      const rawBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(rawBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      return {
        rawBytes,
        duration: audioBuffer.duration,
        audioContext: ctx,
        source
      };
    } catch (error: any) {
      console.error("TTS Synthesis Error:", error);
      throw error;
    }
  }
}

export const ttsService = new TTSService();
