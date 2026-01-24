
import React from 'react';
import { AudioVisualizerProps } from '../types';

export const Visualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, color }) => {
  const bars = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex items-end gap-1 h-12 w-full justify-center px-4 overflow-hidden">
      {bars.map((bar) => (
        <div
          key={bar}
          className="w-1.5 rounded-t-full transition-all duration-300"
          style={{
            backgroundColor: color,
            height: isPlaying 
              ? `${20 + Math.random() * 80}%` 
              : '10%',
            opacity: isPlaying ? 1 : 0.3,
            transitionDelay: isPlaying ? `${bar * 50}ms` : '0ms'
          }}
        />
      ))}
    </div>
  );
};
