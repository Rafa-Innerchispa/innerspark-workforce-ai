import { db } from './firebase';

export type NoveltyType = 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'OVERTIME' | 'ON_TIME';

export interface Novelty {
  user_id: string;
  source: 'ADMS' | 'MOBILE';
  timestamp: string;
  type: NoveltyType;
  minutes?: number;
  created_at: string;
}

/**
 * Calculates novelty based on standard 09:00 - 18:00 schedule
 */
export async function processCheckinNovelty(userId: string, timestampStr: string, source: 'ADMS' | 'MOBILE') {
  // ADMS timestamps might look like "2026-08-04 09:15:00"
  // Mobile timestamps might be ISO strings
  
  let dateObj: Date;
  if (timestampStr.includes('T')) {
    dateObj = new Date(timestampStr);
  } else {
    // Basic conversion for "YYYY-MM-DD HH:MM:SS"
    dateObj = new Date(timestampStr.replace(' ', 'T') + 'Z');
  }

  // Very basic timezone handling: assuming UTC or server local for MVP
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  
  const timeInMinutes = hours * 60 + minutes;
  
  // Standard entry 09:00 (540 mins), Standard exit 18:00 (1080 mins)
  const ENTRY_TIME = 9 * 60; 
  const EXIT_TIME = 18 * 60;
  
  let type: NoveltyType = 'ON_TIME';
  let diffMinutes = 0;

  if (timeInMinutes < ENTRY_TIME + 120) { // Entry window (before 11:00)
    if (timeInMinutes > ENTRY_TIME + 15) { // 15 mins grace period
      type = 'LATE_ARRIVAL';
      diffMinutes = timeInMinutes - ENTRY_TIME;
    }
  } else if (timeInMinutes >= EXIT_TIME) { // Exit window
    if (timeInMinutes > EXIT_TIME + 30) {
      type = 'OVERTIME';
      diffMinutes = timeInMinutes - EXIT_TIME;
    }
  } else if (timeInMinutes > ENTRY_TIME + 120 && timeInMinutes < EXIT_TIME) {
    // Early departure if it's the second punch of the day
    type = 'EARLY_DEPARTURE';
    diffMinutes = EXIT_TIME - timeInMinutes;
  }

  const novelty: Novelty = {
    user_id: userId || 'unknown',
    source,
    timestamp: dateObj.toISOString(),
    type,
    minutes: diffMinutes,
    created_at: new Date().toISOString()
  };

  const docRef = db.collection('novelties').doc();
  await docRef.set(novelty);
  
  return novelty;
}
