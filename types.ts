export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface ExampleSentence {
  original: string;
  translated: string;
}

export interface ConjugationForm {
  pronoun: string;
  form: string;
}

export interface Conjugation {
  infinitive: string;
  tenseName: string; // e.g., "Present Indicative"
  forms: ConjugationForm[];
}

export interface DictionaryResult {
  word: string;
  explanation: string;
  examples: ExampleSentence[];
  friendlyNote: string;
  conjugations?: Conjugation; // Optional field for verbs
  imageUrl?: string; // Base64 or URL
  timestamp: number;
  sourceLang: string; // The user's native language for this result
  targetLang: string; // The target language for this result
}

export interface SavedItem extends DictionaryResult {
  id: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export enum AppMode {
  SEARCH = 'SEARCH',
  NOTEBOOK = 'NOTEBOOK',
  FLASHCARDS = 'FLASHCARDS',
}