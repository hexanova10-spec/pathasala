import { OfflineLesson, QuizQuestion } from '../types';

const DB_NAME = 'PathashalaAI_DB';
const DB_VERSION = 1;

export interface OfflineAction {
  id: string;
  type: 'quiz_completed' | 'lesson_viewed' | 'question_asked';
  payload: any;
  timestamp: string;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private isInitializing = false;

  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (this.db) return this.db;
    }
    this.isInitializing = true;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('lessons')) {
          db.createObjectStore('lessons', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('quizzes')) {
          db.createObjectStore('quizzes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitializing = false;
        await this.seedDefaultContent();
        resolve(this.db);
      };

      request.onerror = (event) => {
        this.isInitializing = false;
        console.error('IndexedDB open error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async seedDefaultContent() {
    const existing = await this.getLessons();
    if (existing.length === 0) {
      const defaultLessons: OfflineLesson[] = [
        {
          id: 'lesson-odia-1',
          title: 'ଆଲୋକ ସଂଶ୍ଳେଷଣ (Photosynthesis in Odia)',
          subject: 'Science',
          classNum: 7,
          language: 'Odia',
          summary: 'ଉଦ୍ଭିଦ କିପରି ସୂର୍ଯ୍ୟାଲୋକ, ଅଙ୍ଗାରକାମ୍ଳ ଏବଂ ଜଳ ସାହାଯ୍ୟରେ ନିଜ ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ କରେ ତାହାର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।',
          keyPoints: [
            'ସୂତ୍ର: 6CO₂ + 6H₂O + ଆଲୋକ → C₆H₁₂O₆ (ଗ୍ଲୁକୋଜ୍) + 6O₂',
            'ପତ୍ରର ହରିତକଣିକା (Chloroplast) ରେ ଥିବା କ୍ଲୋରୋଫିଲ୍ ସୂର୍ଯ୍ୟାଲୋକ ଶୋଷଣ କରେ।',
            'ପତ୍ରର ଷ୍ଟୋମାଟା (Stomata) ମାଧ୍ୟମରେ ବାୟୁରୁ ଅଙ୍ଗାରକାମ୍ଳ ପ୍ରବେଶ କରେ।',
            'ଜଳ ଶେଷରେ ଅମ୍ଳଜାନ ରୂପେ ବାୟୁମଣ୍ଡଳକୁ ମୁକ୍ତ ହୁଏ।'
          ],
          flashcards: [
            { question: 'ଆଲୋକ ସଂଶ୍ଳେଷଣ ପାଇଁ ମୁଖ୍ୟ ଉପାଦାନ କ’ଣ?', answer: 'ସୂର୍ଯ୍ୟାଲୋକ, ଜଳ, ଅଙ୍ଗାରକାମ୍ଳ ଏବଂ କ୍ଲୋରୋଫିଲ୍।' },
            { question: 'ଉଦ୍ଭିଦ ବାୟୁମଣ୍ଡଳକୁ କେଉଁ ଗ୍ୟାସ୍ ଛାଡ଼େ?', answer: 'ଅମ୍ଳଜାନ (Oxygen)।' }
          ],
          savedAt: new Date().toISOString(),
          synced: true
        },
        {
          id: 'lesson-physics-1',
          title: "Ohm's Law & Circuit Analysis",
          subject: 'Physics',
          classNum: 10,
          language: 'English',
          summary: "Fundamental relationship between voltage, current, and resistance in electrical circuits.",
          keyPoints: [
            'Mathematical statement: V = I × R (Volts = Amperes × Ohms).',
            'Valid at constant temperature for ohmic conductors.',
            'Slope of V vs I graph gives resistance R.',
            'Resistance directly proportional to length (L) and inversely proportional to area (A).'
          ],
          flashcards: [
            { question: "What is the SI unit of electric resistance?", answer: "Ohm (Ω)." },
            { question: "How does resistance change when a wire is doubled in length?", answer: "Resistance doubles (R ∝ L)." }
          ],
          savedAt: new Date().toISOString(),
          synced: true
        },
        {
          id: 'lesson-math-1',
          title: 'ଗଣିତ: ଭଗ୍ନାଂଶ ଓ ଦଶମିକ (Fractions & Decimals)',
          subject: 'Mathematics',
          classNum: 6,
          language: 'Odia',
          summary: 'ଭଗ୍ନାଂଶର ପ୍ରକାରଭେଦ (ପ୍ରକୃତ, ଅପ୍ରକୃତ ଓ ମିଶ୍ର) ଏବଂ ସେଗୁଡ଼ିକର ଯୋଗ-ବିୟୋଗ ସରଳ ପ୍ରଣାଳୀ।',
          keyPoints: [
            'ଲବ (Numerator) ଏବଂ ହର (Denominator) ର ସଂକଳ୍ପ।',
            'ସମହର ଭଗ୍ନାଂଶରେ ପରିଣତ କରି ଯୋଗ ଓ ବିୟୋଗ।',
            'ଦଶମିକ ସଂଖ୍ୟାର ସ୍ଥାନୀୟ ମାନ ନିର୍ଣ୍ଣୟ।'
          ],
          flashcards: [
            { question: '୩/୪ ଏବଂ ୧/୪ ଯୋଗ କଲେ କେତେ ହେବ?', answer: '୪/୪ = ୧ (ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା)।' }
          ],
          savedAt: new Date().toISOString(),
          synced: true
        }
      ];

      for (const lesson of defaultLessons) {
        await this.saveLesson(lesson);
      }
    }
  }

  public async saveLesson(lesson: OfflineLesson): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lessons', 'readwrite');
      const store = tx.objectStore('lessons');
      store.put(lesson);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getLessons(): Promise<OfflineLesson[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lessons', 'readonly');
      const store = tx.objectStore('lessons');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteLesson(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lessons', 'readwrite');
      const store = tx.objectStore('lessons');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveNote(note: { id: string; title: string; topic: string; content: string; subject: string; classNum: number; createdAt: string }): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      store.put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getNotes(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const store = tx.objectStore('notes');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteNote(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Note deletion was aborted'));
    });
  }

  public async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    const db = await this.init();
    const fullAction: OfflineAction = {
      ...action,
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString()
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineQueue', 'readwrite');
      const store = tx.objectStore('offlineQueue');
      store.put(fullAction);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getQueue(): Promise<OfflineAction[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineQueue', 'readonly');
      const store = tx.objectStore('offlineQueue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async clearQueue(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offlineQueue', 'readwrite');
      const store = tx.objectStore('offlineQueue');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineStorage = new OfflineStorageService();
