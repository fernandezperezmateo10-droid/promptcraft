import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Loader2, Copy, Check, LogOut } from 'lucide-react';

const API_URL = 'http://localhost:3001';

export default function PromptCraft({ token, user, onLogout }) {
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [resultText, setResultText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Restore draft if extension was closed
  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['draftPrompt'], (res) => {
        if (res.draftPrompt) setPrompt(res.draftPrompt);
      });
    }
  }, []);

  const handlePromptChange = (e) => {
    const val = e.target.value;
    setPrompt(val);
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ draftPrompt: val });
    }
  };

  const parsePartialJson = (xmlString) => {
    let promptOptimizado = '';
    const promptStartMatch = xmlString.match(/<(?:promptOptimizado|prompt_optimizado|prompt|resultado)[^>]*>/i);
    if (promptStartMatch) {
      const startIndex = promptStartMatch.index + promptStartMatch[0].length;
      const promptEndMatch = xmlString.match(/<\/(?:promptOptimizado|prompt_optimizado|prompt|resultado)>/i);
      if (promptEndMatch) {
        promptOptimizado = xmlString.substring(startIndex, promptEndMatch.index).trim();
      } else {
        promptOptimizado = xmlString.substring(startIndex).trim();
      }
    } else if (xmlString.length > 20 && !xmlString.includes('<tecnica')) {
      promptOptimizado = xmlString.replace(/^```xml/i, '').trim();
    }
    return promptOptimizado;
  };

  const handleOptimize = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsStreaming(true);
    setResultText('');
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/prompts/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, category: 'auto' })
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullXml = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.text) {
                fullXml += data.delta.text;
                const partial = parsePartialJson(fullXml);
                if (partial) setResultText(partial);
              }
            } catch (err) {}
          }
        }
      }

      // Final parse
      const finalRes = parsePartialJson(fullXml);
      setResultText(finalRes || fullXml); // Fallback to raw if tags failed

      // Save to history on backend
      await fetch(`${API_URL}/api/prompts/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original_prompt: prompt,
          optimized_prompt: finalRes || fullXml,
          category: 'auto'
        })
      });

      // Clear draft
      if (chrome && chrome.storage) {
        chrome.storage.local.remove('draftPrompt');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsStreaming(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          PromptCraft
        </div>
        <button 
          onClick={onLogout}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {error && (
          <div className="p-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleOptimize} className="flex flex-col gap-2 shrink-0">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            placeholder="¿Qué quieres conseguir con la IA? (Ej: Crea un post para LinkedIn sobre...)"
            className="w-full h-24 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-sm"
          />
          <button
            type="submit"
            disabled={isStreaming || !prompt.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            {isStreaming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Optimizando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Optimizar Prompt
              </>
            )}
          </button>
        </form>

        {(resultText || isStreaming) && (
          <div className="flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resultado</span>
              {resultText && !isStreaming && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
            <div className="relative flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300">
                {resultText || <span className="text-slate-400 italic">Generando la magia...</span>}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle"></span>
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
