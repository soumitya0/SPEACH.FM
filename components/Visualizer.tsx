
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = isPlaying ? color : `${color}33`;
        
        // Rounded bar drawing
        const radius = barWidth / 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, [radius, radius, 0, 0]);
        } else {
            ctx.rect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        }
        ctx.fill();

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, color]);

  return (
    <div className="h-16 w-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden px-2 border border-white/5">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={64} 
        className="w-full h-full opacity-90"
      />
    </div>
  );
};
