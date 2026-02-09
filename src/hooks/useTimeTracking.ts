import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TimeEntry } from '../types/time';

interface UseTimeTrackingReturn {
  activeEntry: TimeEntry | null;
  dailyEntries: TimeEntry[];
  isLoading: boolean;
  totalWorkTime: number; // in Millisekunden
  totalBreakTime: number; // in Millisekunden
  startWork: () => Promise<void>;
  stopWork: () => Promise<void>;
  toggleBreak: () => Promise<void>;
}

export function useTimeTracking(userId: string | undefined): UseTimeTrackingReturn {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [dailyEntries, setDailyEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Realtime Listener für heutige Einträge
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const entriesRef = collection(db, 'timeEntries');
    const q = query(
      entriesRef,
      where('userId', '==', userId),
      where('date', '==', today),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: TimeEntry[] = [];
        snapshot.forEach((doc) => {
          entries.push({
            id: doc.id,
            ...doc.data(),
          } as TimeEntry);
        });
        
        setDailyEntries(entries);
        
        // Finde aktiven Eintrag (endTime === null)
        const active = entries.find(e => e.endTime === null);
        setActiveEntry(active || null);
        
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading time entries:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, today]);

  // Berechne total work time
  const totalWorkTime = dailyEntries
    .filter(e => e.type === 'work' && e.endTime !== null)
    .reduce((sum, e) => sum + (e.endTime! - e.startTime), 0);

  // Berechne total break time
  const totalBreakTime = dailyEntries
    .filter(e => e.type === 'break' && e.endTime !== null)
    .reduce((sum, e) => sum + (e.endTime! - e.startTime), 0);

  // Start Work
  const startWork = async () => {
    if (!userId || activeEntry) return;

    try {
      const now = Date.now();
      const newEntry: Omit<TimeEntry, 'id'> = {
        userId,
        type: 'work',
        startTime: now,
        endTime: null,
        date: today,
        isManual: false,
        createdAt: now,
      };

      // Optimistic update
      const tempEntry: TimeEntry = {
        ...newEntry,
        id: 'temp-' + now,
      };
      setActiveEntry(tempEntry);
      setDailyEntries(prev => [...prev, tempEntry]);

      const docRef = await addDoc(collection(db, 'timeEntries'), newEntry);
      
      // Update with real ID
      setActiveEntry(prev => prev ? { ...prev, id: docRef.id } : null);
      setDailyEntries(prev => prev.map(e => e.id === tempEntry.id ? { ...e, id: docRef.id } : e));
    } catch (error) {
      console.error('Error starting work:', error);
      // Rollback on error
      setActiveEntry(null);
      setDailyEntries(prev => prev.filter(e => !e.id.startsWith('temp-')));
      throw error;
    }
  };

  // Stop Work
  const stopWork = async () => {
    if (!activeEntry || activeEntry.type !== 'work') return;

    try {
      const now = Date.now();
      
      // Optimistic update
      setActiveEntry(null);
      setDailyEntries(prev => prev.map(e => 
        e.id === activeEntry.id ? { ...e, endTime: now, updatedAt: now } : e
      ));

      const entryRef = doc(db, 'timeEntries', activeEntry.id);
      await updateDoc(entryRef, {
        endTime: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error stopping work:', error);
      // Rollback on error
      setActiveEntry(activeEntry);
      throw error;
    }
  };

  // Toggle Break
  const toggleBreak = async () => {
    if (!userId) return;

    try {
      const now = Date.now();

      if (!activeEntry) {
        // Keine aktive Session - sollte nicht passieren
        return;
      }

      if (activeEntry.type === 'work') {
        // Beende Work, starte Break
        const tempBreakEntry: TimeEntry = {
          id: 'temp-' + now,
          userId,
          type: 'break',
          startTime: now,
          endTime: null,
          date: today,
          isManual: false,
          createdAt: now,
        };

        // Optimistic update
        setActiveEntry(tempBreakEntry);
        setDailyEntries(prev => [
          ...prev.map(e => e.id === activeEntry.id ? { ...e, endTime: now, updatedAt: now } : e),
          tempBreakEntry
        ]);

        // Database updates
        const entryRef = doc(db, 'timeEntries', activeEntry.id);
        await updateDoc(entryRef, {
          endTime: now,
          updatedAt: now,
        });

        const newBreak: Omit<TimeEntry, 'id'> = {
          userId,
          type: 'break',
          startTime: now,
          endTime: null,
          date: today,
          isManual: false,
          createdAt: now,
        };
        const breakRef = await addDoc(collection(db, 'timeEntries'), newBreak);
        
        // Update with real ID
        setActiveEntry(prev => prev ? { ...prev, id: breakRef.id } : null);
        setDailyEntries(prev => prev.map(e => e.id === tempBreakEntry.id ? { ...e, id: breakRef.id } : e));
        
      } else if (activeEntry.type === 'break') {
        // Beende Break, starte Work
        const tempWorkEntry: TimeEntry = {
          id: 'temp-' + now,
          userId,
          type: 'work',
          startTime: now,
          endTime: null,
          date: today,
          isManual: false,
          createdAt: now,
        };

        // Optimistic update
        setActiveEntry(tempWorkEntry);
        setDailyEntries(prev => [
          ...prev.map(e => e.id === activeEntry.id ? { ...e, endTime: now, updatedAt: now } : e),
          tempWorkEntry
        ]);

        // Database updates
        const entryRef = doc(db, 'timeEntries', activeEntry.id);
        await updateDoc(entryRef, {
          endTime: now,
          updatedAt: now,
        });

        const newWork: Omit<TimeEntry, 'id'> = {
          userId,
          type: 'work',
          startTime: now,
          endTime: null,
          date: today,
          isManual: false,
          createdAt: now,
        };
        const workRef = await addDoc(collection(db, 'timeEntries'), newWork);
        
        // Update with real ID
        setActiveEntry(prev => prev ? { ...prev, id: workRef.id } : null);
        setDailyEntries(prev => prev.map(e => e.id === tempWorkEntry.id ? { ...e, id: workRef.id } : e));
      }
    } catch (error) {
      console.error('Error toggling break:', error);
      throw error;
    }
  };

  return {
    activeEntry,
    dailyEntries,
    isLoading,
    totalWorkTime,
    totalBreakTime,
    startWork,
    stopWork,
    toggleBreak,
  };
}

// Hook für monatliche Einträge
export function useMonthlyTimeEntries(userId: string | undefined, year: number, month: number) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    // Erstelle Datumsbereich (YYYY-MM-DD)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // Letzter Tag des Monats
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const entriesRef = collection(db, 'timeEntries');
    const q = query(
      entriesRef,
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entriesList: TimeEntry[] = [];
        snapshot.forEach((doc) => {
          entriesList.push({
            id: doc.id,
            ...doc.data(),
          } as TimeEntry);
        });
        setEntries(entriesList);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading monthly entries:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, year, month]);

  return { entries, isLoading };
}

// Manuellen Eintrag hinzufügen
export async function addManualEntry(
  userId: string,
  date: string,
  type: 'work' | 'break',
  startTime: number,
  endTime: number,
  note?: string
): Promise<void> {
  try {
    const entry: Omit<TimeEntry, 'id'> = {
      userId,
      type,
      date,
      startTime,
      endTime,
      isManual: true,
      note,
      createdAt: Date.now(),
    };

    await addDoc(collection(db, 'timeEntries'), entry);
  } catch (error) {
    console.error('Error adding manual entry:', error);
    throw error;
  }
}

// Eintrag bearbeiten
export async function updateEntry(
  entryId: string,
  updates: {
    startTime?: number;
    endTime?: number;
    type?: 'work' | 'break';
    note?: string;
  }
): Promise<void> {
  try {
    const entryRef = doc(db, 'timeEntries', entryId);
    await updateDoc(entryRef, {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    throw error;
  }
}

// Eintrag löschen
export async function deleteEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'timeEntries', entryId));
  } catch (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }
}
