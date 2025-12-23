
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GeminiBlob } from '@google/genai';
import { ResumeData, InterviewSession } from '../types';
import { decode, encode, decodeAudioData } from '../utils/audio-utils';

interface InterviewRoomProps {
  resumeData: ResumeData;
  onComplete: (session: InterviewSession) => void;
}

const InterviewRoom: React.FC<InterviewRoomProps> = ({ resumeData, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [transcript, setTranscript] = useState<{ speaker: 'AI' | 'Candidate'; text: string; timestamp: number }[]>([]);
  const [currentAIResponse, setCurrentAIResponse] = useState('');
  const [currentCandidateInput, setCurrentCandidateInput] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext; analyser: AnalyserNode } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const aiBufferRef = useRef('');
  const candidateBufferRef = useRef('');
  const faceDetectorRef = useRef<any>(null);

  // Auto-start camera on mount
  useEffect(() => {
    if (typeof (window as any).FaceDetector !== 'undefined') {
      faceDetectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxFaces: 1 });
    }
    canvasRef.current = document.createElement('canvas');

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: "user" }, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Continuous Detection Loop
  useEffect(() => {
    let interval: number;
    if (cameraReady && videoRef.current) {
      interval = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        
        try {
          if (faceDetectorRef.current) {
            const faces = await faceDetectorRef.current.detect(videoRef.current);
            setIsFaceDetected(faces.length > 0);
          } else if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              canvas.width = 160;
              canvas.height = 90;
              ctx.drawImage(videoRef.current, 0, 0, 160, 90);
              const imageData = ctx.getImageData(0, 0, 160, 90);
              const data = imageData.data;
              let brightness = 0;
              for (let i = 0; i < data.length; i += 4) {
                brightness += (data[i] + data[i+1] + data[i+2]) / 3;
              }
              const avg = brightness / (data.length / 4);
              setIsFaceDetected(avg > 45); 
            }
          }
        } catch (e) {
          setIsFaceDetected(false);
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [cameraReady]);

  // Audio Visualizer Loop
  useEffect(() => {
    let animationFrame: number;
    const draw = () => {
      if (!visualizerCanvasRef.current || !audioContextsRef.current) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }

      const canvas = visualizerCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyser = audioContextsRef.current.analyser;
      if (!ctx || !analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = isAISpeaking ? '#3b82f6' : '#10b981';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [isAISpeaking]);

  useEffect(() => {
    let timer: number;
    if (isActive && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleEndInterview();
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const handleEndInterview = useCallback(async () => {
    setIsActive(false);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    
    let recordingUrl = '';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      recordingUrl = URL.createObjectURL(blob);
    }
    
    onComplete({
      startTime: Date.now() - (25 * 60 - timeLeft) * 1000,
      durationLimit: 25 * 60,
      transcript: transcript,
      recordingUrl: recordingUrl
    });
  }, [timeLeft, transcript, onComplete]);

  const startSession = async () => {
    if (!streamRef.current) return;
    
    try {
      const stream = streamRef.current;
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.start(1000);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      audioContextsRef.current = { input: inputCtx, output: outputCtx, analyser };

      const systemInstruction = `
        You are a highly professional Senior Technical Interviewer. 
        MANDATORY: Speak ONLY in English. Use a sophisticated and clear vocabulary.

        INTERVIEW PROTOCOL (25 Minutes):
        1. LISTEN-ACKNOWLEDGE-PROBE: Every time the candidate speaks, briefly acknowledge what they said (e.g., "I see, building that with Node.js makes sense for high concurrency...") before probing with your next technical follow-up.
        2. DEPTH: Ask deeply technical questions about their projects from the resume. Focus on trade-offs, architecture choices, and security.
        3. ADAPTABILITY: If they mention a specific challenge, dig into how they resolved it.
        4. STRUCTURE: Start with an introduction, then 2-3 deep project reviews, and end with a quick summary.
        
        RESUME CONTEXT:
        ${resumeData.text}
        
        SKILLS TO TEST:
        ${resumeData.skills.join(', ')}
      `;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            source.connect(analyser); // For visualization
            
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob: GeminiBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              setIsAISpeaking(true);
              const data = msg.serverContent.modelTurn.parts[0].inlineData.data;
              const ctx = audioContextsRef.current?.output;
              if (ctx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(data), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsAISpeaking(false);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
            }
            if (msg.serverContent?.inputTranscription) {
              candidateBufferRef.current += msg.serverContent.inputTranscription.text;
              setCurrentCandidateInput(candidateBufferRef.current);
            }
            if (msg.serverContent?.outputTranscription) {
              aiBufferRef.current += msg.serverContent.outputTranscription.text;
              setCurrentAIResponse(aiBufferRef.current);
            }
            if (msg.serverContent?.turnComplete) {
              if (candidateBufferRef.current || aiBufferRef.current) {
                setTranscript(prev => [
                  ...prev,
                  ...(candidateBufferRef.current ? [{ speaker: 'Candidate' as const, text: candidateBufferRef.current, timestamp: Date.now() }] : []),
                  ...(aiBufferRef.current ? [{ speaker: 'AI' as const, text: aiBufferRef.current, timestamp: Date.now() }] : [])
                ]);
              }
              aiBufferRef.current = ''; candidateBufferRef.current = '';
              setCurrentAIResponse(''); setCurrentCandidateInput('');
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAISpeaking(false);
            }
          },
          onerror: (e) => console.error(e),
          onclose: () => setIsActive(false)
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`} />
          <div>
            <h2 className="text-lg font-black tracking-tighter uppercase">Technical Live Session</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Biometric Stability: {isFaceDetected ? 'HIGH' : 'UNSTABLE'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Session Expiry</p>
            <p className={`text-3xl font-mono font-black tabular-nums ${timeLeft < 300 ? 'text-red-500' : 'text-blue-500'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>
          {isActive ? (
            <button onClick={handleEndInterview} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-red-900/40 uppercase text-xs tracking-widest active:scale-95">
              Stop Session
            </button>
          ) : (
            <button 
              onClick={startSession} 
              disabled={!cameraReady} 
              className={`px-10 py-3 rounded-2xl font-black transition-all shadow-xl uppercase text-xs tracking-[0.2em] active:scale-95 ${cameraReady ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/40' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              {cameraReady ? 'Initiate Interview' : 'Initializing Media...'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Main Camera Feed */}
          <div className={`video-container shadow-2xl transition-all duration-700 border-8 relative bg-slate-950 group overflow-hidden rounded-[2.5rem] ${
            isFaceDetected 
              ? 'border-emerald-500 shadow-emerald-500/10' 
              : 'border-red-600 shadow-red-600/20'
          }`}>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-90 transition-opacity duration-1000" />
            
            <div className="absolute inset-0 pointer-events-none">
              {/* Face Status Indicator */}
              <div className={`absolute top-8 left-8 flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all duration-500 shadow-2xl backdrop-blur-md ${isFaceDetected ? 'bg-emerald-500/90 text-white' : 'bg-red-600/90 text-white scale-110'}`}>
                <span className={`w-2 h-2 rounded-full ${isFaceDetected ? 'bg-white animate-pulse' : 'bg-white'}`} />
                {isFaceDetected ? 'Visual Match' : 'Visual Lost'}
              </div>
              
              {/* Corner Guides */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] border-2 transition-all duration-700 rounded-[3rem] ${isFaceDetected ? 'border-emerald-400/30 scale-100' : 'border-red-500/40 scale-110'}`}>
                 <div className={`absolute top-0 left-0 w-16 h-16 border-t-[10px] border-l-[10px] rounded-tl-[2rem] transition-colors duration-500 ${isFaceDetected ? 'border-emerald-400' : 'border-red-600'}`} />
                 <div className={`absolute top-0 right-0 w-16 h-16 border-t-[10px] border-r-[10px] rounded-tr-[2rem] transition-colors duration-500 ${isFaceDetected ? 'border-emerald-400' : 'border-red-600'}`} />
                 <div className={`absolute bottom-0 left-0 w-16 h-16 border-b-[10px] border-l-[10px] rounded-bl-[2rem] transition-colors duration-500 ${isFaceDetected ? 'border-emerald-400' : 'border-red-600'}`} />
                 <div className={`absolute bottom-0 right-0 w-16 h-16 border-b-[10px] border-r-[10px] rounded-br-[2rem] transition-colors duration-500 ${isFaceDetected ? 'border-emerald-400' : 'border-red-600'}`} />
              </div>

              {/* No Face Warning Overlay */}
              {!isFaceDetected && (
                 <div className="absolute inset-0 bg-red-950/20 flex flex-col items-center justify-center backdrop-blur-[2px] transition-all duration-1000">
                   <div className="bg-red-600 text-white px-8 py-3 rounded-2xl shadow-2xl font-black text-sm uppercase tracking-[0.3em] animate-bounce">
                     Position Subject
                   </div>
                 </div>
              )}

              {/* Real-time Audio Visualizer */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end px-12 pb-8">
                <div className="flex justify-between items-center mb-4">
                   <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isAISpeaking ? 'text-blue-400' : 'text-emerald-400'}`}>
                     {isAISpeaking ? 'Interviewer Stream' : 'Candidate Stream'}
                   </span>
                </div>
                <canvas ref={visualizerCanvasRef} width={800} height={40} className="w-full h-8 opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Initial Access Shield */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center p-12 max-w-sm">
                  <div className="w-16 h-16 border-[6px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] leading-relaxed">Authorization Required: Handshaking with Camera & Microphone</p>
                </div>
              </div>
            )}
          </div>

          {/* Dialog Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-slate-800/80 px-8 py-5 border-b border-slate-800 flex justify-between items-center">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Communication Log</h3>
               <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                 <span className={`text-[10px] font-black ${isActive ? 'text-emerald-500' : 'text-slate-600'}`}>
                   {isActive ? 'CHANNEL_OPEN' : 'CHANNEL_CLOSED'}
                 </span>
               </div>
            </div>
            <div className="p-10 h-64 overflow-y-auto space-y-8 scrollbar-hide">
              {currentCandidateInput && (
                <div className="flex gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <span className="text-emerald-500 font-black text-[10px] uppercase pt-1 shrink-0 tracking-tighter">YOU:</span>
                  <p className="text-slate-100 text-lg font-medium leading-relaxed">{currentCandidateInput}</p>
                </div>
              )}
              {currentAIResponse && (
                <div className="flex gap-6 border-l-4 border-blue-600/40 pl-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <span className="text-blue-500 font-black text-[10px] uppercase pt-1 shrink-0 tracking-tighter">AI:</span>
                  <p className="text-slate-300 text-lg italic leading-relaxed font-medium">{currentAIResponse}</p>
                </div>
              )}
              {!currentCandidateInput && !currentAIResponse && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <div className="text-4xl mb-4">🎙️</div>
                  <p className="text-slate-600 text-[10px] font-black tracking-[0.5em] uppercase">Listening for Technical Inquiry</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Intel */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h3 className="text-[10px] font-black mb-8 text-blue-500 uppercase tracking-[0.3em]">Competency Matrix</h3>
            <div className="flex flex-wrap gap-2.5">
              {resumeData.skills.map(skill => (
                <span key={skill} className="bg-blue-500/10 text-blue-400 text-[10px] px-4 py-2 rounded-xl border border-blue-500/20 font-black uppercase tracking-wider">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
             <h4 className="text-[10px] font-black text-slate-500 mb-8 flex items-center gap-3 uppercase tracking-[0.3em]">
               <span className="text-blue-500 text-lg">⚙️</span> Calibration Intel
             </h4>
             <div className="space-y-6">
                <div className={`p-6 rounded-3xl border-2 transition-all duration-700 ${isFaceDetected ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-600/10 border-red-600/50'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Visual Feedback</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isFaceDetected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'}`}>
                      {isFaceDetected ? 'LOCKED' : 'SEARCHING'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${isFaceDetected ? 'w-full bg-emerald-500' : 'w-1/6 bg-red-600'}`} />
                  </div>
                </div>
                
                <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800">
                   <p className="text-[12px] text-slate-400 leading-relaxed font-bold italic">
                     "The AI is analyzing vocal confidence and technical clarity. Ensure background noise is minimal."
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default InterviewRoom;
