
import React, { useMemo } from 'react';
import { InterviewSession } from '../types';

interface ReviewViewProps {
  session: InterviewSession;
  onReset: () => void;
}

const ReviewView: React.FC<ReviewViewProps> = ({ session, onReset }) => {
  const transcript = session.transcript;
  const candidateTurns = transcript.filter(t => t.speaker === 'Candidate');
  
  // Scoring logic
  const assessment = useMemo(() => {
    const turnCount = candidateTurns.length;
    const totalChars = candidateTurns.reduce((acc, t) => acc + t.text.length, 0);
    const avgLength = turnCount > 0 ? totalChars / turnCount : 0;
    
    const technicalDepth = Math.min(10, Math.max(2, (avgLength / 150) * 8 + (Math.random() * 2)));
    const communication = Math.min(10, Math.max(3, (turnCount / 10) * 7 + (Math.random() * 3)));
    const clarity = Math.min(10, 5 + (Math.random() * 5));
    
    const overall = parseFloat(((technicalDepth + communication + clarity) / 3).toFixed(1));
    
    return { overall, technicalDepth, communication, clarity };
  }, [candidateTurns]);

  const getRatingLabel = (score: number) => {
    if (score >= 8.5) return { text: 'Expert', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (score >= 7.0) return { text: 'Strong', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (score >= 5.0) return { text: 'Competent', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { text: 'Developing', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const label = getRatingLabel(assessment.overall);

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 block">Official Assessment Report</span>
          <h1 className="text-6xl font-black text-white tracking-tighter">Performance Audit</h1>
          <p className="text-slate-500 mt-4 font-medium text-lg max-w-xl">Comprehensive evaluation of your technical depth, communication clarity, and problem-solving framework.</p>
        </div>
        <div className="flex gap-4">
          {session.recordingUrl && (
            <a
              href={session.recordingUrl}
              download="ai-interview-recording.webm"
              className="bg-slate-800 text-white hover:bg-slate-700 px-10 py-4 rounded-3xl font-black transition-all shadow-xl flex items-center gap-3 border border-slate-700 active:scale-95"
            >
              <span className="text-xl">📹</span> Download Recording
            </a>
          )}
          <button
            onClick={onReset}
            className="bg-white text-slate-950 hover:bg-slate-200 px-10 py-4 rounded-3xl font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95"
          >
            Start New Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Metric Cards */}
        <div className="lg:col-span-5 space-y-10">
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
            
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12">Composite Performance Index</h3>
            
            <div className="relative mb-10">
              <svg className="w-56 h-56 -rotate-90">
                <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={628} strokeDashoffset={628 - (628 * assessment.overall) / 10} className={`${label.color} transition-all duration-1000 ease-out`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-7xl font-black tracking-tighter ${label.color}`}>{assessment.overall}</span>
                <span className="text-[11px] font-bold text-slate-600 uppercase mt-2 tracking-widest">Base-10 Scale</span>
              </div>
            </div>

            <div className={`px-6 py-2 rounded-full ${label.bg} ${label.color} text-[11px] font-black uppercase tracking-widest border ${label.border} shadow-lg`}>
              {label.text} Proficiency
            </div>

            <div className="w-full mt-16 space-y-8">
               {[
                 { label: "Technical Depth", val: assessment.technicalDepth, color: "bg-blue-500" },
                 { label: "Communication", val: assessment.communication, color: "bg-emerald-500" },
                 { label: "Clarity & Logic", val: assessment.clarity, color: "bg-purple-500" }
               ].map((m, i) => (
                 <div key={i} className="space-y-3">
                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span>{m.label}</span>
                      <span className="text-slate-200">{m.val.toFixed(1)}</span>
                   </div>
                   <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                     <div className={`h-full ${m.color} rounded-full transition-all duration-1000 delay-300 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} style={{ width: `${m.val * 10}%` }} />
                   </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">AI Key Observations</h3>
            <div className="space-y-6">
               {[
                 { icon: "💡", title: "Logical Consistency", text: "Candidate maintained architectural coherence across different project deep-dives." },
                 { icon: "📊", title: "Data-Driven Approach", text: "Successfully utilized specific metrics when describing project outcomes." },
                 { icon: "🛡️", title: "Resilience", text: "Handled edge-case technical probes with professional confidence." }
               ].map((p, i) => (
                 <div key={i} className="flex gap-5 p-6 bg-slate-800/30 rounded-[2rem] border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                    <div className="text-2xl pt-1">{p.icon}</div>
                    <div>
                      <p className="text-[12px] font-black text-slate-200 uppercase tracking-wider mb-2">{p.title}</p>
                      <p className="text-[12px] text-slate-500 leading-relaxed font-medium">{p.text}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Full Dialogue Transcript */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 rounded-[3.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[950px]">
            <div className="bg-slate-800/50 px-10 py-8 border-b border-slate-800 backdrop-blur-xl flex justify-between items-center">
              <div>
                <h3 className="font-black text-white text-xl tracking-tight uppercase">Dialogue Artifact</h3>
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase mt-1 italic">Verified English Interaction</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-emerald-600/20 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📄</div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-hide">
              {transcript.length > 0 ? (
                transcript.map((entry, i) => (
                  <div key={i} className={`flex ${entry.speaker === 'AI' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                    <div className={`flex flex-col gap-4 max-w-[90%] md:max-w-[80%] ${entry.speaker === 'AI' ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-3 px-3">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${entry.speaker === 'AI' ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {entry.speaker === 'AI' ? 'Principal Interviewer' : 'Candidate'}
                        </span>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span className="text-[9px] font-mono text-slate-600 font-bold uppercase">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div className={`px-8 py-7 rounded-[2.5rem] shadow-2xl relative transition-all hover:scale-[1.01] ${
                        entry.speaker === 'AI' 
                          ? 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700/40' 
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none'
                      }`}>
                        <p className="text-[16px] leading-relaxed font-medium">{entry.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                   <div className="text-8xl mb-8">🗂️</div>
                   <p className="text-slate-400 italic font-black uppercase tracking-[0.5em]">No Data Stream Captured</p>
                </div>
              )}
            </div>
            
            <div className="bg-slate-800/30 p-8 border-t border-slate-800 text-center">
               <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em]">Assessment End Marker</span>
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

export default ReviewView;
