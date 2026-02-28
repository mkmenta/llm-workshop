window.STRINGS_EN =
{
  "ui": {
    "title": "LLM Context Window Visualizer",
    "flow1": "Flow 1",
    "flow2": "Flow 2",
    "play_title": "Play / Pause",
    "next_title": "Next step",
    "reset_title": "Reset",
    "speed": "speed",
    "conversation": "Conversation",
    "context_window": "Context Window",
    "overflow_spill": "▼ overflow",
    "token_counter": "{used} / {total} tokens",
    "step_indicator": "step {current} / {total}",
    "step_indicator_init": "step — / {total}",
    "info_panel_title": "About",
    "info_btn_title": "Learn"
  },
  "actors": {
    "user": "User",
    "llm": "LLM",
    "tool": "Tool"
  },
  "status": {
    "idle": "idle",
    "thinking": "thinking…",
    "calling": "calling tool",
    "waiting": "waiting for tool",
    "responding": "responding",
    "full": "context full ⚠️",
    "overflow": "overflow ❌"
  },
  "segments": {
    "user": "User",
    "thinking": "Think",
    "tool_call": "Call",
    "tool_result": "Result",
    "assistant": "Reply",
    "summary": "Summary",
    "overflow": "OVERFLOW"
  },
  "arrows": {
    "too_large": "✗ TOO LARGE"
  },
  "modals": {
    "context_full": {
      "title": "⚠️ Context Window Full",
      "desc": "The model has no room left to generate a response. Choose how to proceed:",
      "options": [
        {
          "title": "Option A — Summarize & Continue",
          "desc": "Compress earlier turns into a short summary, free up space, and keep the conversation going."
        },
        {
          "title": "Option B — New Conversation",
          "desc": "Start fresh with an empty context window. The previous conversation is lost."
        }
      ]
    },
    "overflow": {
      "title": "❌ Tool Response Too Large",
      "desc": "The tool returned ~52,000 tokens but only ~7,600 tokens remain in the context window.",
      "options": [
        {
          "title": "Option A — Truncate & Continue",
          "desc": "Accept only as much data as fits. Some messages will be cut off."
        },
        {
          "title": "Option B — Retry with smaller request",
          "desc": "Remove the failed call and ask the tool for fewer messages (e.g. last 7 days)."
        },
        {
          "title": "Option C — New Conversation",
          "desc": "Abandon this request and start fresh with an empty context window."
        }
      ]
    }
  },
  "resolutions": {
    "summarize_done": "📋 Context compressed into summary. Conversation continues…",
    "summarize_continue": "\"(continuing conversation with summarized context)\"",
    "new_conversation": "🆕 New conversation started. Context cleared.",
    "truncate_done": "✂️ Response truncated to fit context. Some emails missing.",
    "retry_system": "🔄 Retrying with a smaller request (last 7 days)…",
    "retry_thinking": "Re-issuing tool call with since=\"7 days ago\"",
    "retry_tool_call": "→ get_emails(inbox=\"primary\", since=\"7 days ago\")",
    "retry_tool_result": "← 7 days of emails returned (~1,800 tokens) ✓",
    "retry_response": "Here are the emails from the last 7 days: …"
  },
  "info": {
    "content": `<p>The <strong>context window</strong> is the fixed-size "working memory" an LLM has for a single generation. The model doesn't see your app, your database, or "a conversation" as such—it only sees a <strong>single sequence of tokens</strong> (word-ish chunks) that you send each turn, and it produces the next tokens.</p>

<h2>What LLMs actually are: next&#8209;token text generators</h2>
<p>At inference time an LLM is basically doing: "given the tokens so far, predict the next token," iteratively.</p>
<p>Even chat UX is just a <strong>template</strong> that gets serialized into plain text / tokens. Conceptually, the model sees something like:</p>
<pre><code>&lt;SYSTEM&gt; You are a helpful assistant. Follow policy X.&lt;/SYSTEM&gt;
&lt;USER&gt; Summarize the attached contract.&lt;/USER&gt;
&lt;ASSISTANT&gt; Sure—please provide the contract text.&lt;/ASSISTANT&gt;
&lt;USER&gt; [contract text]&lt;/USER&gt;
&lt;ASSISTANT&gt; &lt;THINKING&gt; Ok, I should: extract parties, term, payment &lt;/THINKING&gt;
&lt;TOOL_CALL name="extract_clauses"&gt;{...}&lt;/TOOL_CALL&gt;&lt;/ASSISTANT&gt;
&lt;TOOL_RESULT name="extract_clauses"&gt;{ "clauses": [...] }&lt;/TOOL_RESULT&gt;
&lt;ASSISTANT&gt; &lt;THINKING&gt; Hmm, according to the obtained data, ... &lt;/THINKING&gt;
Based on the clauses, here's the summary: ...&lt;/ASSISTANT&gt;</code></pre>

<h2>What "context window full" means (and why it matters)</h2>
<p>The context window is a single budget shared by:</p>
<ul>
  <li><strong>Input tokens</strong> (system prompt + conversation history + tool outputs + retrieved docs, etc.)</li>
  <li><strong>Output tokens</strong> (the model's reply you're asking it to generate)</li>
</ul>
<p>Once you hit the limit, the model <strong>cannot accept more input or produce more output</strong> in that request. Then you must do one of: truncate earlier turns, summarize the context so far, or start a new conversation from scratch.</p>

<h2>What determines context window size</h2>
<p>Context length is constrained by <strong>two main factors</strong>:</p>
<ol>
  <li>
    <strong>Model capability (training/architecture limit)</strong>
    <ul>
      <li>Each model is trained/configured to operate up to a maximum context length (e.g., 8k/32k/128k tokens).</li>
      <li>Pushing beyond what the model was designed for either isn't supported or degrades quality.</li>
    </ul>
  </li>
  <li>
    <strong>Hardware memory at inference time (VRAM / RAM)</strong>
    <ul>
      <li>Serving long contexts requires storing per-token attention state (often called the <strong>KV cache</strong>) across layers/heads.</li>
      <li>Memory grows roughly <strong>linearly with context length</strong>, so larger windows need more GPU VRAM.</li>
      <li>This is why a model that was trained to <em>support</em> 128k context may still be served at 32k on a given GPU setup.</li>
    </ul>
  </li>
</ol>`
  },
  "flows": {
    "flow1": [
      { "label": "User sends request",              "transcript": "\"Get me the last 10 emails from my inbox\"" },
      { "label": "LLM thinks…",                     "transcript": "Deciding to call get_emails(inbox=\"primary\", limit=10)" },
      { "label": "LLM calls tool",                  "transcript": "→ get_emails(inbox=\"primary\", limit=10)" },
      { "label": "Tool returns 10 emails",          "transcript": "← 10 emails returned (~2,000 tokens)" },
      { "label": "LLM responds to user",            "transcript": "Here are the last 10 emails: From Alice \"…\", From Bob \"…\", …" },
      { "label": "User asks follow-up",             "transcript": "\"Who emailed me the most?\"" },
      { "label": "LLM thinks…",                     "transcript": "Counting senders from the tool result already in context…" },
      { "label": "LLM responds",                    "transcript": "Alice sent 4 out of 10 emails, followed by Bob with 3." },
      { "label": "User asks for translation",       "transcript": "\"Translate them all to Spanish\"" },
      { "label": "LLM thinks…",                     "transcript": "Translating 10 emails from context into Spanish…" },
      { "label": "LLM responds with translations",  "transcript": "Aquí están los correos en español: De Alice \"…\", De Bob \"…\"…" },
      { "label": "User asks for summary",           "transcript": "\"Now summarize the main topics discussed\"" },
      { "label": "LLM thinks — runs out of space",  "transcript": "Analyzing all emails and translations to find main topics…" },
      { "label": "Context window full!",            "transcript": "⚠️ Context window full — model cannot generate a response." }
    ],
    "flow2": [
      { "label": "User sends request",    "transcript": "\"Get me all emails from my inbox for the last year\"" },
      { "label": "LLM thinks…",           "transcript": "Deciding to call get_emails(inbox=\"primary\", since=\"1 year ago\")" },
      { "label": "LLM calls tool",        "transcript": "→ get_emails(inbox=\"primary\", since=\"1 year ago\")" },
      { "label": "Tool result too large!", "transcript": "❌ Tool returned ~52,000 tokens — context overflow!" }
    ]
  }
}
;
