import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DictionaryResult, SavedItem } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Dictionary Lookup
export const lookupWord = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<Omit<DictionaryResult, 'imageUrl' | 'timestamp' | 'sourceLang' | 'targetLang'>> => {
  const ai = getClient();
  
  // Specific instruction for European Portuguese
  const isPortuguese = targetLang.toLowerCase().includes('portuguese');
  const langInstruction = isPortuguese
    ? "The target language is strictly **European Portuguese (Português de Portugal/pt-PT)**. Do NOT use Brazilian Portuguese terms or grammar. Use 'tu' for the second person singular informal. Use 'estou a fazer' construction instead of gerund 'estou fazendo'. Use 'autocarro', 'comboio', 'ecrã' instead of 'ônibus', 'trem', 'tela'."
    : `The target language is "${targetLang}".`;

  const prompt = `
    Analyze the text "${text}". 
    The user's native language is "${sourceLang}".
    ${langInstruction}
    
    Provide:
    1. A natural language explanation in ${sourceLang}.
    2. Two example sentences in the target language with their ${sourceLang} translations.
    3. A "friendly note" in ${sourceLang}. This should be casual, like a friend chatting. Mention cultural context, nuance, slang, or how it differs from similar words. Keep it concise and fun. Avoid textbook dry language.
    4. **IF AND ONLY IF** the word is a verb in the target language, provide the **Infinitive** form and the **Present Tense (Indicative)** conjugation for standard persons (e.g., Eu, Tu, Ele/Ela/Você, Nós, Eles/Elas). If it is not a verb, leave the conjugation field null.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING, description: "The corrected or normalized target word/phrase" },
          explanation: { type: Type.STRING },
          examples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translated: { type: Type.STRING },
              }
            }
          },
          friendlyNote: { type: Type.STRING },
          conjugations: {
            type: Type.OBJECT,
            nullable: true,
            description: "Only populate if the word is a verb",
            properties: {
              infinitive: { type: Type.STRING },
              tenseName: { type: Type.STRING, description: "e.g., Presente do Indicativo" },
              forms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pronoun: { type: Type.STRING },
                    form: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};

// 2. Image Generation
export const generateConceptImage = async (word: string): Promise<string | undefined> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `Create a simple, fun, vibrant, minimalist vector-style illustration representing the concept: "${word}". Bright colors, clean lines, flat design, white background.`,
      config: {
        // No responseSchema for image models
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.warn("Image generation failed", e);
    return undefined;
  }
  return undefined;
};

// 3. Text to Speech
export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck is energetic
          },
        },
      },
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64 || null;
  } catch (e) {
    console.error("TTS failed", e);
    return null;
  }
};

// 4. Story Weaving
export const weaveStory = async (items: SavedItem[], nativeLang: string): Promise<string> => {
  const ai = getClient();
  const words = items.map(i => i.word).join(", ");
  
  const prompt = `
    Write a short, funny, and coherent story (max 150 words) that incorporates the following words: ${words}.
    The story should be written in the target language of the words, but provide a full translation in ${nativeLang} at the end.
    Highlight the keywords in the story if possible.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Could not generate story.";
};

// 5. Chat Context
export const getChatResponse = async (
  history: {role: 'user' | 'model', text: string}[], 
  newMessage: string, 
  currentContext: DictionaryResult,
  targetLang: string,
  nativeLang: string
) => {
  const ai = getClient();
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: [
      {
        role: 'user',
        parts: [{ text: `System: You are a helpful language tutor. We are discussing the word/phrase "${currentContext.word}" (Target: ${targetLang}, Native: ${nativeLang}). The definition provided was: "${currentContext.explanation}". Keep answers brief and helpful.` }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood! I'm ready to help you explore this word further." }]
      },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
    ]
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text;
};