import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();
const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY, // Use server env var
});

const SYSTEM_PROMPT = `Eres un experto mundial en Prompt Engineering. Tu objetivo es analizar la petición del usuario y devolver un prompt optimizado y estructurado, listo para ser utilizado en cualquier IA avanzada.
ESTRICTO: Usa solo las siguientes etiquetas XML y NADA de Markdown ni texto suelto:

<categoria>programacion</categoria> (o "escritura" o "productividad")
<tecnicas>
  <tecnica nombre="Contexto">Define el rol de forma precisa.</tecnica>
  <tecnica nombre="Formato">Establece la estructura deseada.</tecnica>
</tecnicas>
<promptOptimizado>
Aquí el prompt final...
</promptOptimizado>

REGLAS CRÍTICAS:
1. Máximo 2 <tecnica>.
2. Las explicaciones de técnicas deben ser ULTRA BREVES (máximo 10 palabras).
3. No añadas introducciones ni despedidas. Ahorra tokens al máximo.`;

// 1. Optimize Prompt (Stream)
router.post('/optimize', requireAuth, async (req, res) => {
  try {
    const { prompt, category } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userMessage = `Categoría solicitada: ${category || 'auto'}.\nPetición del usuario:\n${prompt}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Claude API Error:', error);
    // If headers are not sent, send JSON error. Otherwise, send SSE error.
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generating prompt' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: { message: 'Internal server error' } })}\n\n`);
      res.end();
    }
  }
});

// 2. Get User History
router.get('/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const history = await db.all(
      'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );

    // Parse JSON stored techniques
    const parsedHistory = history.map(item => ({
      ...item,
      tecnicas: item.tecnicas ? JSON.parse(item.tecnicas) : []
    }));

    res.json(parsedHistory);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Save to History
router.post('/history', requireAuth, async (req, res) => {
  try {
    const { original_prompt, optimized_prompt, category, tecnicas } = req.body;
    
    if (!original_prompt || !optimized_prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDb();
    const result = await db.run(
      `INSERT INTO history (user_id, original_prompt, optimized_prompt, category, tecnicas)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, original_prompt, optimized_prompt, category, JSON.stringify(tecnicas || [])]
    );

    const newItem = await db.get('SELECT * FROM history WHERE id = ?', [result.lastID]);
    
    res.status(201).json({
      ...newItem,
      tecnicas: newItem.tecnicas ? JSON.parse(newItem.tecnicas) : []
    });
  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Clear History (Optional, per user)
router.delete('/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM history WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'History cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
