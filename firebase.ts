import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import type { Play } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (using specific databaseId if provided)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const PLAYS_COLLECTION = 'plays';
const SETTINGS_COLLECTION = 'settings';
const TEAM_ROSTER_DOC = 'team_roster';

/**
 * Sort plays list by updatedAt descending (newest first).
 */
export function sortPlays(plays: Play[]): Play[] {
  return [...plays].sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Subscribe to real-time changes in the 'plays' collection.
 */
export function subscribeToPlays(onUpdate: (plays: Play[]) => void, onError?: (err: Error) => void) {
  const playsRef = collection(db, PLAYS_COLLECTION);
  return onSnapshot(
    playsRef,
    (snapshot) => {
      const playsList: Play[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Play;
        if (data && data.id) {
          playsList.push(data);
        }
      });
      onUpdate(sortPlays(playsList));
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Direct fetch of all plays from Firestore (useful for manual refresh).
 */
export async function fetchPlaysFromCloud(): Promise<Play[]> {
  const playsRef = collection(db, PLAYS_COLLECTION);
  const snapshot = await getDocs(playsRef);
  const playsList: Play[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Play;
    if (data && data.id) {
      playsList.push(data);
    }
  });
  return sortPlays(playsList);
}

/**
 * Save or update a play in Firestore.
 */
export async function savePlayToCloud(play: Play): Promise<void> {
  if (!play.id) return;
  const playRef = doc(db, PLAYS_COLLECTION, play.id);
  const playData: Play = {
    ...play,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(playRef, playData, { merge: true });
}

/**
 * Delete a play from Firestore.
 */
export async function deletePlayFromCloud(playId: string): Promise<void> {
  if (!playId) return;
  const playRef = doc(db, PLAYS_COLLECTION, playId);
  await deleteDoc(playRef);
}

/**
 * Upload initial set of plays to Cloud if missing or during initial sync.
 */
export async function syncLocalPlaysToCloud(plays: Play[]): Promise<void> {
  if (!plays.length) return;
  const batch = writeBatch(db);
  plays.forEach((play) => {
    if (play.id) {
      const playRef = doc(db, PLAYS_COLLECTION, play.id);
      batch.set(playRef, { ...play, updatedAt: play.updatedAt || new Date().toISOString() }, { merge: true });
    }
  });
  await batch.commit();
}

/**
 * Subscribe to team roster player names real-time sync.
 */
export function subscribeToRoster(onUpdate: (roster: Record<string, string>) => void) {
  const rosterRef = doc(db, SETTINGS_COLLECTION, TEAM_ROSTER_DOC);
  return onSnapshot(
    rosterRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.playerNames) {
          onUpdate(data.playerNames as Record<string, string>);
        }
      }
    },
    (err) => {
      console.warn('Roster sync snapshot error:', err);
    }
  );
}

/**
 * Save team roster player names to Firestore.
 */
export async function saveRosterToCloud(playerNames: Record<string, string>): Promise<void> {
  const rosterRef = doc(db, SETTINGS_COLLECTION, TEAM_ROSTER_DOC);
  await setDoc(rosterRef, { playerNames, updatedAt: new Date().toISOString() }, { merge: true });
}
