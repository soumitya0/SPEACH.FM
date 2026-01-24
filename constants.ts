
import { Voice } from './types';

export const VOICES: Voice[] = [
  {
    id: 'Aradhya',
    name: 'Aradhya',
    description: 'Hindi News Host',
    personality: 'Clear, elegant, and warm Hindi delivery.',
    color: '#f59e0b', // amber
    avatar: 'https://picsum.photos/seed/aradhya/200/200'
  },
  {
    id: 'Kore',
    name: 'Kore',
    description: 'The Calm Narrator',
    personality: 'Steady, professional, and soothing.',
    color: '#3b82f6', // blue
    avatar: 'https://picsum.photos/seed/kore/200/200'
  },
  {
    id: 'Puck',
    name: 'Puck',
    description: 'The Energetic Host',
    personality: 'Bright, fast-paced, and cheerful.',
    color: '#ef4444', // red
    avatar: 'https://picsum.photos/seed/puck/200/200'
  },
  {
    id: 'Charon',
    name: 'Charon',
    description: 'The Deep Voice',
    personality: 'Resonant, serious, and authoritative.',
    color: '#10b981', // emerald
    avatar: 'https://picsum.photos/seed/charon/200/200'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    description: 'The Smooth Operator',
    personality: 'Cool, relaxed, and modern.',
    color: '#8b5cf6', // violet
    avatar: 'https://picsum.photos/seed/fenrir/200/200'
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    description: 'The Friendly Neighbor',
    personality: 'Warm, approachable, and helpful.',
    color: '#f472b6', // pink
    avatar: 'https://picsum.photos/seed/zephyr/200/200'
  }
];

export const DEFAULT_PROMPT = "Welcome to the all-new SPEACH.FM! स्पीच एफ़एम पर आपका स्वागत है। I am your host, Aradhya, broadcasting live through the power of Google's Gemini AI. Type any message below and let's start the show!";
