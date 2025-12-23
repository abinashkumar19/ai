
import React, { useState, useRef } from 'react';
import { ResumeData } from '../types';

interface SetupViewProps {
  onStart: (data: ResumeData) => void;
}

const SetupView: React.FC<SetupViewProps> = ({ onStart }) => {
  const [resumeText, setResumeText] = useState('');
  const [skills, setSkills] = useState('');
  const [projects, setProjects] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) return;
    
    onStart({
      text: resumeText,
      skills: skills.split(',').map(s => s.trim()).filter(s => s),
      projects: projects.split(',').map(p => p.trim()).filter(p => p),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('Currently only .txt files are supported for direct upload. For other formats, please copy and paste the text.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setResumeText(text);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          AI Mock Interviewer
        </h1>
        <p className="text-slate-400 text-lg">
          Powered by abinash kumar. Experience a high-stakes technical interview tailored to your profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide">
            Resume / Professional Summary
          </label>
          
          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-2 group ${
              isDragging 
                ? 'border-blue-500 bg-blue-500/10' 
                : fileName 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-700/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".txt"
            />
            <div className={`text-3xl transition-transform group-hover:scale-110 ${fileName ? 'text-emerald-400' : 'text-slate-500'}`}>
              {fileName ? '📄' : '📁'}
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">
                {fileName ? `Uploaded: ${fileName}` : 'Click or drag resume (.txt) here'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {fileName ? 'Click to change file' : 'PDF/Docx? Please copy-paste content below'}
              </p>
            </div>
          </div>

          <div className="relative">
            <textarea
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-48 transition-all font-mono text-sm"
              placeholder="Or paste your resume content directly here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            {resumeText && (
              <button 
                type="button"
                onClick={() => {setResumeText(''); setFileName(null);}}
                className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-2 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
              Key Skills (Comma separated)
            </label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. React, TypeScript, Node.js"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 uppercase tracking-wide">
              Main Projects (Comma separated)
            </label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. E-commerce App, Portfolio Site"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={!resumeText.trim()}
            className={`w-full font-bold py-4 rounded-xl shadow-lg transform transition-all ${
              resumeText.trim() 
                ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white active:scale-[0.98]' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Start 25-Minute Interview
          </button>
          <p className="text-center text-xs text-slate-500 mt-4">
            By starting, you consent to camera and microphone usage for the duration of the interview.
          </p>
        </div>
      </form>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-4">
          <div className="text-blue-400 text-2xl mb-2">⏱️</div>
          <h4 className="font-bold mb-1">25 Minutes</h4>
          <p className="text-xs text-slate-500">Standard professional technical interview duration.</p>
        </div>
        <div className="p-4">
          <div className="text-emerald-400 text-2xl mb-2">🎙️</div>
          <h4 className="font-bold mb-1">Live Interaction</h4>
          <p className="text-xs text-slate-500">Real-time voice and audio analysis.</p>
        </div>
        <div className="p-4">
          <div className="text-purple-400 text-2xl mb-2">📹</div>
          <h4 className="font-bold mb-1">Recording Included</h4>
          <p className="text-xs text-slate-500">Review your performance with full session recording.</p>
        </div>
      </div>
    </div>
  );
};

export default SetupView;
