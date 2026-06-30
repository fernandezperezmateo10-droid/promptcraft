import React, { useState } from 'react';
import { Cpu, PenTool, Briefcase, Sparkles, Copy, Check, Lightbulb } from 'lucide-react';

const ICONS = {
  programacion: Cpu,
  escritura: PenTool,
  productividad: Briefcase,
};

const BADGE_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
];

export default function ResultsPanel({ result, isStreaming }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = () => {
    if (result.promptOptimizado) {
      navigator.clipboard.writeText(result.promptOptimizado);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const Icon = result.categoria && ICONS[result.categoria] ? ICONS[result.categoria] : Sparkles;

  return (
    <div className="w-full space-y-8 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Bloque 1: Tu Prompt Optimizado */}
      <div className="glass dark:glass-dark rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-indigo-500/10 relative overflow-hidden group border-2 border-indigo-100 dark:border-indigo-900/30">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-indigo-50 dark:border-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Tu prompt optimizado
              </h2>
              {result.categoria && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 capitalize">
                  <Icon className="w-3.5 h-3.5" /> {result.categoria}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={handleCopy}
            disabled={isStreaming || !result.promptOptimizado}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md shadow-slate-900/10"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado' : 'Copiar prompt'}</span>
          </button>
        </div>
        
        <div className="relative">
          <pre className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl text-base sm:text-lg font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed min-h-[120px] border border-slate-100 dark:border-slate-800/50">
            {result.promptOptimizado || <span className="text-slate-400 italic font-medium">Analizando tu petición y redactando el mejor prompt posible...</span>}
            {isStreaming && (
              <span className="inline-block w-2.5 h-5 ml-1 bg-indigo-500 animate-pulse align-middle rounded-sm"></span>
            )}
          </pre>
        </div>
      </div>

      {/* Bloque 2: Por qué funciona mejor */}
      {result.tecnicas && result.tecnicas.length > 0 && (
        <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Por qué funciona mejor
            </h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {result.tecnicas.map((tech, i) => {
              // Only render if it's an object with name and description
              if (typeof tech !== 'object' || !tech.nombre) return null;
              
              const colorClass = BADGE_COLORS[i % BADGE_COLORS.length];
              
              return (
                <div key={i} className="flex flex-col gap-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-start">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${colorClass}`}>
                      {tech.nombre}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tech.descripcion}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
