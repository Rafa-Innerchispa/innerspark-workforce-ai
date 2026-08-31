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
    // Treat as Guayaquil local time (UTC-05:00)
    dateObj = new Date(timestampStr.replace(' ', 'T') + '-05:00');
  }

  // Convert to America/Guayaquil timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(dateObj);
  const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
  const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
  
  // Handle 24h format mapping (Intl can sometimes return '24' instead of '0')
  const rawHours = parseInt(hourPart, 10);
  const hours = rawHours === 24 ? 0 : rawHours;
  const minutes = parseInt(minutePart, 10);
  
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

  await persistNovelty(novelty);
  return novelty;
}

export async function persistNovelty(novelty: Novelty): Promise<void> {
  if (!db || typeof db.collection !== 'function') {
    throw new Error('Firestore not initialized');
  }
  const collection = db.collection('novelties');
  if (!collection || typeof collection.doc !== 'function') {
    throw new Error('Firestore collection unavailable');
  }
  const docRef = collection.doc();
  if (!docRef || typeof docRef.set !== 'function') {
    throw new Error('Firestore document reference unavailable');
  }
  await docRef.set(novelty);
}
