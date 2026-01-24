
import React, { useState, useRef, useEffect } from 'react';
import { VOICES, DEFAULT_PROMPT } from './constants';
import { ttsService } from './services/ttsService';
import { Visualizer } from './components/Visualizer';
import { Voice } from './types';
import { createWavBlob } from './utils';

const App: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [inputText, setInputText] = useState(DEFAULT_PROMPT);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(0);

  // Auto-scroll animation effect
  useEffect(() => {
    if (!isBroadcasting || !playbackStartTime || !durationRef.current) return;

    let frameId: number;
    const duration = durationRef.current;

    const step = () => {
      const now = performance.now();
      const elapsed = (now - playbackStartTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      setBroadcastProgress(progress * 100);

      if (scrollRef.current) {
        const el = scrollRef.current;
        // Total height that needs to be scrolled to get from start to finish
        const totalScrollable = el.scrollHeight - el.clientHeight;
        if (totalScrollable > 0) {
          // Linear interpolation for scroll position
          el.scrollTop = progress * totalScrollable;
        }
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setIsBroadcasting(false);
        setPlaybackStartTime(null);
        setAnalyser(null);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isBroadcasting, playbackStartTime]);

  const handleBroadcast = async () => {
    if (!inputText.trim() || isBroadcasting) return;
    
    setIsBroadcasting(true);
    setError(null);
    setLastAudioBlob(null);
    setBroadcastProgress(0);
    setPlaybackStartTime(null);
    
    try {
      // 1. Synthesize
      const { rawBytes, duration, audioContext, source } = await ttsService.synthesizeAndPlay(inputText, selectedVoice.id);
      
      durationRef.current = duration;
      const wavBlob = createWavBlob(rawBytes);
      setLastAudioBlob(wavBlob);

      // 2. Visualizer Setup
      const newAnalyser = audioContext.createAnalyser();
      newAnalyser.fftSize = 64;
      source.connect(newAnalyser);
      newAnalyser.connect(audioContext.destination);
      setAnalyser(newAnalyser);

      // 3. Playback Start
      source.start(0);
      setPlaybackStartTime(performance.now());

      source.onended = () => {
        setIsBroadcasting(false);
        setPlaybackStartTime(null);
        setAnalyser(null);
      };

    } catch (err: any) {
      console.error("Broadcast failed:", err);
      setError(err.message || "Broadcast signal failed. Please try again.");
      setIsBroadcasting(false);
      setPlaybackStartTime(null);
    }
  };

  const downloadAudio = () => {
    if (!lastAudioBlob) return;
    const url = URL.createObjectURL(lastAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPEACH_FM_${selectedVoice.name}_Broadcast.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-blue-500/30">
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">S</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">SPEACH.FM</h1>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-gray-400">
          <div className="flex flex-col items-end">
            <span className="text-white/40 tracking-widest">TRANSMISSION STATUS</span>
            <span className={`flex items-center gap-2 ${isBroadcasting ? 'text-red-500' : 'text-green-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
              {isBroadcasting ? 'ACTIVE ENCODING' : 'IDLE / READY'}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-2 mb-2">Host Selection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                disabled={isBroadcasting}
                onClick={() => setSelectedVoice(voice)}
                className={`w-full group relative transition-all duration-300 p-3 rounded-xl flex items-center gap-3 border ${
                  selectedVoice.id === voice.id 
                    ? 'bg-white/5 border-white/20 shadow-lg' 
                    : 'bg-transparent border-transparent opacity-40 hover:opacity-80'
                } ${isBroadcasting ? 'cursor-not-allowed' : ''}`}
                style={{ borderLeftColor: selectedVoice.id === voice.id ? voice.color : 'transparent', borderLeftWidth: selectedVoice.id === voice.id ? '4px' : '1px' }}
              >
                <img src={voice.avatar} alt={voice.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 text-left">
                  <div className="font-bold text-sm">{voice.name}</div>
                  <div className="text-[10px] text-gray-500 truncate">{voice.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Console */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          <div className={`glass rounded-[2rem] p-6 md:p-10 flex-1 flex flex-col gap-8 transition-all duration-700 relative overflow-hidden ${isBroadcasting ? 'border-red-500/40' : 'border-white/10'}`}>
            
            <div className="flex justify-between items-center relative z-10">
              <div className="font-mono text-[10px] tracking-tighter text-gray-400 bg-white/5 px-4 py-1.5 rounded-full flex items-center gap-3">
                <span className="opacity-50">STATION:</span>
                <span className="text-white font-bold">{selectedVoice.id.toUpperCase()}</span>
                <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                <span className="opacity-50">FREQ:</span>
                <span className="text-white font-bold italic">24.0KHZ</span>
              </div>
              
              <div className="flex items-center gap-6">
                 {isBroadcasting && (
                   <div className="hidden md:flex items-center gap-2 font-mono text-[10px] text-red-500">
                      <span className="animate-pulse">REC</span>
                      <span className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${broadcastProgress}%` }}></div>
                      </span>
                   </div>
                 )}
                 <div className="flex gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`}></div>
                    <div className="w-2 h-2 rounded-full bg-white/10"></div>
                 </div>
              </div>
            </div>

            <div className="relative flex-1 min-h-[400px]">
              {isBroadcasting ? (
                <div className="absolute inset-0 flex flex-col overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto no-scrollbar"
                  >
                    {/* Padding top/bottom exactly half the container height (approx 200px) ensures text starts and ends centered */}
                    <div className="pt-[180px] pb-[180px] space-y-20 px-4 text-center">
                      {inputText.split('\n').filter(p => p.trim()).map((para, i) => (
                        <p 
                          key={i} 
                          className="text-4xl md:text-6xl font-black leading-[1.2] tracking-tighter transition-all duration-500"
                          style={{ color: selectedVoice.color, textShadow: `0 0 40px ${selectedVoice.color}33` }}
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                  {/* Reading Focus Line - Centralizing guide */}
                  <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[120px] border-y border-white/10 bg-white/[0.01] pointer-events-none z-10">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444] animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your radio script here..."
                  className="w-full h-full bg-transparent text-3xl font-bold leading-relaxed resize-none focus:outline-none placeholder:text-white/5 border-none no-scrollbar"
                  spellCheck={false}
                />
              )}
            </div>

            <div className="space-y-6 relative z-10">
              <Visualizer analyser={analyser} isPlaying={isBroadcasting} color={selectedVoice.color} />
              
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Active Persona</span>
                  <div className="text-sm font-medium flex items-center gap-2 text-white/80">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedVoice.color }}></span>
                    {selectedVoice.personality}
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                  <button
                    onClick={downloadAudio}
                    disabled={!lastAudioBlob || isBroadcasting}
                    className={`p-4 rounded-2xl border transition-all ${
                      lastAudioBlob && !isBroadcasting
                        ? 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        : 'bg-transparent border-white/5 text-gray-700 cursor-not-allowed opacity-20'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>

                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || !inputText.trim()}
                    className={`flex-1 md:min-w-[200px] py-4 rounded-2xl font-black text-lg tracking-widest transition-all duration-500 ${
                      isBroadcasting 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white text-black hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isBroadcasting ? "LIVE ON AIR" : "START BROADCAST"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-[10px] font-mono text-center uppercase">
              [SYSTEM_ERROR] :: {error}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body {
          background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0);
          background-size: 32px 32px;
        }
      `}</style>
    </div>
  );
};

export default App;
