import React, { useState } from 'react';
import { VOICES, DEFAULT_PROMPT } from './constants';
import { ttsService } from './services/ttsService';
import { Visualizer } from './components/Visualizer';
import { Voice } from './types';
import { createWavBlob } from './utils';

const App: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICES[0]);
  const [inputText, setInputText] = useState(DEFAULT_PROMPT);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  
  const handleBroadcast = async () => {
    if (!inputText.trim() || isBroadcasting) return;
    
    setIsBroadcasting(true);
    setError(null);
    setLastAudioBlob(null);
    
    try {
      const rawBytes = await ttsService.synthesizeAndPlay(inputText, selectedVoice.id);
      const wavBlob = createWavBlob(rawBytes);
      setLastAudioBlob(wavBlob);
    } catch (err: any) {
      setError(err.message || "Failed to generate broadcast. Please try again.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const downloadAudio = () => {
    if (!lastAudioBlob) return;
    const url = URL.createObjectURL(lastAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString().replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString([], { hour12: false }).replace(/:/g, '-');
    
    a.download = `SPEACH_FM_${selectedVoice.name}_${dateStr}_${timeStr}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasAudio = lastAudioBlob !== null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">S</div>
          <h1 className="text-2xl font-extrabold tracking-tighter uppercase">SPEACH.FM</h1>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm font-mono text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LIVE BROADCAST
          </span>
          <span className="bg-white/5 px-2 py-1 rounded">24,000Hz PCM</span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Station Selector */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Choose your host</h2>
          <div className="space-y-3">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                // Fixed: Changed 'ring-2' to 'border-2' and added 'border-transparent' to maintain consistent layout
                className={`w-full group relative overflow-hidden transition-all duration-300 p-4 rounded-2xl flex items-center gap-4 border-2 ${
                  selectedVoice.id === voice.id 
                    ? 'glass radio-glow' 
                    : 'bg-transparent border-transparent hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
                // Fixed: Replaced invalid property 'ringColor' with 'borderColor'
                style={{ borderColor: selectedVoice.id === voice.id ? voice.color : 'transparent' }}
              >
                <img src={voice.avatar} alt={voice.name} className="w-12 h-12 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                <div className="flex-1 text-left">
                  <div className="font-bold text-lg">{voice.name}</div>
                  <div className="text-xs text-gray-400">{voice.description}</div>
                </div>
                {selectedVoice.id === voice.id && (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: voice.color }}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Console */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
          <div className="glass rounded-3xl p-6 md:p-8 flex-1 flex flex-col gap-6 radio-glow">
            <div className="flex justify-between items-center">
              <div className="font-mono text-xs text-gray-400 px-3 py-1 bg-white/5 rounded-full uppercase">
                SPEACH_STATION_{selectedVoice.id.toUpperCase()} // READY
              </div>
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What should the host say?"
              className="w-full flex-1 min-h-[200px] bg-transparent text-2xl font-medium leading-relaxed resize-none focus:outline-none placeholder:text-gray-700"
              spellCheck={false}
            />

            <div className="flex flex-col gap-4">
              <Visualizer isPlaying={isBroadcasting} color={selectedVoice.color} />
              
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400 font-medium">
                  Voice Personality: <span className="text-white">{selectedVoice.personality}</span>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={downloadAudio}
                    disabled={!hasAudio || isBroadcasting}
                    title={!hasAudio ? "Broadcast something first to download" : "Download as WAV"}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-full font-bold text-sm border flex items-center justify-center gap-2 transition-all ${
                      hasAudio && !isBroadcasting
                        ? 'bg-white/5 border-white/20 text-white hover:bg-white/10 cursor-pointer'
                        : 'bg-transparent border-white/5 text-gray-600 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    DOWNLOAD
                  </button>

                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting}
                    className={`flex-[2] md:flex-none px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-xl ${
                      isBroadcasting 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-black hover:scale-105 hover:shadow-white/20 active:scale-95'
                    }`}
                  >
                    {isBroadcasting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ON AIR...
                      </span>
                    ) : "BROADCAST"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <footer className="flex flex-col md:flex-row justify-between text-[10px] font-mono text-gray-600 uppercase tracking-widest px-4">
            <div>Engineered with Gemini 2.5 Flash</div>
            <div>© 2024 SPEACH.FM Labs // System Stable</div>
          </footer>
        </div>
      </main>

      {/* Decorative Radio Background Element */}
      <div className="fixed -z-10 bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed -z-10 top-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none"></div>
    </div>
  );
};

export default App;