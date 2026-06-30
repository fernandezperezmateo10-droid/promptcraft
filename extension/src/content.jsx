import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, X, Send, Loader2, Copy, Check } from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:3001';

function ContentApp() {
  const [activeElement, setActiveElement] = useState(null);
  const [iconPos, setIconPos] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [token, setToken] = useState(null);
  
  // Panel state
  const [promptText, setPromptText] = useState('');
  const [resultText, setResultText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get token
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['token'], (res) => {
        if (res.token) setToken(res.token);
      });
    }

    const handleFocusIn = (e) => {
      let target = e.target;
      
      // Bubble up to find a suitable editable element
      while (target && target !== document.body) {
        if (
          target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' && target.type === 'text') ||
          target.isContentEditable
        ) {
          console.log('[PromptCraft] 🎯 Campo de texto detectado:', target);
          setActiveElement(target);
          updateIconPos(target);
          return;
        }
        target = target.parentElement;
      }
    };

    const handleFocusOut = (e) => {
      // Only hide if we are losing focus to something that isn't our panel or icon
      setTimeout(() => {
        setPanelOpen((prev) => {
          if (!prev) {
            console.log('[PromptCraft] 🙈 Ocultando icono mágico');
            setIconPos(null);
            setActiveElement(null);
          }
          return prev;
        });
      }, 500); // Increased delay just in case
    };

    const handleScroll = () => {
      if (activeElement && !panelOpen) {
        updateIconPos(activeElement);
      }
    };

    // Use capture phase for focus events to bypass stopPropagation
    document.addEventListener('focus', handleFocusIn, true);
    document.addEventListener('blur', handleFocusOut, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll, true);

    return () => {
      document.removeEventListener('focus', handleFocusIn, true);
      document.removeEventListener('blur', handleFocusOut, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll, true);
    };
  }, [activeElement, panelOpen]);

  const updateIconPos = (el) => {
    const rect = el.getBoundingClientRect();
    console.log('[PromptCraft] 📍 Posicionando icono en (fijo):', rect.bottom, rect.right);
    setIconPos({
      top: rect.bottom - 40,
      left: rect.right - 40,
    });
  };

  const getElementText = (el) => {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value;
    }
    return el.innerText || el.textContent;
  };

  const setElementText = (el, text) => {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.innerText = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeElement) {
      setPromptText(getElementText(activeElement));
    }
    setPanelOpen(true);
    setIconPos(null); // Hide floating icon when panel is open
  };

  const closePanel = () => {
    setPanelOpen(false);
    setResultText('');
    setError(null);
    if (activeElement) {
      activeElement.focus();
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

  const handleOptimize = async () => {
    if (!promptText.trim()) return;
    if (!token) {
      setError('Inicia sesión en la extensión primero.');
      return;
    }

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
        body: JSON.stringify({ prompt: promptText, category: 'auto' })
      });

      if (!response.ok) throw new Error('Error al conectar con el servidor');

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

      const finalRes = parsePartialJson(fullXml) || fullXml;
      setResultText(finalRes);

      // Save to history on backend (fire and forget)
      fetch(`${API_URL}/api/prompts/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original_prompt: promptText,
          optimized_prompt: finalRes,
          category: 'auto'
        })
      }).catch(() => {});

    } catch (err) {
      setError(err.message);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReplace = () => {
    if (activeElement && resultText) {
      setElementText(activeElement, resultText);
      closePanel();
    }
  };

  return (
    <div className="promptcraft-root">
      {/* Floating Icon */}
      {iconPos && !panelOpen && (
        <div
          onMouseDown={handleIconClick}
          className="fixed z-[999999] cursor-pointer flex items-center justify-center w-8 h-8 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg transition-transform hover:scale-110"
          style={{ top: iconPos.top, left: iconPos.left }}
          title="Optimizar con PromptCraft"
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Inline Panel */}
      {panelOpen && activeElement && (
        <div 
          className="fixed z-[999999] bg-white border border-slate-200 shadow-2xl rounded-2xl w-[350px] overflow-hidden flex flex-col"
          style={{ 
            top: activeElement.getBoundingClientRect().bottom + 10, 
            left: activeElement.getBoundingClientRect().left 
          }}
        >
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              PromptCraft
            </div>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {error && <div className="text-xs text-red-500">{error}</div>}
            
            <div className="text-xs text-slate-500 font-medium">Texto detectado:</div>
            <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
              {promptText || <span className="italic text-slate-400">Campo vacío...</span>}
            </div>

            <button
              onClick={handleOptimize}
              disabled={isStreaming || !promptText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isStreaming ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Optimizando...</>
              ) : (
                <><Send className="w-4 h-4" /> Optimizar este texto</>
              )}
            </button>

            {resultText && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="text-xs text-slate-500 font-medium">Resultado:</div>
                <div className="text-sm text-slate-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans">{resultText}</pre>
                </div>
                <button
                  onClick={handleReplace}
                  className="w-full flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Check className="w-4 h-4" /> Insertar y Reemplazar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Inject React Root
const rootDiv = document.createElement('div');
rootDiv.id = 'promptcraft-extension-root';
document.body.appendChild(rootDiv);
const root = createRoot(rootDiv);
root.render(<ContentApp />);
