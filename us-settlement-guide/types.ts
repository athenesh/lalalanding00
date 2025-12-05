export enum TimelinePhase {
  PRE_DEPARTURE = 'PRE_DEPARTURE',
  ARRIVAL = 'ARRIVAL',
  EARLY_SETTLEMENT = 'EARLY_SETTLEMENT',
  SETTLEMENT_COMPLETE = 'SETTLEMENT_COMPLETE',
}

export interface ChecklistItemContent {
  text: string;
  subText?: string[]; // Bullet points
  important?: boolean;
}

export interface ChecklistFile {
  id: string;
  name: string;
  type: string;
  url: string; // Object URL for preview
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  category: string; // e.g., "Housing", "Utility"
  phase: TimelinePhase;
  description: ChecklistItemContent[];
  isCompleted: boolean;
  memo: string;
  files: ChecklistFile[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}