import React, { useState, useEffect } from 'react';
import { LANGUAGES, AI_MODELS, DEFAULT_SETTINGS } from './constants';
import { Language, AppMode, DictionaryResult, SavedItem, AppSettings } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import ResultCard from './components/ResultCard';
import NotebookView from './components/NotebookView';
import FlashcardMode from './components/FlashcardMode';
import { lookupWord, generateConceptImage } from './services/geminiService';
import { Search, Book, Layers, ArrowLeft, Loader2, Settings, X, Save } from 'lucide-react';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [nativeLang, setNativeLang] = useState<Language>(LANGUAGES[0]); // Default En
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[2]); // Default Es
  
  const [mode, setMode] = useState<AppMode>(AppMode.SEARCH);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<DictionaryResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('lingopop_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('lingopop_saved');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('lingopop_saved', JSON.stringify(savedItems));
  }, [savedItems]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setMode(AppMode.SEARCH);
    setCurrentResult(null);

    try {
      // Parallelize definition and image generation
      // Capture current languages at start of request
      const reqNative = nativeLang.name;
      const reqTarget = targetLang.name;

      const textPromise = lookupWord(query, reqNative, reqTarget);
      const imagePromise = generateConceptImage(query);

      const [textData, imageUrl] = await Promise.all([textPromise, imagePromise]);

      setCurrentResult({
        ...textData,
        imageUrl,
        timestamp: Date.now(),
        sourceLang: reqNative,
        targetLang: reqTarget
      });
    } catch (error: any) {
      console.error("Search failed", error);
      let errorMsg = "Oops! The AI got a bit confused. Try again?";
      if (error.message?.includes("API Key")) {
        errorMsg = "API Key Error: Please check your settings.";
        setShowSettings(true);
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const saveItem = (item: DictionaryResult) => {
    if (savedItems.some(i => i.word === item.word)) return;
    const newItem: SavedItem = { ...item, id: crypto.randomUUID() };
    setSavedItems(prev => [newItem, ...prev]);
  };

  const deleteItem = (id: string) => {
    setSavedItems(prev => prev.filter(i => i.id !== id));
  };

  const reviewItem = (item: SavedItem) => {
    setCurrentResult(item);
    setMode(AppMode.SEARCH);
  };

  const saveSettings = () => {
    localStorage.setItem('lingopop_settings', JSON.stringify(settings));
    setShowSettings(false);
    // Reload page to ensure service picks up new env? 
    // Actually our service reads from localStorage on every call, so no reload needed.
    alert("Settings saved!");
  };

  if (!hasStarted) {
    return (
      <WelcomeScreen 
        nativeLang={nativeLang} 
        targetLang={targetLang}
        setNativeLang={setNativeLang}
        setTargetLang={setTargetLang}
        onStart={() => setHasStarted(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={() => { setMode(AppMode.SEARCH); setCurrentResult(null); }}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer">
              L
            </div>
            <span className="font-bold text-slate-800 hidden sm:block display-font cursor-pointer">LingoPop</span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 rounded-full px-2 py-1 border border-slate-200 shadow-inner">
            <select
              value={nativeLang.code}
              onChange={(e) => setNativeLang(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer py-1 pl-1 appearance-none hover:text-indigo-600 transition-colors text-center"
              title="Native Language"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
            
            <span className="text-slate-300 text-xs">→</span>
            
            <select
              value={targetLang.code}
              onChange={(e) => setTargetLang(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[1])}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 focus:outline-none cursor-pointer py-1 pr-1 appearance-none hover:text-indigo-600 transition-colors text-center"
              title="Target Language"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setMode(AppMode.NOTEBOOK)}
              className={`p-2 rounded-full transition ${mode === AppMode.NOTEBOOK ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Notebook"
            >
              <Book size={20} />
            </button>
            <button 
              onClick={() => setMode(AppMode.FLASHCARDS)}
              className={`p-2 rounded-full transition ${mode === AppMode.FLASHCARDS ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="Flashcards"
            >
              <Layers size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 relative">
        
        {/* Search Mode */}
        {mode === AppMode.SEARCH && (
          <div className="animate-fade-in">
            {/* Search Input - Only show if no result or explicitly searching */}
            <div className={`transition-all duration-500 ${currentResult ? 'mb-6' : 'mt-[20vh]'}`}>
               <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
                 <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Translate to ${targetLang.name}...`}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 pl-6 pr-16 text-xl shadow-lg focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                 />
                 <button 
                  type="submit" 
                  disabled={loading}
                  className="absolute right-3 top-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : <Search />}
                 </button>
               </form>
            </div>

            {loading && !currentResult && (
               <div className="flex flex-col items-center justify-center mt-12 text-slate-400 gap-4">
                 <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                 <p className="animate-pulse">Asking the AI...</p>
               </div>
            )}

            {currentResult && !loading && (
              <div className="animate-slide-up">
                 <ResultCard 
                   result={currentResult} 
                   isSaved={savedItems.some(i => i.word === currentResult.word)}
                   onSave={saveItem}
                   nativeLangName={currentResult.sourceLang || nativeLang.name}
                   targetLangName={currentResult.targetLang || targetLang.name}
                 />
              </div>
            )}
          </div>
        )}

        {/* Notebook Mode */}
        {mode === AppMode.NOTEBOOK && (
          <div className="animate-fade-in">
            <NotebookView 
              items={savedItems} 
              nativeLangName={nativeLang.name}
              onDelete={deleteItem}
              onReview={reviewItem}
            />
          </div>
        )}

        {/* Flashcard Mode */}
        {mode === AppMode.FLASHCARDS && (
          <div className="animate-fade-in bg-slate-100 fixed inset-0 top-[60px] z-30 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4">
               <button 
                 onClick={() => setMode(AppMode.NOTEBOOK)}
                 className="mb-4 flex items-center text-slate-500 hover:text-slate-800 font-bold"
               >
                 <ArrowLeft size={16} className="mr-1" /> Exit Study Mode
               </button>
               {savedItems.length > 0 ? (
                 <FlashcardMode items={savedItems} onExit={() => setMode(AppMode.NOTEBOOK)} />
               ) : (
                 <div className="text-center mt-20 text-slate-400">
                   <p>Save some words to your notebook first!</p>
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 display-font">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Google Gemini API Key</label>
                <input 
                  type="password" 
                  value={settings.apiKey}
                  onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                  placeholder="Paste your API key here..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Leave empty to use the default key (if configured). 
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">Get a key</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">AI Model (Text)</label>
                <select 
                  value={settings.textModel}
                  onChange={(e) => setSettings({...settings, textModel: e.target.value})}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Select 'Gemini 3.0 Pro' for more complex reasoning.</p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveSettings}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                  <Save size={20} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;