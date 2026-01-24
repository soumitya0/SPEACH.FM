
export interface Voice {
  id: string;
  name: string;
  description: string;
  personality: string;
  color: string;
  avatar: string;
}

export interface BroadcastState {
  isBroadcasting: boolean;
  text: string;
  selectedVoiceId: string;
  error: string | null;
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  color: string;
}

export type AppTab = 'broadcast' | 'settings';
