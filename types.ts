
export interface ResumeData {
  text: string;
  skills: string[];
  projects: string[];
}

export enum AppState {
  SETUP = 'SETUP',
  INTERVIEWING = 'INTERVIEWING',
  REVIEW = 'REVIEW'
}

export interface InterviewSession {
  startTime: number;
  durationLimit: number; // in seconds (25 mins = 1500)
  recordingUrl?: string;
  transcript: { speaker: 'AI' | 'Candidate'; text: string; timestamp: number }[];
}
