export async function streamOptimizedPrompt(userDescription, selectedCategory, onChunk) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/prompts/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt: userDescription,
        category: selectedCategory
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Error en la petición a la API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';
    let generatedText = '';
    let streamFinishedNormally = false;
    let finalStopReason = null;

    // Timeout de 15 segundos por si el proxy se queda colgado a medias
    let lastChunkTime = Date.now();
    const timeoutInterval = setInterval(() => {
      if (!done && Date.now() - lastChunkTime > 15000) {
        clearInterval(timeoutInterval);
        reader.cancel();
      }
    }, 1000);

    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        lastChunkTime = Date.now();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'error') {
                  throw new Error(data.error?.message || 'Error transmitido por la API de Claude');
                }
                if (data.type === 'message_delta' && data.delta?.stop_reason) {
                  finalStopReason = data.delta.stop_reason;
                  console.log('[DEBUG] stop_reason detectado:', finalStopReason);
                  if (finalStopReason === 'max_tokens') {
                    throw new Error('Claude se ha quedado sin memoria (max_tokens) y no pudo terminar.');
                  }
                }
                if (data.type === 'message_stop') {
                  console.log('[DEBUG] message_stop recibido. streamFinishedNormally = true');
                  streamFinishedNormally = true;
                }
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  generatedText += data.delta.text;
                  onChunk(generatedText);
                }
              } catch (e) {
                if (e.name !== 'SyntaxError') throw e;
              }
            }
          }
        }
      }
    } finally {
      clearInterval(timeoutInterval);
    }
    
    console.log('[DEBUG] Stream finalizado. stop_reason final:', finalStopReason);
    console.log('[DEBUG] TEXTO XML ACUMULADO:\n', generatedText);

    if (!streamFinishedNormally && generatedText.length > 0) {
      throw new Error('La conexión de red se interrumpió antes de que la IA pudiera terminar de escribir.');
    }
    
    return generatedText;
  } catch (error) {
    if (error.message.includes('network') || error.message.includes('interrumpió') || error.message.includes('aborted') || error.name === 'AbortError') {
      throw new Error('La conexión con la IA se ha cortado (posible límite de tiempo en el servidor). ¡Por favor, intenta de nuevo con un texto más breve!');
    }
    console.error('Error en Claude API:', error);
    throw error;
  }
}

/**
 * Función para extraer datos del XML de manera incremental mientras se hace streaming.
 */
export function parsePartialJson(xmlString) {
  let categoria = null;
  let tecnicas = [];
  let promptOptimizado = '';

  // 1. Extraer Categoria
  const catMatch = xmlString.match(/<categoria[^>]*>([\s\S]*?)<\/categoria>/i);
  if (catMatch) categoria = catMatch[1].trim();

  // 2. Extraer Técnicas (Usamos \b para que no haga match accidental con <tecnicas>)
  const techRegex = /<tecnica\b(?:[^>]*nombre=['"]([^'"]+)['"])?[^>]*>([\s\S]*?)<\/tecnica>/ig;
  let match;
  while ((match = techRegex.exec(xmlString)) !== null) {
    tecnicas.push({
      nombre: match[1] ? match[1].trim() : 'Técnica',
      descripcion: match[2].trim()
    });
  }

  // 3. Extraer el Prompt Optimizado
  let promptStartIndex = -1;
  const promptStartMatch = xmlString.match(/<(?:promptOptimizado|prompt_optimizado|prompt|resultado)[^>]*>/i);
  
  if (promptStartMatch) {
    promptStartIndex = promptStartMatch.index + promptStartMatch[0].length;
  } else {
    // Fallback: Si no usa la etiqueta, pillamos todo tras </tecnicas>
    const tecnicasEndMatch = xmlString.match(/<\/tecnicas>/i);
    if (tecnicasEndMatch) {
      promptStartIndex = tecnicasEndMatch.index + tecnicasEndMatch[0].length;
    }
  }

  if (promptStartIndex !== -1) {
    let rawPrompt = xmlString.substring(promptStartIndex);
    
    // Buscar la etiqueta de cierre y cortar ahí
    const promptEndMatch = rawPrompt.match(/<\/(?:promptOptimizado|prompt_optimizado|prompt|resultado)[^>]*>/i);
    if (promptEndMatch) {
      rawPrompt = rawPrompt.substring(0, promptEndMatch.index);
    }
    
    promptOptimizado = rawPrompt.trimStart();
  }

  // Si está vacío y no hay etiquetas de técnicas, devolver el raw text para que no se quede colgado
  if (!promptOptimizado && xmlString.length > 20 && !xmlString.includes('<tecnica')) {
     promptOptimizado = xmlString.replace(/^```xml/i, '').trim();
  }

  return { categoria, tecnicas, promptOptimizado };
}
