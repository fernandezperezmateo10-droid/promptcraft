import { Clock, Trash2, ChevronRight, Zap, Cpu, PenTool, Briefcase } from 'lucide-react';
import React from 'react';

const CATEGORY_ICONS = {
  auto: Zap,
  programacion: Cpu,
  escritura: PenTool,
  productividad: Briefcase,
};

const CATEGORY_COLORS = {
  auto: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50',
  programacion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  escritura: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  productividad: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
};

export default function HistorySidebar({ history, onSelect, onClear }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Tu historial está vacío.</p>
        <p className="text-xs mt-1 opacity-70">Los prompts que optimices aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          Historial
        </h2>
        <button
          onClick={onClear}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Borrar historial"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {history.map((item) => {
          const cat = item.category || 'auto';
          const Icon = CATEGORY_ICONS[cat] || Zap;
          const colorClass = CATEGORY_COLORS[cat] || CATEGORY_COLORS.auto;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
                  <Icon className="w-3 h-3" />
                  {cat}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {item.originalPrompt}
              </p>
              
              <div className="flex items-center justify-end text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Ver resultado <ChevronRight className="w-3 h-3 ml-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
