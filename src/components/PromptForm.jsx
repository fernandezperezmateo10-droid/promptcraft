import React, { useState } from 'react';
import { Send, Cpu, PenTool, Briefcase, Zap, RotateCcw } from 'lucide-react';
import { streamOptimizedPrompt, parsePartialJson } from '../services/claude';
import ResultsPanel from './ResultsPanel';

const CATEGORIES = [
  { id: 'auto', label: 'Auto-detectar', icon: Zap },
  { id: 'programacion', label: 'Programación', icon: Cpu },
  { id: 'escritura', label: 'Escritura', icon: PenTool },
  { id: 'productividad', label: 'Productividad', icon: Briefcase },
];

const EXAMPLES = [
  { text: "Quiero una función que ordene una lista", category: "programacion", icon: Cpu },
  { text: "Necesito ayuda a depurar mi código", category: "programacion", icon: Cpu },
  { text: "Quiero escribir un email a mi jefe", category: "escritura", icon: PenTool },
  { text: "Necesito un post para redes sociales", category: "escritura", icon: PenTool },
  { text: "Quiero organizar mi semana de trabajo", category: "productividad", icon: Briefcase },
  { text: "Necesito un plan de estudio", category: "productividad", icon: Briefcase },
];

export default function PromptForm({ onSaveToHistory, loadedHistoryItem, onClearLoadedHistory }) {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for streaming results
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  // Load from history when selected
  React.useEffect(() => {
    if (loadedHistoryItem) {
      setPrompt(loadedHistoryItem.originalPrompt);
      setCategory(loadedHistoryItem.category);
      setResultData(loadedHistoryItem.resultData);
      setError(null);
    }
  }, [loadedHistoryItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;
    
    // Si estábamos viendo el historial, al modificar y enviar limpiamos la selección
    if (onClearLoadedHistory) onClearLoadedHistory();
    
    setIsSubmitting(true);
    setError(null);
    setResultData({ promptOptimizado: '', categoria: null, tecnicas: [] });

    try {
      let finalData = { promptOptimizado: '', categoria: null, tecnicas: [] };
      
      // Variable to capture the final returned string
      const fullText = await streamOptimizedPrompt(prompt, category, (chunk) => {
        finalData = parsePartialJson(chunk);
        setResultData(finalData);
      });
      
      // 100% GARANTÍA: Al terminar el stream, volvemos a parsear el texto COMPLETO acumulado
      // Esto soluciona cualquier problema de cortes a medias o deltas incompletos al final.
      if (fullText) {
        finalData = parsePartialJson(fullText);
        console.log('RESULTADO FINAL - promptOptimizado:', JSON.stringify(finalData.promptOptimizado));
        setResultData(finalData);
      }
      
      // Save to history on complete success
      if (onSaveToHistory && finalData.promptOptimizado) {
        onSaveToHistory({
          originalPrompt: prompt,
          category: finalData.categoria || category,
          resultData: finalData
        });
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado al contactar con la IA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setCategory('auto');
    setResultData(null);
    setError(null);
    if (onClearLoadedHistory) onClearLoadedHistory();
  };

  const handleExampleClick = (ex) => {
    setPrompt(ex.text);
    setCategory(ex.category);
    if (onClearLoadedHistory) onClearLoadedHistory();
  };

  if (resultData || error) {
    return (
      <div className="w-full flex flex-col items-center">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl w-full border border-red-100 dark:border-red-800/50">
            <p className="font-semibold mb-1">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <ResultsPanel result={resultData} isStreaming={isSubmitting} />
        )}
        
        <button
          onClick={handleReset}
          disabled={isSubmitting}
          className="mt-8 flex items-center gap-2 px-6 py-2.5 rounded-full text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Crear otro prompt
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-6">
        <div className="glass dark:glass-dark rounded-[2rem] p-2 shadow-2xl shadow-indigo-500/5 transition-all duration-300 focus-within:shadow-indigo-500/20 focus-within:ring-1 focus-within:ring-indigo-500/50 group">
          <div className="p-4 sm:p-6 pb-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ejemplo: Necesito que escribas un correo formal a mi jefe para pedirle unos días de vacaciones la próxima semana..."
              className="w-full min-h-[160px] bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-lg sm:text-xl resize-none focus:outline-none focus:ring-0 leading-relaxed"
            />
          </div>
          
          <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mt-4 border-t border-slate-200/50 dark:border-slate-700/50 pt-5 transition-colors">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700/50 shadow-sm'
                        : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!prompt.trim() || isSubmitting}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold transition-all duration-300 shadow-xl shrink-0 ${
                !prompt.trim() || isSubmitting
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60 shadow-none text-slate-500 dark:text-slate-400'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-indigo-500/25 hover:shadow-indigo-500/40'
              }`}
            >
              {isSubmitting ? (
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>Optimizar prompt</span>
            </button>
          </div>
        </div>

        {/* Ejemplos rápidos */}
        <div className="flex flex-col gap-3 px-2">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Pruébalo con un ejemplo:
          </span>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {EXAMPLES.map((ex, i) => {
              const Icon = ex.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleExampleClick(ex)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 opacity-70" />
                  <span>{ex.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );
}
