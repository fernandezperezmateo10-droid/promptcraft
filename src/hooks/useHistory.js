import { useState, useEffect } from 'react';

export function useHistory() {
  const [history, setHistory] = useState([]);
  const token = localStorage.getItem('token'); // We will assume the token is saved here on login

  // Fetch from backend
  const fetchHistory = async () => {
    if (!token) {
      setHistory([]);
      return;
    }
    
    try {
      const response = await fetch('/api/prompts/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Transform the DB output into the format expected by the frontend
        const formattedHistory = data.map(item => ({
          id: item.id.toString(),
          timestamp: new Date(item.created_at).getTime(),
          originalPrompt: item.original_prompt,
          category: item.category,
          resultData: {
            promptOptimizado: item.optimized_prompt,
            categoria: item.category,
            tecnicas: item.tecnicas
          }
        }));
        setHistory(formattedHistory);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const savePrompt = async (promptData) => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/prompts/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original_prompt: promptData.originalPrompt,
          optimized_prompt: promptData.resultData.promptOptimizado,
          category: promptData.resultData.categoria || promptData.category,
          tecnicas: promptData.resultData.tecnicas
        })
      });
      
      if (response.ok) {
        await fetchHistory();
      }
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  const clearHistory = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/prompts/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setHistory([]);
      }
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  };

  return { history, savePrompt, clearHistory, fetchHistory };
}
