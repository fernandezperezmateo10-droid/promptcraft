import React, { useState, useEffect } from 'react';
import PromptForm from './components/PromptForm';
import HistorySidebar from './components/HistorySidebar';
import AuthModal from './components/AuthModal';
import { useHistory } from './hooks/useHistory';
import { Sparkles, Menu, X, LogIn, LogOut, User, Lock } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Re-initialize hooks or state when user logs in/out. 
  // We'll rely on useHistory's internal logic that reads the token.
  // A cleaner way is to force a re-render or pass the token to useHistory.
  const { history, savePrompt, clearHistory, fetchHistory } = useHistory();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadedHistoryItem, setLoadedHistoryItem] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch(e) {}
    }
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSelectHistoryItem = (item) => {
    setLoadedHistoryItem(item);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    clearHistory(); // Usually clears local state if no token
    window.location.reload(); // Simple way to reset everything
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    fetchHistory();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-300 flex overflow-hidden">
      {/* Background gradients for premium feel */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] mix-blend-normal"></div>
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-normal"></div>
      </div>
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4 lg:hidden">
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {user ? (
          <HistorySidebar 
            history={history} 
            onSelect={handleSelectHistoryItem} 
            onClear={clearHistory} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">
              <Lock className="w-8 h-8" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Inicia sesión para guardar tu historial</p>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        {/* Header */}
        <div className="p-4 flex items-center justify-between sticky top-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-30 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold lg:hidden">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            PromptCraft
          </div>
          <div className="hidden lg:block"></div> {/* Spacer for desktop */}
          
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline-flex items-center gap-1.5">
                  <User className="w-4 h-4" /> {user.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors font-semibold text-sm"
              >
                <LogIn className="w-4 h-4" /> Entrar
              </button>
            )}
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <main className="flex-1 w-full max-w-3xl mx-auto flex flex-col gap-8 lg:gap-12 p-4 sm:p-8 pt-4 lg:pt-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
          <header className="text-center space-y-4 hidden lg:block">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl mb-2 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              PromptCraft
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Describe lo que necesitas en tus propias palabras y nosotros estructuraremos el prompt perfecto para ti.
            </p>
          </header>

          <PromptForm 
            onSaveToHistory={savePrompt} 
            loadedHistoryItem={loadedHistoryItem}
            onClearLoadedHistory={() => setLoadedHistoryItem(null)}
          />
        </main>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
