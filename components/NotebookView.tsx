import React, { useState } from 'react';
import { SavedItem } from '../types';
import { BookOpen, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { weaveStory } from '../services/geminiService';

interface Props {
  items: SavedItem[];
  nativeLangName: string;
  onDelete: (id: string) => void;
  onReview: (item: SavedItem) => void;
}

const NotebookView: React.FC<Props> = ({ items, nativeLangName, onDelete, onReview }) => {
  const [story, setStory] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  const handleWeaveStory = async () => {
    if (items.length < 2) return;
    setLoadingStory(true);
    try {
      const generated = await weaveStory(items.slice(0, 10), nativeLangName); // Limit to last 10 for context window
      setStory(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStory(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 text-slate-400">
        <BookOpen size={64} className="mb-4 opacity-20" />
        <h3 className="text-xl font-bold mb-2">Your notebook is empty</h3>
        <p>Save words from your searches to review them here.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 display-font">My Notebook ({items.length})</h2>
        <button 
          onClick={handleWeaveStory}
          disabled={loadingStory || items.length < 2}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition"
        >
          <Sparkles size={16} />
          {loadingStory ? 'Weaving...' : 'Weave Story'}
        </button>
      </div>

      {story && (
        <div className="mb-8 bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-indigo-500"></div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-400" /> AI Story Time
          </h3>
          <p className="whitespace-pre-wrap leading-relaxed opacity-90">{story}</p>
          <button 
            onClick={() => setStory(null)}
            className="mt-4 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white"
          >
            Close Story
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition cursor-pointer" onClick={() => onReview(item)}>
             <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
               {item.imageUrl ? (
                 <img src={item.imageUrl} alt={item.word} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No Img</div>
               )}
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="font-bold text-lg text-slate-900 truncate">{item.word}</h3>
                  <span className="text-xs font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded">
                    {item.targetLang ? item.targetLang.slice(0, 2).toUpperCase() : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">{item.explanation}</p>
             </div>

             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
               className="p-2 text-slate-300 hover:text-red-500 transition"
             >
               <Trash2 size={20} />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotebookView;