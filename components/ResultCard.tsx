import React, { useState } from 'react';
import { DictionaryResult, ChatMessage, SavedItem } from '../types';
import { Play, Share2, Bookmark, BookmarkCheck, MessageCircle, Send, X, GraduationCap } from 'lucide-react';
import { generateSpeech, getChatResponse } from '../services/geminiService';
import { playAudioData } from '../services/audioService';

interface Props {
  result: DictionaryResult;
  onSave: (item: DictionaryResult) => void;
  isSaved: boolean;
  nativeLangName: string;
  targetLangName: string;
}

const ResultCard: React.FC<Props> = ({ result, onSave, isSaved, nativeLangName, targetLangName }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null); // 'main' or index of example

  const handlePlayAudio = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    // Add visual feedback immediately
    try {
      const base64 = await generateSpeech(text);
      if (base64) {
        await playAudioData(base64);
      }
    } catch (e) {
      console.error("Audio playback error", e);
    } finally {
      setIsPlaying(null);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const responseText = await getChatResponse(
        chatHistory, 
        userMsg.text, 
        result, 
        targetLangName, 
        nativeLangName
      );
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Image Area */}
        <div className="relative h-64 bg-slate-100 flex items-center justify-center overflow-hidden group">
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={result.word} className="w-full h-full object-cover" />
          ) : (
             <div className="animate-pulse w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
               Generating visual...
             </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => onSave(result)}
              className={`p-3 rounded-full shadow-lg transition-all ${isSaved ? 'bg-green-500 text-white' : 'bg-white text-slate-700 hover:scale-110'}`}
            >
              {isSaved ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Main Word */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-4xl font-bold text-slate-900 display-font">{result.word}</h2>
            <button 
              onClick={() => handlePlayAudio(result.word, 'main')}
              disabled={!!isPlaying}
              className={`p-3 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition ${isPlaying === 'main' ? 'animate-pulse ring-2 ring-indigo-400' : ''}`}
            >
              <Play fill="currentColor" size={24} />
            </button>
          </div>
          <p className="text-lg text-slate-500 font-medium mb-6">{result.explanation}</p>

          {/* Friendly Note */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-2xl border border-yellow-100 mb-8 relative">
            <div className="absolute -top-3 left-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">
              FRIENDLY TIP
            </div>
            <p className="text-slate-700 leading-relaxed italic">
              "{result.friendlyNote}"
            </p>
          </div>

          {/* Conjugations (Conditional) */}
          {result.conjugations && (
             <div className="bg-indigo-50 rounded-2xl p-5 mb-8 border border-indigo-100">
                <div className="flex items-center gap-2 mb-3 text-indigo-800 font-bold uppercase tracking-wider text-xs">
                   <GraduationCap size={16} />
                   <span>Verb Cheat Sheet</span>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="text-sm text-indigo-600 font-semibold mb-1">
                      Infinitive: <span className="text-indigo-900 bg-white px-2 py-0.5 rounded shadow-sm ml-2">{result.conjugations.infinitive}</span>
                   </div>
                   <div className="text-xs text-indigo-400 uppercase font-bold mb-2">
                      {result.conjugations.tenseName}
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      {result.conjugations.forms?.map((c, i) => (
                         <div key={i} className="bg-white p-2 rounded-lg text-sm shadow-sm flex items-center justify-between border border-indigo-100/50">
                            <span className="text-slate-400 font-medium text-xs">{c.pronoun}</span>
                            <span className="text-indigo-900 font-bold">{c.form}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {/* Examples */}
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Examples</h3>
            {result.examples.map((ex, idx) => (
              <div key={idx} className="group bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition relative">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <p className="text-lg text-slate-800 font-medium mb-1">{ex.original}</p>
                    <p className="text-slate-500 text-sm">{ex.translated}</p>
                  </div>
                  <button 
                    onClick={() => handlePlayAudio(ex.original, `ex-${idx}`)}
                    disabled={!!isPlaying}
                    className={`p-2 rounded-full shadow-sm text-indigo-500 transition-all ${isPlaying === `ex-${idx}` ? 'bg-indigo-100 animate-pulse' : 'bg-white opacity-60 group-hover:opacity-100'}`}
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Toggle */}
          <button 
            onClick={() => setChatOpen(true)}
            className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
          >
            <MessageCircle size={20} />
            Ask more about this
          </button>
        </div>
      </div>

      {/* Chat Overlay */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold">Chat about "{result.word}"</h3>
              <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
               {chatHistory.length === 0 && (
                 <div className="text-center text-slate-400 mt-10">
                   <p>Ask anything! Nuances, slang, or usage?</p>
                 </div>
               )}
               {chatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                     msg.role === 'user' 
                     ? 'bg-indigo-600 text-white rounded-tr-none' 
                     : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               {chatLoading && (
                 <div className="flex justify-start">
                   <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-200">
                     <div className="flex gap-1">
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                       <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                     </div>
                   </div>
                 </div>
               )}
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-slate-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit" 
                disabled={chatLoading}
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;