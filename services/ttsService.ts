import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils";

const GEMINI_API_KEY = "AIzaSyAWDiE0vg00qYkEFUGi1E5h2bq5LWiGWwY";

const VOICE_MAP: Record<string, string> = {
  Aradhya: "Kore",
  Kore: "Kore",
  Puck: "Puck",
  Charon: "Charon",
  Fenrir: "Fenrir",
  Zephyr: "Zephyr",
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
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
    }
    return this.audioContext;
  }

  async synthesizeAndPlay(
    text: string,
    voiceId: string,
    customApiKey?: string
  ): Promise<TTSResult> {
    const ctx = this.getContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Use custom API key if provided, otherwise use default
    const apiKey = (customApiKey && customApiKey.trim()) || GEMINI_API_KEY;

    // Validate API key format
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("API key is missing or invalid");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const voiceName = VOICE_MAP[voiceId] || "Kore";

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
      const audioPart = candidate.content.parts.find((p) => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        const textPart = candidate.content.parts.find((p) => p.text);
        if (textPart?.text) {
          throw new Error(
            `Model returned text instead of audio: "${textPart.text}"`
          );
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
        source,
      };
    } catch (error: any) {
      console.error("TTS Synthesis Error:", error);
      throw error;
    }
  }
}

export const ttsService = new TTSService();
