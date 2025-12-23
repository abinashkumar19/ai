
import React, { useState } from 'react';
import SetupView from './components/SetupView';
import InterviewRoom from './components/InterviewRoom';
import ReviewView from './components/ReviewView';
import { AppState, ResumeData, InterviewSession } from './types';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.SETUP);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [lastSession, setLastSession] = useState<InterviewSession | null>(null);

  const handleStartInterview = (data: ResumeData) => {
    setResumeData(data);
    setCurrentState(AppState.INTERVIEWING);
  };

  const handleCompleteInterview = (session: InterviewSession) => {
    setLastSession(session);
    setCurrentState(AppState.REVIEW);
  };

  const handleReset = () => {
    setCurrentState(AppState.SETUP);
    setResumeData(null);
    setLastSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">G</div>
            <span className="font-bold tracking-tight text-xl hidden sm:inline-block">AI Interviewer</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">GEMINI 2.5 LIVE</span>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/20">25 MIN LIMIT</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-6">
        {currentState === AppState.SETUP && (
          <SetupView onStart={handleStartInterview} />
        )}
        
        {currentState === AppState.INTERVIEWING && resumeData && (
          <InterviewRoom 
            resumeData={resumeData} 
            onComplete={handleCompleteInterview} 
          />
        )}
        
        {currentState === AppState.REVIEW && lastSession && (
          <ReviewView session={lastSession} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 mt-12 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Professional AI Interviewing Platform. Designed for high-stakes preparation.
          </p>
          <p className="text-slate-600 text-xs mt-4 font-bold tracking-widest uppercase">
            Powered by abinash kumar and develoved by too
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
