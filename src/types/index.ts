export type Language = 'en' | 'hi' | 'mixed';
export type UserRole = 'founder' | 'student' | 'mentor' | 'admin';
export type SignalLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type Dimension = 'WHO' | 'WHAT' | 'WHEN' | 'WHERE' | 'WHY' | 'HOW';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface Session {
  id: string;
  project_id: string;
  project_name?: string;
  sector?: string;
  problem_domain: string;
  stakeholders: string[];
  session_language: Language;
  session_type: string;
  status: string;
  insight_count?: number;
  covered_dimensions?: string[];
  last_active_at?: string;
  conversation_history?: Message[];
}

export interface Insight {
  id: string;
  session_id: string;
  dimension: Dimension;
  stakeholder_tag: string;
  raw_text: string;
  signal: SignalLevel;
  language: Language;
  created_at: string;
}

export interface Cluster {
  id: string;
  theme: string;
  primary_dimension: Dimension;
  signal: SignalLevel;
  evidence_count: number;
}
