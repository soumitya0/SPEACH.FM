
import React, { useState, useRef, useEffect } from 'react';
import { VOICES, DEFAULT_PROMPT } from './constants';
import { ttsService } from './services/ttsService';
import { Visualizer } from './components/Visualizer';
import { Voice, AppTab } from './types';
import { createWavBlob } from './utils';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('broadcast');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [inputText, setInputText] = useState(DEFAULT_PROMPT);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [coverImage, setCoverImage] = useState<string>('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(0);

  // Auto-scroll logic
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
        const totalScrollable = el.scrollHeight - el.clientHeight;
        if (totalScrollable > 0) el.scrollTop = progress * totalScrollable;
      }
      if (progress < 1) frameId = requestAnimationFrame(step);
      else {
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
    setBroadcastProgress(0);
    try {
      const { rawBytes, duration, audioContext, source } = await ttsService.synthesizeAndPlay(inputText, selectedVoice.id);
      durationRef.current = duration;
      setLastAudioBlob(createWavBlob(rawBytes));
      const newAnalyser = audioContext.createAnalyser();
      newAnalyser.fftSize = 64;
      source.connect(newAnalyser);
      newAnalyser.connect(audioContext.destination);
      setAnalyser(newAnalyser);
      source.start(0);
      setPlaybackStartTime(performance.now());
      source.onended = () => {
        setIsBroadcasting(false);
        setPlaybackStartTime(null);
        setAnalyser(null);
      };
    } catch (err: any) {
      setError(err.message || "Synthesis failed.");
      setIsBroadcasting(false);
    }
  };

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setCoverImage(event.target?.result as string);
      reader.readAsDataURL(file);
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
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-white font-sans selection:bg-white/20">
      
      {/* PERSISTENT SIDEBAR */}
      <aside className="w-72 md:w-80 border-r border-white/5 flex flex-col glass z-50">
        <div className="p-8 pb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black text-white">S</div>
          <h1 className="text-xl font-black italic tracking-tighter">SPEACH.FM</h1>
        </div>

        <nav className="px-4 space-y-1 mb-8">
          <button 
            onClick={() => setActiveTab('broadcast')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'broadcast' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 10-10c1.8 0 3.5.5 5 1.4L18.4 2a1 1 0 0 1 1.6.8v6.2a1 1 0 0 1-1 1h-6.2a1 1 0 0 1-.8-1.6L14.6 6.8A6 6 0 1 0 18 12h2a8 8 0 1 1-18 0Z"/></svg>
            Broadcast Console
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Station Settings
          </button>
        </nav>

        <div className="px-8 mb-2 flex items-center justify-between">
           <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Live Hosts</span>
           <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-8 space-y-2">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              disabled={isBroadcasting}
              onClick={() => setSelectedVoice(voice)}
              className={`w-full group p-3 rounded-2xl flex items-center gap-4 transition-all border ${
                selectedVoice.id === voice.id 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-transparent border-transparent opacity-40 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              <img src={voice.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
              <div className="text-left">
                <div className="text-sm font-bold">{voice.name}</div>
                <div className="text-[10px] text-white/40 truncate w-32">{voice.description}</div>
              </div>
              {selectedVoice.id === voice.id && (
                <div className="ml-auto w-1 h-4 rounded-full" style={{ backgroundColor: voice.color }}></div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-white/5 text-[9px] font-mono text-white/20 uppercase tracking-widest text-center">
          Powered by Gemini 2.5 Flash
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        
        {/* TAB: BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 flex flex-col h-full relative p-8">
            <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
              
              {/* Left Column: Input or Teleprompter */}
              <div className="flex-[3] glass rounded-[2.5rem] flex flex-col p-8 md:p-12 relative overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                   <div className="font-mono text-[10px] text-white/40 flex gap-4 uppercase tracking-widest">
                      <span>Host: <span className="text-white">{selectedVoice.name}</span></span>
                      <span>Modality: <span className="text-white">PCM_24K</span></span>
                   </div>
                   {isBroadcasting && (
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-red-500 animate-pulse">RECORDING_STREAM</span>
                        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${broadcastProgress}%` }}></div>
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex-1 relative">
                  {isBroadcasting ? (
                    <div className="absolute inset-0 flex flex-col">
                       <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
                       <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar py-[25vh]">
                          <div className="space-y-24 px-8 text-center">
                            {inputText.split('\n').filter(p => p.trim()).map((para, i) => (
                              <p 
                                key={i} 
                                className="text-4xl md:text-6xl font-black leading-tight tracking-tighter"
                                style={{ color: selectedVoice.color, textShadow: `0 0 50px ${selectedVoice.color}44` }}
                              >
                                {para}
                              </p>
                            ))}
                          </div>
                       </div>
                       <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 z-0"></div>
                    </div>
                  ) : (
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Start writing your script here..."
                      className="w-full h-full bg-transparent border-none focus:ring-0 text-4xl md:text-5xl font-black leading-tight placeholder:text-white/5 resize-none no-scrollbar"
                    />
                  )}
                </div>
              </div>

              {/* Right Column: Player & Controls */}
              <div className="flex-[2] flex flex-col gap-6">
                
                {/* ALBUM / CD PLAYER */}
                <div className="flex-1 glass rounded-[2.5rem] flex flex-col items-center justify-center p-8 relative overflow-hidden group">
                   {/* Background Glow */}
                   <div 
                    className="absolute inset-0 opacity-10 blur-[100px] transition-all duration-1000"
                    style={{ backgroundColor: selectedVoice.color }}
                   ></div>

                   <div className="relative">
                      {/* Outer Vinyl */}
                      <div 
                        className={`w-48 h-48 md:w-64 md:h-64 rounded-full bg-black shadow-2xl flex items-center justify-center relative overflow-hidden border-4 border-white/5 animate-spin-slow ${!isBroadcasting ? 'paused' : ''}`}
                      >
                        {/* Grooves */}
                        <div className="absolute inset-0 rounded-full opacity-30 border-[10px] border-white/10"></div>
                        <div className="absolute inset-4 rounded-full opacity-20 border-[8px] border-white/5"></div>
                        <div className="absolute inset-8 rounded-full opacity-10 border-[6px] border-white/5"></div>
                        
                        {/* User Uploaded Cover */}
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-black z-10">
                           <img src={coverImage} className="w-full h-full object-cover" alt="Cover" />
                        </div>
                        
                        {/* Center Pin */}
                        <div className="absolute w-4 h-4 bg-black rounded-full border-2 border-white/20 z-20"></div>
                      </div>

                      {/* Floating Indicator */}
                      {isBroadcasting && (
                        <div className="absolute -right-4 top-0 bg-red-600 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-red-600/20">
                           On Air
                        </div>
                      )}
                   </div>

                   <div className="mt-8 text-center">
                      <h3 className="text-xl font-black uppercase tracking-widest">{isBroadcasting ? 'Now Broadcasting' : 'Radio Ready'}</h3>
                      <p className="text-sm text-white/40 font-medium mt-1">{selectedVoice.personality}</p>
                   </div>
                </div>

                {/* BOTTOM TOOLS */}
                <div className="glass rounded-[2.5rem] p-8 flex flex-col gap-6">
                   <Visualizer analyser={analyser} isPlaying={isBroadcasting} color={selectedVoice.color} />
                   
                   <div className="flex gap-4">
                      <button
                        onClick={downloadAudio}
                        disabled={!lastAudioBlob || isBroadcasting}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>

                      <button
                        onClick={handleBroadcast}
                        disabled={isBroadcasting || !inputText.trim()}
                        className={`flex-1 py-4 rounded-2xl font-black text-lg tracking-widest transition-all ${
                          isBroadcasting 
                            ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
                            : 'bg-white text-black hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        {isBroadcasting ? "STATION LIVE" : "BROADCAST"}
                      </button>
                   </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-xs font-mono px-4 py-2 rounded-lg uppercase tracking-widest z-50">
                [SYSTEM_ERROR]: {error}
              </div>
            )}
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
             <div className="w-full glass rounded-[3rem] p-12 text-center space-y-10">
                <div className="space-y-2">
                   <h2 className="text-4xl font-black uppercase tracking-tighter">Station Aesthetics</h2>
                   <p className="text-white/40 font-medium">Customize your broadcast visuals and station ID.</p>
                </div>

                <div className="relative group mx-auto w-64 h-64">
                   <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-all duration-500"></div>
                   <div className="relative w-full h-full rounded-full border-4 border-white/10 overflow-hidden">
                      <img src={coverImage} className="w-full h-full object-cover" alt="Album Art" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                         <span className="text-sm font-bold uppercase tracking-widest">Change Image</span>
                         <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
                      </label>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Visualizer Sensitivity</div>
                      <div className="text-sm font-bold">OPTIMIZED (24K)</div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Animation Rate</div>
                      <div className="text-sm font-bold">12s / ROTATION</div>
                   </div>
                </div>

                <button 
                  onClick={() => setActiveTab('broadcast')}
                  className="w-full py-5 rounded-[2rem] bg-blue-600 font-black text-xl uppercase tracking-tighter hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
                >
                  Save & Return
                </button>
             </div>
          </div>
        )}

      </main>

      {/* BACKGROUND ATMOSPHERE */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
         <div 
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[200px] opacity-20 transition-all duration-1000"
          style={{ backgroundColor: selectedVoice.color }}
         ></div>
      </div>
    </div>
  );
};

export default App;
