
import React, { useState, useRef, useEffect } from 'react';
import { VOICES, DEFAULT_PROMPT } from './constants';
import { ttsService } from './services/ttsService';
import { Visualizer } from './components/Visualizer';
import { Voice, AppTab } from './types';
import { createWavBlob } from './utils';

const LOADING_MESSAGES = [
  "INITIATING NEURAL ENCODER...",
  "ANALYZING SCRIPT SYNTAX...",
  "SYNTHESIZING PCM STREAM...",
  "CALIBRATING VOCAL FREQUENCIES...",
  "OPTIMIZING SIGNAL INTEGRITY...",
  "VIRTUAL HOST READYING...",
  "FINALIZING BROADCAST BUFFER..."
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('broadcast');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [inputText, setInputText] = useState(DEFAULT_PROMPT);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isAlbumFullscreen, setIsAlbumFullscreen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [showRelaxMsg, setShowRelaxMsg] = useState(false);
  const [playbackStartTime, setPlaybackStartTime] = useState<number | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Custom Station Settings
  const [stationName, setStationName] = useState<string>('SPEACH.FM');
  const [albumName, setAlbumName] = useState<string>('SYNTHETIC DREAMS');
  const [stationDescription, setStationDescription] = useState<string>('The ultimate interactive AI radio station.');
  const [coverImage, setCoverImage] = useState<string>('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<number>(0);

  // Responsive sidebar initial state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer logic for synthesis
  useEffect(() => {
    let timer: number;
    if (isSynthesizing && countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isSynthesizing && countdown === 0) {
      setShowRelaxMsg(true);
    }
    return () => clearInterval(timer);
  }, [isSynthesizing, countdown]);

  // Auto-scroll logic for teleprompter
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
    if (!inputText.trim() || isBroadcasting || isSynthesizing) return;
    
    setIsSynthesizing(true);
    setCountdown(60);
    setShowRelaxMsg(false);
    setLoadingMessage(LOADING_MESSAGES[0]);
    setError(null);
    setBroadcastProgress(0);

    // Dynamic loading messages
    let msgIdx = 1;
    const msgInterval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[msgIdx % LOADING_MESSAGES.length]);
      msgIdx++;
    }, 1200);

    try {
      const { rawBytes, duration, audioContext, source } = await ttsService.synthesizeAndPlay(inputText, selectedVoice.id);
      
      clearInterval(msgInterval);
      setIsSynthesizing(false);
      setIsBroadcasting(true);
      
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
      clearInterval(msgInterval);
      setIsSynthesizing(false);
      setError(err.message || "Synthesis failed.");
    }
  };

  const recalibrateSignal = () => {
    setInputText(DEFAULT_PROMPT);
    setBroadcastProgress(0);
    setError(null);
    setLastAudioBlob(null);
    setIsBroadcasting(false);
    setIsSynthesizing(false);
    setPlaybackStartTime(null);
    setAnalyser(null);
    setStationName('SPEACH.FM');
    setAlbumName('SYNTHETIC DREAMS');
    setStationDescription('The ultimate interactive AI radio station.');
    setCoverImage('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800');
    setIsAlbumFullscreen(false);
  };

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCoverImage(result);
        setImageUrlInput('');
      };
      reader.readAsDataURL(file);
    }
  };

  const applyImageUrl = () => {
    if (imageUrlInput.trim()) {
      setCoverImage(imageUrlInput.trim());
    }
  };

  const downloadAudio = () => {
    if (!lastAudioBlob) return;
    const url = URL.createObjectURL(lastAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stationName.replace(/\s+/g, '_')}_Broadcast.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleAlbumFullscreen = () => {
    setIsAlbumFullscreen(!isAlbumFullscreen);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-white font-sans selection:bg-white/20">
      
      {/* PERSISTENT SIDEBAR - Left Side */}
      <aside 
        className={`fixed lg:relative h-full border-white/5 flex flex-col glass z-50 transition-all duration-300 ease-in-out overflow-hidden ${
          (isSidebarOpen && !isAlbumFullscreen)
            ? 'w-full sm:w-80 translate-x-0 border-r opacity-100' 
            : 'w-0 -translate-x-full lg:w-0 lg:border-none opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-6 md:p-8 pb-4 flex items-center justify-between min-w-[320px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20">S</div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase truncate">{stationName}</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className="px-4 space-y-1 mb-8 min-w-[320px]">
          <button 
            onClick={() => { setActiveTab('broadcast'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'broadcast' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12a10 10 0 0 1 10-10c1.8 0 3.5.5 5 1.4L18.4 2a1 1 0 0 1-1.6.8v6.2a1 1 0 0 1-1 1h-6.2a1 1 0 0 1-.8-1.6L14.6 6.8A6 6 0 1 0 18 12h2a8 8 0 1 1-18 0Z"/></svg>
            Broadcast Console
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Station Settings
          </button>
        </nav>

        <div className="px-8 mb-2 flex items-center justify-between min-w-[320px]">
           <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Live Hosts</span>
           <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-8 space-y-2 overflow-x-hidden min-w-[320px]">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              disabled={isBroadcasting || isSynthesizing}
              onClick={() => setSelectedVoice(voice)}
              className={`w-full group p-3 rounded-2xl flex items-center gap-4 transition-all border ${
                selectedVoice.id === voice.id 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-transparent border-transparent opacity-40 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              <img src={voice.avatar} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
              <div className="text-left overflow-hidden">
                <div className="text-sm font-bold truncate">{voice.name}</div>
                <div className="text-[10px] text-white/40 truncate w-32">{voice.description}</div>
              </div>
              {selectedVoice.id === voice.id && (
                <div className="ml-auto w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: voice.color }}></div>
              )}
            </button>
          ))}
        </div>

        {/* Global Reset Button in Sidebar */}
        <div className="px-4 pb-4 min-w-[320px]">
          <button 
            onClick={recalibrateSignal}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Recalibrate Signal
          </button>
        </div>

        <div className="p-6 border-t border-white/5 text-[9px] font-mono text-white/20 uppercase tracking-widest text-center min-w-[320px]">
          Powered by Gemini 2.5 Flash
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full flex flex-col relative overflow-hidden transition-all duration-300">
        
        {(!isSidebarOpen && !isAlbumFullscreen) && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 z-[60] p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        )}

        {/* TAB: BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="flex-1 flex flex-col h-full relative p-4 md:p-6 lg:p-8">
            <div className={`flex-1 flex flex-col xl:flex-row gap-4 md:gap-6 lg:gap-8 min-h-0 ${isAlbumFullscreen ? 'justify-center items-center' : ''}`}>
              
              {/* Layout 1: Teleprompter / Script Area */}
              <div className={`glass rounded-[1.5rem] md:rounded-[2.5rem] flex-col p-5 md:p-10 relative overflow-hidden transition-all duration-500 ${isAlbumFullscreen ? 'hidden' : 'flex flex-[3]'} ${isBroadcasting ? 'min-h-[160px] xl:min-h-0' : 'flex-1'}`}>
                
                {/* Localized Loader Overlay */}
                {isSynthesizing && (
                  <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl transition-all duration-500 p-8 text-center">
                    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                      <div 
                        className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" 
                        style={{ borderColor: `${selectedVoice.color} transparent transparent transparent` }}
                      ></div>
                      
                      <div className="flex flex-col items-center justify-center gap-2 max-w-[80%]">
                        {!showRelaxMsg ? (
                          <div className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter" style={{ color: selectedVoice.color }}>
                            {countdown}
                          </div>
                        ) : (
                          <div className="animate-pulse px-4">
                            <span className="text-xs md:text-sm font-black leading-tight uppercase tracking-[0.2em] text-white">
                              SIT RELAX<br/>
                              <span className="text-[10px] text-white/50">WE ARE ANALYZING CONTEXT</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scan"></div>
                      </div>
                    </div>
                    
                    <div className="mt-8 space-y-2">
                      <div className="font-mono text-[9px] text-white/30 uppercase tracking-[0.4em] animate-pulse">Neural Signal Synthesis</div>
                      <h2 className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white h-4">{loadingMessage}</h2>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4 md:mb-8">
                   <div className="flex items-center gap-4">
                     {isSidebarOpen && (
                       <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="hidden lg:flex p-1.5 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
                        title="Collapse Sidebar"
                       >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                       </button>
                     )}
                     <div className="font-mono text-[9px] md:text-[10px] text-white/40 flex gap-4 uppercase tracking-widest">
                        <span>Host: <span className="text-white">{selectedVoice.name}</span></span>
                        <span className="hidden sm:inline">Signal: <span className="text-white">PCM_24K</span></span>
                     </div>
                   </div>
                   {isBroadcasting && (
                     <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] font-mono text-red-500 animate-pulse font-bold tracking-tighter">LIVE</span>
                        <div className="w-20 md:w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${broadcastProgress}%` }}></div>
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex-1 relative">
                  {isBroadcasting ? (
                    <div className="absolute inset-0 flex flex-col">
                       <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
                       <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar py-[10vh] md:py-[25vh]">
                          <div className="space-y-12 md:space-y-24 px-4 md:px-8 text-center">
                            {inputText.split('\n').filter(p => p.trim()).map((para, i) => (
                              <p 
                                key={i} 
                                className="text-2xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter"
                                style={{ color: selectedVoice.color, textShadow: `0 0 50px ${selectedVoice.color}44` }}
                              >
                                {para}
                              </p>
                            ))}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Start writing your script here..."
                      disabled={isSynthesizing}
                      className="w-full h-full bg-transparent border-none focus:ring-0 text-xl md:text-4xl lg:text-5xl font-black leading-tight placeholder:text-white/5 resize-none no-scrollbar transition-opacity duration-300"
                      style={{ opacity: isSynthesizing ? 0.05 : 1 }}
                    />
                  )}
                </div>
              </div>

              {/* Layout 2: Player / CD Area */}
              <div className={`flex flex-col gap-4 transition-all duration-700 ${isAlbumFullscreen ? 'w-full h-full flex-1' : 'flex-[2]'} ${isBroadcasting ? 'h-auto' : ''}`}>
                
                <div className={`glass rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden group transition-all duration-700 ${isAlbumFullscreen ? 'flex-1 p-8 md:p-16' : (isBroadcasting ? 'py-6 md:py-8' : 'flex-1 lg:flex-col')} gap-4 md:gap-8`}>
                   
                   {/* Fullscreen Toggle Button */}
                   <button 
                    onClick={toggleAlbumFullscreen}
                    className="absolute top-4 right-4 z-[40] p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all backdrop-blur-md"
                    title={isAlbumFullscreen ? "Exit Immersive View" : "Immersive View"}
                   >
                    {isAlbumFullscreen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                    )}
                   </button>

                   {/* Background Glow */}
                   <div 
                    className="absolute inset-0 opacity-10 blur-[100px] transition-all duration-1000"
                    style={{ backgroundColor: selectedVoice.color }}
                   ></div>

                   <div className="relative shrink-0 transition-transform duration-700">
                      {/* Outer Vinyl / CD */}
                      <div 
                        className={`rounded-full bg-black shadow-2xl flex items-center justify-center relative overflow-hidden border-2 md:border-4 border-white/5 animate-spin-slow transition-all duration-700 ${!isBroadcasting ? 'paused' : ''} ${isAlbumFullscreen ? 'w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-[450px] lg:h-[450px]' : 'w-20 h-20 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-56 lg:h-56'}`}
                      >
                        <div className="absolute inset-0 rounded-full opacity-30 border-[3px] md:border-[10px] border-white/10"></div>
                        <div className="absolute inset-1 md:inset-4 rounded-full opacity-20 border-[2px] md:border-[8px] border-white/5"></div>
                        <div className={`rounded-full overflow-hidden border-2 md:border-4 border-black z-10 shadow-lg transition-all duration-700 ${isAlbumFullscreen ? 'w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-56 lg:h-56' : 'w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-28 lg:h-28'}`}>
                           <img src={coverImage} className="w-full h-full object-cover" alt="Station Artwork" />
                        </div>
                        <div className={`bg-black rounded-full border-1 md:border-2 border-white/20 z-20 transition-all duration-700 ${isAlbumFullscreen ? 'w-4 md:w-10 h-4 md:h-10' : 'w-1.5 md:w-4 h-1.5 md:h-4'}`}></div>
                      </div>

                      {isBroadcasting && (
                        <div className="absolute -right-2 top-0 bg-red-600 text-[8px] md:text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-red-600/20 z-30">
                           LIVE
                        </div>
                      )}
                   </div>

                   {/* Metadata Bar */}
                   <div className={`text-center w-full flex flex-col items-center justify-center transition-all duration-500 flex-1`}>
                      <span className={`hidden lg:block font-mono text-white/20 uppercase tracking-[0.3em] mb-1 font-bold ${isAlbumFullscreen ? 'text-[12px] md:text-[14px] mb-4' : 'text-[9px]'}`}>
                        {isBroadcasting ? 'LIVE TRANSMISSION' : 'STATION IDLE'}
                      </span>
                      
                      <div className={`w-full flex flex-col items-center justify-center transition-all duration-700 ${isAlbumFullscreen ? 'gap-2' : 'lg:gap-0.5'}`}>
                        {/* Title - Stacks vertically in fullscreen and desktop always */}
                        <h3 className={`font-black uppercase tracking-tighter leading-tight whitespace-nowrap transition-all duration-700 ${isAlbumFullscreen ? 'text-2xl sm:text-4xl md:text-6xl lg:text-8xl' : 'text-sm sm:text-lg md:text-3xl lg:text-5xl'}`}>
                          {albumName}
                        </h3>
                        
                        {/* Station Name - Block level stack */}
                        <h4 className={`font-mono text-white/40 uppercase tracking-[0.1em] sm:tracking-[0.2em] lg:tracking-[0.25em] font-bold whitespace-nowrap transition-all duration-700 ${isAlbumFullscreen ? 'text-xs sm:text-sm md:text-lg lg:text-2xl mt-2' : 'text-[9px] sm:text-[10px] md:text-[12px] lg:text-[11px]'}`}>
                          {stationName}
                        </h4>

                        {/* Host Tag - Block level stack */}
                        <div className={`flex items-center gap-1.5 mt-2 lg:mt-3 px-2 py-0.5 lg:px-3 lg:py-1 rounded-full bg-white/5 border border-white/10 shrink-0 transition-all duration-700 ${isAlbumFullscreen ? 'scale-150 mt-8' : ''}`}>
                           <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full" style={{ backgroundColor: selectedVoice.color }}></span>
                           <span className="text-[8px] sm:text-[9px] font-bold text-white/60 uppercase tracking-widest">{selectedVoice.name}</span>
                        </div>
                      </div>

                      <div className={`hidden lg:block flex-1 w-full overflow-y-auto custom-scroll mt-3 px-2 max-w-[280px] transition-all duration-700 ${isAlbumFullscreen ? 'hidden' : ''}`}>
                        <p className="text-xs text-white/50 font-medium whitespace-pre-wrap text-center">
                          {stationDescription}
                        </p>
                      </div>
                   </div>
                </div>

                {/* Layout 3: Controls Area */}
                <div className={`glass rounded-[1rem] md:rounded-[1.25rem] p-3 md:p-4 flex-col gap-3 shrink-0 transition-all duration-500 ${isAlbumFullscreen ? 'hidden' : 'flex'}`}>
                   <Visualizer analyser={analyser} isPlaying={isBroadcasting} color={selectedVoice.color} />
                   
                   <div className="flex gap-2">
                      <button
                        onClick={recalibrateSignal}
                        disabled={isBroadcasting || isSynthesizing}
                        className="p-2 md:p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20 flex items-center justify-center shrink-0 text-white/40 hover:text-white"
                        title="Recalibrate Signal (Reset)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      </button>

                      <button
                        onClick={downloadAudio}
                        disabled={!lastAudioBlob || isBroadcasting || isSynthesizing}
                        className="p-2 md:p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20 flex items-center justify-center shrink-0"
                        title="Download Last Broadcast"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>

                      <button
                        onClick={handleBroadcast}
                        disabled={isBroadcasting || isSynthesizing || !inputText.trim()}
                        className={`flex-1 py-2.5 md:py-3 rounded-lg font-black text-[10px] md:text-xs tracking-[0.2em] transition-all uppercase relative overflow-hidden ${
                          isBroadcasting || isSynthesizing
                            ? 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.3)]' 
                            : 'bg-white text-black hover:scale-[1.01] active:scale-95'
                        }`}
                      >
                        {isSynthesizing ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Synthesizing...
                          </span>
                        ) : isBroadcasting ? "STATION LIVE" : "START BROADCAST"}
                      </button>
                   </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-[9px] font-mono px-5 py-2 rounded-full uppercase tracking-widest z-50 border border-white/20 backdrop-blur-md shadow-2xl">
                {error}
              </div>
            )}
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 lg:p-12 overflow-y-auto custom-scroll">
             <div className="w-full max-w-2xl glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-14 text-center space-y-6 md:space-y-10 my-4">
                <div className="space-y-2">
                   <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Station Aesthetics</h2>
                   <p className="text-white/40 font-medium text-xs md:text-sm">Customize your broadcast visuals and station ID.</p>
                </div>

                <div className="space-y-4 md:space-y-6 text-center">
                  <div className="relative group mx-auto w-32 h-32 md:w-56 md:h-56">
                    <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all duration-500"></div>
                    <div className="relative w-full h-full rounded-full border-2 md:border-4 border-white/10 overflow-hidden shadow-2xl">
                        <img src={coverImage} className="w-full h-full object-cover" alt="Album Art Preview" />
                        <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Upload</span>
                          <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
                        </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                    <input 
                      type="text" 
                      placeholder="Paste Image URL..." 
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm focus:outline-none focus:border-white/20 transition-all"
                    />
                    <button 
                      onClick={applyImageUrl}
                      className="px-4 py-2 bg-white/10 rounded-xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-left">
                   <div className="space-y-1">
                      <label className="text-[8px] md:text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Station Name</label>
                      <input 
                        type="text" 
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs md:text-sm font-bold focus:outline-none focus:border-white/30 transition-all"
                        placeholder="e.g., RADIOWAVE.X"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] md:text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Album / Show Name</label>
                      <input 
                        type="text" 
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs md:text-sm font-bold focus:outline-none focus:border-white/30 transition-all"
                        placeholder="e.g., SYNTHETIC DREAMS"
                      />
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setActiveTab('broadcast')}
                    className="w-full py-4 md:py-5 rounded-xl md:rounded-[2rem] bg-blue-600 font-black text-lg md:text-xl uppercase tracking-tighter hover:scale-[1.02] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Confirm Calibration
                  </button>
                  <button 
                    onClick={recalibrateSignal}
                    className="w-full py-3 rounded-xl text-white/20 hover:text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
                  >
                    Clear Station Data
                  </button>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* BACKGROUND ATMOSPHERE */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
         <div 
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[200px] opacity-10 transition-all duration-1000"
          style={{ backgroundColor: selectedVoice.color }}
         ></div>
         <div 
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[150px] rounded-full"
         ></div>
      </div>
    </div>
  );
};

export default App;
