window.STRINGS_ES =
{
  "ui": {
    "title": "Visualizador de Ventana de Contexto",
    "flow1": "Flujo 1",
    "flow2": "Flujo 2",
    "play_title": "Reproducir / Pausar",
    "next_title": "Siguiente paso",
    "reset_title": "Reiniciar",
    "speed": "vel.",
    "conversation": "Conversación",
    "context_window": "Ventana de Contexto",
    "overflow_spill": "▼ desbordamiento",
    "token_counter": "{used} / {total} tokens",
    "step_indicator": "paso {current} / {total}",
    "step_indicator_init": "paso — / {total}",
    "info_panel_title": "Acerca de",
    "info_btn_title": "Aprender"
  },
  "actors": {
    "user": "Usuario",
    "llm": "LLM",
    "tool": "Herramienta"
  },
  "status": {
    "idle": "inactivo",
    "thinking": "pensando…",
    "calling": "llamando herramienta",
    "waiting": "esperando herramienta",
    "responding": "respondiendo",
    "full": "contexto lleno ⚠️",
    "overflow": "desbordamiento ❌"
  },
  "segments": {
    "user": "Usuario",
    "thinking": "Pensar",
    "tool_call": "Llamada",
    "tool_result": "Resultado",
    "assistant": "Respuesta",
    "summary": "Resumen",
    "overflow": "DESBORDAMIENTO"
  },
  "arrows": {
    "too_large": "✗ DEMASIADO GRANDE"
  },
  "modals": {
    "context_full": {
      "title": "⚠️ Ventana de Contexto Llena",
      "desc": "El modelo no tiene espacio para generar una respuesta. Elige cómo continuar:",
      "options": [
        {
          "title": "Opción A — Resumir y Continuar",
          "desc": "Comprime los turnos anteriores en un resumen corto, libera espacio y continúa la conversación."
        },
        {
          "title": "Opción B — Nueva Conversación",
          "desc": "Empieza de cero con una ventana de contexto vacía. La conversación anterior se pierde."
        }
      ]
    },
    "overflow": {
      "title": "❌ Respuesta de Herramienta Demasiado Grande",
      "desc": "La herramienta devolvió ~52.000 tokens pero solo quedan ~7.600 tokens en la ventana de contexto.",
      "options": [
        {
          "title": "Opción A — Truncar y Continuar",
          "desc": "Acepta solo los datos que caben. Algunos mensajes serán cortados."
        },
        {
          "title": "Opción B — Reintentar con solicitud menor",
          "desc": "Elimina la llamada fallida y solicita menos mensajes a la herramienta (p. ej. últimos 7 días)."
        },
        {
          "title": "Opción C — Nueva Conversación",
          "desc": "Abandona esta solicitud y empieza de cero con una ventana de contexto vacía."
        }
      ]
    }
  },
  "resolutions": {
    "summarize_done": "📋 Contexto comprimido en resumen. La conversación continúa…",
    "summarize_continue": "\"(continuando conversación con contexto resumido)\"",
    "new_conversation": "🆕 Nueva conversación iniciada. Contexto borrado.",
    "truncate_done": "✂️ Respuesta truncada para ajustarse al contexto. Faltan algunos correos.",
    "retry_system": "🔄 Reintentando con una solicitud menor (últimos 7 días)…",
    "retry_thinking": "Reemitiendo llamada con since=\"hace 7 días\"",
    "retry_tool_call": "→ get_emails(inbox=\"primary\", since=\"hace 7 días\")",
    "retry_tool_result": "← correos de los últimos 7 días devueltos (~1.800 tokens) ✓",
    "retry_response": "Aquí están los correos de los últimos 7 días: …"
  },
  "info": {
    "content": `<p>La <strong>ventana de contexto</strong> es la "memoria de trabajo" de tamaño fijo que tiene un LLM para una sola generación. El modelo no ve tu aplicación, tu base de datos ni "una conversación" como tal. Solo ve una <strong>secuencia única de tokens</strong> (fragmentos similares a palabras) que le envías en cada turno, y genera los siguientes tokens.</p>

<h2>Qué son los LLMs: generadores de texto token a token</h2>
<p>En el momento de la inferencia, un LLM hace básicamente esto: "dados los tokens hasta ahora, predice el siguiente token", de forma iterativa.</p>
<p>Incluso la interfaz de chat no es más que una <strong>plantilla</strong> que se serializa en texto plano / tokens. Conceptualmente, el modelo ve algo así:</p>
<pre><code>&lt;SYSTEM&gt; Eres un asistente útil. Sigue la política X.&lt;/SYSTEM&gt;
&lt;USER&gt; Resume el contrato adjunto.&lt;/USER&gt;
&lt;ASSISTANT&gt; Claro—por favor proporciona el texto del contrato.&lt;/ASSISTANT&gt;
&lt;USER&gt; [texto del contrato]&lt;/USER&gt;
&lt;ASSISTANT&gt; &lt;THINKING&gt; Ok, debo: extraer partes, plazo, pago &lt;/THINKING&gt;
&lt;TOOL_CALL name="extract_clauses"&gt;{...}&lt;/TOOL_CALL&gt;&lt;/ASSISTANT&gt;
&lt;TOOL_RESULT name="extract_clauses"&gt;{ "clauses": [...] }&lt;/TOOL_RESULT&gt;
&lt;ASSISTANT&gt; &lt;THINKING&gt; Bien, según los datos obtenidos, ... &lt;/THINKING&gt;
Según las cláusulas, aquí está el resumen: ...&lt;/ASSISTANT&gt;</code></pre>

<h2>Qué significa "ventana de contexto llena" (y por qué importa)</h2>
<p>La ventana de contexto es compartida por:</p>
<ul>
  <li><strong>Tokens de entrada</strong> (prompt del sistema + historial de conversación + resultados de herramientas + documentos recuperados, etc.)</li>
  <li><strong>Tokens de salida</strong> (la respuesta que le pides al modelo que genere)</li>
</ul>
<p>Una vez que alcanzas el límite, el modelo <strong>no puede aceptar más entrada ni producir más salida</strong> en esa solicitud. En ese momento, debes hacer una de estas cosas: truncar turnos anteriores, resumir el contexto hasta ese momento, o iniciar una nueva conversación desde cero.</p>

<h2>Qué determina el tamaño de la ventana de contexto</h2>
<p>La longitud del contexto está limitada por <strong>dos factores principales</strong>:</p>
<ol>
  <li>
    <strong>Capacidad del modelo (límite de entrenamiento/arquitectura)</strong>
    <ul>
      <li>Cada modelo se entrena y configura para operar hasta una longitud máxima de contexto (p. ej., 8k/32k/128k tokens).</li>
      <li>Superar lo que el modelo fue diseñado para soportar o bien no está permitido o bien degrada la calidad.</li>
    </ul>
  </li>
  <li>
    <strong>Memoria de hardware en tiempo de inferencia (VRAM / RAM)</strong>
    <ul>
      <li>Servir contextos largos requiere almacenar el attention state por token (conocido como la <strong>KV cache</strong>) en todas las layers y attention heads.</li>
      <li>La memoria crece aproximadamente de forma <strong>lineal con la longitud del contexto</strong>, por lo que ventanas más grandes necesitan más VRAM de GPU.</li>
      <li>Por eso un modelo entrenado para <em>soportar</em> 128k de contexto puede seguir sirviendo solo 32k en una configuración de GPU determinada.</li>
    </ul>
  </li>
</ol>`
  },
  "flows": {
    "flow1": [
      { "label": "Usuario envía solicitud",               "transcript": "\"Muéstrame los últimos 10 correos de mi bandeja de entrada\"" },
      { "label": "LLM piensa…",                           "transcript": "Decidiendo llamar a get_emails(inbox=\"primary\", limit=10)" },
      { "label": "LLM llama a herramienta",               "transcript": "→ get_emails(inbox=\"primary\", limit=10)" },
      { "label": "Herramienta devuelve 10 correos",        "transcript": "← 10 correos devueltos (~2.000 tokens)" },
      { "label": "LLM responde al usuario",                "transcript": "Aquí están los últimos 10 correos: De Alice \"…\", De Bob \"…\", …" },
      { "label": "Usuario hace pregunta de seguimiento",  "transcript": "\"¿Quién me escribió más?\"" },
      { "label": "LLM piensa…",                           "transcript": "Contando remitentes a partir del resultado de la herramienta en contexto…" },
      { "label": "LLM responde",                          "transcript": "Alice envió 4 de 10 correos, seguida de Bob con 3." },
      { "label": "Usuario pide traducción",               "transcript": "\"Tradúcelos todos al inglés\"" },
      { "label": "LLM piensa…",                           "transcript": "Traduciendo 10 correos del contexto al inglés…" },
      { "label": "LLM responde con traducciones",         "transcript": "Here are the emails in English: From Alice \"…\", From Bob \"…\"…" },
      { "label": "Usuario pide resumen",                  "transcript": "\"Ahora resume los temas principales tratados\"" },
      { "label": "LLM piensa — se queda sin espacio",     "transcript": "Analizando todos los correos y traducciones para encontrar los temas principales…" },
      { "label": "¡Ventana de contexto llena!",           "transcript": "⚠️ Ventana de contexto llena — el modelo no puede generar una respuesta." }
    ],
    "flow2": [
      { "label": "Usuario envía solicitud",       "transcript": "\"Dame todos los correos de mi bandeja de entrada del último año\"" },
      { "label": "LLM piensa…",                   "transcript": "Decidiendo llamar a get_emails(inbox=\"primary\", since=\"hace 1 año\")" },
      { "label": "LLM llama a herramienta",       "transcript": "→ get_emails(inbox=\"primary\", since=\"hace 1 año\")" },
      { "label": "¡Resultado demasiado grande!",  "transcript": "❌ Herramienta devolvió ~52.000 tokens — ¡desbordamiento de contexto!" }
    ]
  }
}
;
