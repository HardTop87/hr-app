export type TimeEntryType = 'work' | 'break';

export interface TimeEntry {
  id: string;
  userId: string;
  type: TimeEntryType;
  startTime: number; // Timestamp
  endTime: number | null; // Null wenn aktiv
  date: string; // YYYY-MM-DD

  // Audit Trail (für spätere Edits wichtig)
  isManual: boolean; // Wurde der Eintrag händisch erstellt/geändert?
  note?: string; // Begründung (z.B. "Vergessen zu stempeln")
  createdAt: number;
  updatedAt?: number;
}
