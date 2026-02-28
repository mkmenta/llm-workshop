// ═══════════════════════════════════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════════════════════════════════
let LANG = 'es';
let T = {}; // populated from strings.{LANG}.json before init

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const TOTAL_TOKENS  = 8192;
const BAR_HEIGHT_PX = 360; // must match CSS .bar-container height

// ═══════════════════════════════════════════════════════════════════
// STEP DATA
// ═══════════════════════════════════════════════════════════════════

// Each step shape:
// { actor, action, tokens, segmentType, llmStatus, arrow, modal, textKey }
// textKey: index into T.flows.flow1 / T.flows.flow2 for label + transcript text
// arrow: null | 'user_to_llm' | 'llm_to_tool' | 'tool_to_llm' | 'llm_to_user' | 'tool_to_llm_error'
// modal: null | { type: 'context_full' | 'overflow' }

const FLOW1_SCHEMA = [
  { actor: 'user', action: 'message',      tokens: 180,  segmentType: 'user',        llmStatus: 'idle',       arrow: 'user_to_llm',       modal: null,            role: 'user',      textKey: 0 },
  { actor: 'llm',  action: 'thinking',     tokens: 320,  segmentType: 'thinking',    llmStatus: 'thinking',   arrow: null,                modal: null,            role: 'thinking',  textKey: 1 },
  { actor: 'llm',  action: 'tool_call',    tokens: 190,   segmentType: 'tool_call',   llmStatus: 'calling',    arrow: 'llm_to_tool',       modal: null,            role: 'tool',      textKey: 2 },
  { actor: 'tool', action: 'tool_result',  tokens: 2000, segmentType: 'tool_result', llmStatus: 'waiting',    arrow: 'tool_to_llm',       modal: null,            role: 'tool',      textKey: 3 },
  { actor: 'llm',  action: 'response',     tokens: 2220, segmentType: 'assistant',   llmStatus: 'responding', arrow: 'llm_to_user',       modal: null,            role: 'assistant', textKey: 4 },
  { actor: 'user', action: 'message',      tokens: 160,   segmentType: 'user',        llmStatus: 'idle',       arrow: 'user_to_llm',       modal: null,            role: 'user',      textKey: 5 },
  { actor: 'llm',  action: 'thinking',     tokens: 280,  segmentType: 'thinking',    llmStatus: 'thinking',   arrow: null,                modal: null,            role: 'thinking',  textKey: 6 },
  { actor: 'llm',  action: 'response',     tokens: 280,  segmentType: 'assistant',   llmStatus: 'responding', arrow: 'llm_to_user',       modal: null,            role: 'assistant', textKey: 7 },
  { actor: 'user', action: 'message',      tokens: 270,   segmentType: 'user',        llmStatus: 'idle',       arrow: 'user_to_llm',       modal: null,            role: 'user',      textKey: 8 },
  { actor: 'llm',  action: 'thinking',     tokens: 210,  segmentType: 'thinking',    llmStatus: 'thinking',   arrow: null,                modal: null,            role: 'thinking',  textKey: 9 },
  { actor: 'llm',  action: 'response',     tokens: 2200, segmentType: 'assistant',   llmStatus: 'responding', arrow: 'llm_to_user',       modal: null,            role: 'assistant', textKey: 10 },
  { actor: 'user', action: 'message',      tokens: 180,   segmentType: 'user',        llmStatus: 'idle',       arrow: 'user_to_llm',       modal: null,            role: 'user',      textKey: 11 },
  { actor: 'llm',  action: 'thinking',     tokens: 722, segmentType: 'thinking',    llmStatus: 'thinking',   arrow: null,                modal: null,            role: 'thinking',  textKey: 12 },
  { actor: 'llm',  action: 'context_full', tokens: 0,    segmentType: null,          llmStatus: 'full',       arrow: null,                modal: { type: 'context_full' }, role: 'system', textKey: 13 },
];

const FLOW2_SCHEMA = [
  { actor: 'user', action: 'message',   tokens: 190,  segmentType: 'user',      llmStatus: 'idle',     arrow: 'user_to_llm',       modal: null,                    role: 'user',    textKey: 0 },
  { actor: 'llm',  action: 'thinking',  tokens: 300,  segmentType: 'thinking',  llmStatus: 'thinking', arrow: null,                modal: null,                    role: 'thinking',textKey: 1 },
  { actor: 'llm',  action: 'tool_call', tokens: 95,   segmentType: 'tool_call', llmStatus: 'calling',  arrow: 'llm_to_tool',       modal: null,                    role: 'tool',    textKey: 2 },
  { actor: 'tool', action: 'overflow',  tokens: 7607, segmentType: 'overflow',  llmStatus: 'overflow', arrow: 'tool_to_llm_error', modal: { type: 'overflow' },    role: 'system',  textKey: 3 },
];

// Merge schema + strings into full step objects (called after T is loaded)
function buildSteps(schema, flowKey) {
  return schema.map(s => ({
    ...s,
    label:      T.flows[flowKey][s.textKey].label,
    transcript: { role: s.role, text: T.flows[flowKey][s.textKey].transcript },
  }));
}

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════
let currentFlow      = 1;
let steps            = [];
let currentStep      = -1;
let segments         = [];
let totalTokens      = 0;
let isPlaying        = false;
let playTimer        = null;
let awaitingModal    = false;
let currentStatusKey = 'idle';

// ═══════════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════════
const barContainer  = document.getElementById('barContainer');
const barPct        = document.getElementById('barPct');
const barTokens     = document.getElementById('barTokens');
const statusBadge   = document.getElementById('statusBadge');
const transcript    = document.getElementById('transcript');
const arrowLayer    = document.getElementById('arrowLayer');
const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const modalDesc     = document.getElementById('modalDesc');
const modalOptions  = document.getElementById('modalOptions');
const overflowSpill = document.getElementById('overflowSpill');
const stepIndicator = document.getElementById('stepIndicator');
const playBtn       = document.getElementById('playBtn');
const nextBtn       = document.getElementById('nextBtn');
const speedSlider   = document.getElementById('speedSlider');
const userCard      = document.getElementById('userCard');
const llmCard       = document.getElementById('llmCard');
const toolCard      = document.getElementById('toolCard');

// ═══════════════════════════════════════════════════════════════════
// APPLY STATIC UI STRINGS
// ═══════════════════════════════════════════════════════════════════
function applyUIStrings() {
  document.querySelector('header h1').textContent              = T.ui.title;
  document.getElementById('flow1Btn').textContent             = T.ui.flow1;
  document.getElementById('flow2Btn').textContent             = T.ui.flow2;
  document.getElementById('playBtn').title                    = T.ui.play_title;
  document.getElementById('nextBtn').title                    = T.ui.next_title;
  document.getElementById('resetBtn').title                   = T.ui.reset_title;
  document.getElementById('infoBtn').title                    = T.ui.info_btn_title;
  document.querySelector('.speed-wrap span').textContent      = T.ui.speed;
  document.querySelector('.transcript-header').textContent    = T.ui.conversation;
  document.querySelector('.bar-label').textContent            = T.ui.context_window;
  overflowSpill.textContent                                   = T.ui.overflow_spill;
  document.querySelector('#userCard .actor-label').textContent = T.actors.user;
  document.querySelector('#llmCard .actor-label').textContent  = T.actors.llm;
  document.querySelector('#toolCard .actor-label').textContent = T.actors.tool;
  document.getElementById('infoPanelTitle').textContent        = T.ui.info_panel_title;
  document.getElementById('infoPanelContent').innerHTML        = T.info.content;
}

// ═══════════════════════════════════════════════════════════════════
// LANGUAGE SWITCHING
// ═══════════════════════════════════════════════════════════════════
function toggleInfoPanel() {
  const panel       = document.getElementById('infoPanel');
  const handleRight = document.getElementById('resizeHandleRight');
  const btn         = document.getElementById('infoBtn');
  const hidden      = panel.classList.toggle('hidden');
  handleRight.classList.toggle('hidden', hidden);
  btn.classList.toggle('active', !hidden);
}

function toggleLangMenu() {
  const btn  = document.getElementById('langBtn');
  const menu = document.getElementById('langMenu');
  const open = menu.classList.toggle('open');
  btn.classList.toggle('open', open);
}

function switchLanguage(lang) {
  if (lang === LANG) { toggleLangMenu(); return; }
  LANG = lang;
  T = window[`STRINGS_${LANG.toUpperCase()}`];
  // Update button flag
  document.getElementById('langFlag').textContent = LANG === 'en' ? '🇺🇸' : '🇪🇸';
  // Update active state on options
  document.getElementById('langOptEN').classList.toggle('active', LANG === 'en');
  document.getElementById('langOptES').classList.toggle('active', LANG === 'es');
  // Close menu
  document.getElementById('langMenu').classList.remove('open');
  document.getElementById('langBtn').classList.remove('open');

  applyUIStrings();
  // Rebuild steps with new strings
  steps = currentFlow === 1
    ? buildSteps(FLOW1_SCHEMA, 'flow1')
    : buildSteps(FLOW2_SCHEMA, 'flow2');
  // Update step indicator
  if (currentStep < 0) {
    stepIndicator.textContent = T.ui.step_indicator_init.replace('{total}', steps.length);
  } else {
    stepIndicator.textContent = T.ui.step_indicator
      .replace('{current}', currentStep + 1)
      .replace('{total}', steps.length);
  }
  // Update status badge to translated text
  setStatus(currentStatusKey);
  // Update visible segment labels (displayed via CSS attr(data-label))
  segments.forEach(({ type, el }) => {
    el.dataset.label = T.segments[type] || type;
  });
  // Update token counter and overflow spill
  const pct = Math.round((totalTokens / TOTAL_TOKENS) * 100);
  barPct.textContent = pct + '%';
  barTokens.textContent = T.ui.token_counter
    .replace('{used}', totalTokens.toLocaleString())
    .replace('{total}', TOTAL_TOKENS.toLocaleString());
}

// Close lang menu when clicking outside
document.addEventListener('click', e => {
  const wrap = document.getElementById('langWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('langMenu').classList.remove('open');
    document.getElementById('langBtn').classList.remove('open');
  }
});

// ═══════════════════════════════════════════════════════════════════
// FLOW SELECTION
// ═══════════════════════════════════════════════════════════════════
function selectFlow(n) {
  currentFlow = n;
  steps = n === 1 ? buildSteps(FLOW1_SCHEMA, 'flow1') : buildSteps(FLOW2_SCHEMA, 'flow2');
  document.getElementById('flow1Btn').classList.toggle('active', n === 1);
  document.getElementById('flow2Btn').classList.toggle('active', n === 2);
  reset();
}

// ═══════════════════════════════════════════════════════════════════
// PLAY / PAUSE / RESET
// ═══════════════════════════════════════════════════════════════════
function togglePlay() {
  if (awaitingModal) return;
  isPlaying = !isPlaying;
  playBtn.textContent = isPlaying ? '⏸' : '▶';
  if (isPlaying) scheduleNext();
  else clearTimeout(playTimer);
}

function scheduleNext() {
  if (!isPlaying || awaitingModal) return;
  const delay = 3400 - parseInt(speedSlider.value);
  playTimer = setTimeout(() => { nextStep(); }, delay);
}

function nextStep() {
  if (awaitingModal) return false;
  if (currentStep + 1 >= steps.length) { stopPlay(); return false; }
  currentStep++;
  renderStep(steps[currentStep]);
  stepIndicator.textContent = T.ui.step_indicator
    .replace('{current}', currentStep + 1)
    .replace('{total}', steps.length);
  if (isPlaying && !awaitingModal) scheduleNext();
  return true;
}

function stopPlay() {
  isPlaying = false;
  playBtn.textContent = '▶';
  clearTimeout(playTimer);
}

function reset() {
  stopPlay();
  awaitingModal = false;
  currentStep   = -1;
  segments      = [];
  totalTokens   = 0;

  Array.from(barContainer.children).forEach(c => { if (c !== overflowSpill) c.remove(); });
  overflowSpill.classList.remove('show');
  barContainer.classList.remove('full', 'overflow-mode');

  barPct.textContent    = '0%';
  barPct.classList.remove('full');
  barTokens.textContent = T.ui.token_counter
    .replace('{used}', '0')
    .replace('{total}', TOTAL_TOKENS.toLocaleString());

  setStatus('idle');
  clearArrows();
  transcript.innerHTML = '';
  hideModal();
  stepIndicator.textContent = T.ui.step_indicator_init.replace('{total}', steps.length);
  setActorActive(null);
}

// ═══════════════════════════════════════════════════════════════════
// RENDER STEP
// ═══════════════════════════════════════════════════════════════════
function renderStep(step) {
  setActorActive(step.actor);
  setStatus(step.llmStatus);
  if (step.arrow) fireArrow(step.arrow);
  // Thinking tokens are ephemeral: drop them when the next user turn begins
  if (step.segmentType === 'user' && segments.length > 0) removeThinkingSegments();
  if (step.segmentType && step.tokens > 0) addSegment(step.segmentType, step.tokens);
  if (step.transcript) addTranscriptEntry(step.transcript);

  if (step.action === 'context_full') {
    barContainer.classList.add('full');
    barPct.classList.add('full');
  }
  if (step.action === 'overflow') {
    barContainer.classList.add('overflow-mode');
    overflowSpill.classList.add('show');
    barContainer.classList.add('full');
    barPct.classList.add('full');
  }
  if (step.modal) {
    awaitingModal = true;
    stopPlay();
    setTimeout(() => showModal(step.modal.type), 900);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BAR SEGMENTS
// ═══════════════════════════════════════════════════════════════════

// Thinking tokens are ephemeral — they are NOT included in subsequent turns.
// Call this when a new user turn begins to animate them out of the context bar.
function removeThinkingSegments(animate = true) {
  const thinkingSegs = segments.filter(s => s.type === 'thinking');
  if (thinkingSegs.length === 0) return;

  const removedTokens = thinkingSegs.reduce((sum, s) => sum + s.tokens, 0);
  segments = segments.filter(s => s.type !== 'thinking');
  totalTokens -= removedTokens;

  thinkingSegs.forEach(s => {
    if (animate) {
      s.el.style.transition = 'height 0.5s ease, opacity 0.5s ease';
      s.el.style.height  = '0';
      s.el.style.opacity = '0';
      setTimeout(() => s.el.remove(), 520);
    } else {
      s.el.remove();
    }
  });

  const pct = Math.round((totalTokens / TOTAL_TOKENS) * 100);
  barPct.textContent    = pct + '%';
  barTokens.textContent = T.ui.token_counter
    .replace('{used}',  totalTokens.toLocaleString())
    .replace('{total}', TOTAL_TOKENS.toLocaleString());
}

function addSegment(type, tokens) {
  totalTokens += tokens;
  const clampedTokens = Math.min(tokens, TOTAL_TOKENS - (totalTokens - tokens));
  const heightPx = Math.max(2, (clampedTokens / TOTAL_TOKENS) * BAR_HEIGHT_PX);

  const el = document.createElement('div');
  el.className     = `bar-segment seg-${type}`;
  el.dataset.label = T.segments[type] || type;
  barContainer.insertBefore(el, overflowSpill);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.height = heightPx + 'px';
    el.classList.add('visible');
  }));

  segments.push({ type, tokens, el });

  const pct = Math.min(100, Math.round((totalTokens / TOTAL_TOKENS) * 100));
  barPct.textContent    = pct + '%';
  barTokens.textContent = T.ui.token_counter
    .replace('{used}',  Math.min(totalTokens, TOTAL_TOKENS).toLocaleString())
    .replace('{total}', TOTAL_TOKENS.toLocaleString());
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════
const STATUS_CSS = {
  idle: '', thinking: 'thinking', calling: 'calling',
  waiting: 'waiting', responding: 'responding', full: 'full', overflow: 'overflow',
};

function setStatus(key) {
  currentStatusKey        = key;
  statusBadge.className   = 'status-badge ' + (STATUS_CSS[key] || '');
  statusBadge.textContent = T.status[key] || key;
}

// ═══════════════════════════════════════════════════════════════════
// ACTOR HIGHLIGHT
// ═══════════════════════════════════════════════════════════════════
function setActorActive(actor) {
  userCard.classList.toggle('active', actor === 'user');
  llmCard.classList.toggle('active',  actor === 'llm');
  toolCard.classList.toggle('active', actor === 'tool');
}

// ═══════════════════════════════════════════════════════════════════
// ARROWS
// ═══════════════════════════════════════════════════════════════════
function clearArrows() { arrowLayer.innerHTML = ''; }

function fireArrow(type) {
  clearArrows();
  const stage  = document.getElementById('stage');
  const stageR = stage.getBoundingClientRect();
  const off    = r => ({
    left:  r.left  - stageR.left,  right: r.right - stageR.left,
    midY:  r.top   - stageR.top + r.height / 2,
  });
  const U = off(userCard.getBoundingClientRect());
  const L = off(llmCard.getBoundingClientRect());
  const Tl = off(toolCard.getBoundingClientRect());

  const CONFIGS = {
    user_to_llm:       { x1: U.right, y1: U.midY, x2: L.left,  y2: L.midY,  color: '#3B82F6', dashed: true,  label: '' },
    llm_to_tool:       { x1: L.right, y1: L.midY, x2: Tl.left, y2: Tl.midY, color: '#F97316', dashed: true,  label: '' },
    tool_to_llm:       { x1: Tl.left, y1: Tl.midY,x2: L.right, y2: L.midY,  color: '#FB923C', dashed: false, label: '' },
    llm_to_user:       { x1: L.left,  y1: L.midY, x2: U.right, y2: U.midY,  color: '#22C55E', dashed: false, label: '' },
    tool_to_llm_error: { x1: Tl.left, y1: Tl.midY,x2: L.right, y2: L.midY,  color: '#EF4444', dashed: false, label: T.arrows.too_large },
  };

  const cfg = CONFIGS[type];
  if (cfg) drawArrow(cfg);
}

function drawArrow({ x1, y1, x2, y2, color, dashed, label }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  const markerId = 'arrowhead_' + Date.now();
  const defs     = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker   = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', markerId);
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', '0 0, 6 3, 0 6');
  poly.setAttribute('fill', color);
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2');
  line.setAttribute('marker-end', `url(#${markerId})`);
  if (dashed) line.setAttribute('stroke-dasharray', '6 4');

  const length = Math.hypot(x2 - x1, y2 - y1);
  line.style.strokeDasharray  = length;
  line.style.strokeDashoffset = length;
  line.style.transition       = 'stroke-dashoffset 0.4s ease';
  svg.appendChild(line);

  if (label) {
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', (x1 + x2) / 2);
    txt.setAttribute('y', (y1 + y2) / 2 - 8);
    txt.setAttribute('fill', color);
    txt.setAttribute('font-size', '11');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('font-family', 'monospace');
    txt.setAttribute('text-anchor', 'middle');
    txt.textContent = label;
    svg.appendChild(txt);
  }

  arrowLayer.appendChild(svg);
  requestAnimationFrame(() => requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; }));

  setTimeout(() => {
    svg.style.transition = 'opacity 0.4s';
    svg.style.opacity    = '0';
    setTimeout(() => svg.remove(), 400);
  }, 1200);
}

// ═══════════════════════════════════════════════════════════════════
// TRANSCRIPT
// ═══════════════════════════════════════════════════════════════════
function addTranscriptEntry({ role, text }) {
  const entry  = document.createElement('div');
  entry.className = 't-entry';

  const roleEl = document.createElement('div');
  roleEl.className   = `t-role ${role}`;
  roleEl.textContent = role.toUpperCase();

  const textEl = document.createElement('div');
  textEl.className   = 't-text';
  textEl.textContent = text;

  entry.appendChild(roleEl);
  entry.appendChild(textEl);
  transcript.appendChild(entry);
  requestAnimationFrame(() => requestAnimationFrame(() => { entry.classList.add('visible'); }));
  transcript.scrollTop = transcript.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════
function showModal(type) {
  const m = T.modals[type];
  modalOptions.innerHTML  = '';
  modalTitle.innerHTML    = m.title;
  modalDesc.textContent   = m.desc;

  const handlers = type === 'context_full'
    ? [ () => { hideModal(); doSummarize(); }, () => { hideModal(); doNewConversation(); } ]
    : [ () => { hideModal(); doTruncate(); },  () => { hideModal(); doRetrySmaller(); },  () => { hideModal(); doNewConversation(); } ];

  m.options.forEach((opt, i) => addModalOption(opt.title, opt.desc, handlers[i]));
  modalOverlay.classList.add('show');
}

function hideModal() { modalOverlay.classList.remove('show'); }

function addModalOption(title, desc, onClick) {
  const btn = document.createElement('button');
  btn.className = 'modal-option';
  btn.innerHTML = `<div class="modal-option-title">${title}</div><div class="modal-option-desc">${desc}</div>`;
  btn.onclick   = onClick;
  modalOptions.appendChild(btn);
}

// ═══════════════════════════════════════════════════════════════════
// MODAL RESOLUTION ANIMATIONS
// ═══════════════════════════════════════════════════════════════════
function doSummarize() {
  awaitingModal = false;
  const oldSegs = Array.from(barContainer.children).filter(c => c !== overflowSpill);
  oldSegs.forEach(el => { el.style.transition = 'height 0.5s ease, opacity 0.5s ease'; el.style.height = '0'; el.style.opacity = '0'; });

  setTimeout(() => {
    oldSegs.forEach(el => el.remove());
    segments = []; totalTokens = 0;
    barContainer.classList.remove('full', 'overflow-mode');
    barPct.classList.remove('full');
    addSegment('summary', Math.round(TOTAL_TOKENS * 0.15));
    setStatus('idle');
    setActorActive(null);
    addTranscriptEntry({ role: 'system', text: T.resolutions.summarize_done });
    setTimeout(() => {
      addTranscriptEntry({ role: 'user', text: T.resolutions.summarize_continue });
      setActorActive('user');
      fireArrow('user_to_llm');
      addSegment('user', 80);
    }, 1000);
  }, 600);
}

function doNewConversation() {
  awaitingModal = false;
  const segsToRemove = Array.from(barContainer.children).filter(c => c !== overflowSpill);
  segsToRemove.reverse().forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = 'height 0.35s ease';
      el.style.height = '0';
      setTimeout(() => el.remove(), 360);
    }, i * 60);
  });
  setTimeout(() => {
    addTranscriptEntry({ role: 'system', text: T.resolutions.new_conversation });
    reset();
    setTimeout(() => selectFlow(currentFlow), 400);
  }, segsToRemove.length * 60 + 500);
}

function doTruncate() {
  awaitingModal = false;
  barContainer.classList.remove('overflow-mode');
  overflowSpill.classList.remove('show');
  const lastSeg = segments[segments.length - 1];
  if (lastSeg?.el) { lastSeg.el.remove(); segments.pop(); totalTokens -= lastSeg.tokens; }
  addSegment('overflow', TOTAL_TOKENS - totalTokens);
  barContainer.classList.add('full');
  barPct.classList.add('full');
  setStatus('idle');
  setActorActive(null);
  addTranscriptEntry({ role: 'system', text: T.resolutions.truncate_done });
}

function doRetrySmaller() {
  awaitingModal = false;
  barContainer.classList.remove('overflow-mode', 'full');
  barPct.classList.remove('full');
  overflowSpill.classList.remove('show');

  const lastSeg = segments[segments.length - 1];
  if (lastSeg?.el) {
    lastSeg.el.style.transition = 'height 0.4s ease';
    lastSeg.el.style.height = '0';
    setTimeout(() => lastSeg.el.remove(), 420);
    segments.pop(); totalTokens -= lastSeg.tokens;
  }
  const toolCallSeg = segments[segments.length - 1];
  if (toolCallSeg?.type === 'tool_call' && toolCallSeg.el) {
    setTimeout(() => {
      toolCallSeg.el.style.transition = 'height 0.4s ease';
      toolCallSeg.el.style.height = '0';
      setTimeout(() => toolCallSeg.el.remove(), 420);
      segments.pop(); totalTokens -= toolCallSeg.tokens;
      // Also remove thinking — it's being re-done in the retry
      removeThinkingSegments();
    }, 200);
  }

  setTimeout(() => {
    barPct.textContent    = Math.round((totalTokens / TOTAL_TOKENS) * 100) + '%';
    barPct.classList.remove('full');
    barTokens.textContent = T.ui.token_counter
      .replace('{used}',  totalTokens.toLocaleString())
      .replace('{total}', TOTAL_TOKENS.toLocaleString());
    setStatus('thinking');
    addTranscriptEntry({ role: 'system',   text: T.resolutions.retry_system });
    addTranscriptEntry({ role: 'thinking', text: T.resolutions.retry_thinking });

    setTimeout(() => {
      setStatus('calling'); fireArrow('llm_to_tool'); addSegment('tool_call', 95);
      addTranscriptEntry({ role: 'tool', text: T.resolutions.retry_tool_call });

      setTimeout(() => {
        setStatus('waiting'); fireArrow('tool_to_llm'); addSegment('tool_result', 1800);
        addTranscriptEntry({ role: 'tool', text: T.resolutions.retry_tool_result });

        setTimeout(() => {
          setStatus('responding'); fireArrow('llm_to_user'); addSegment('assistant', 380);
          addTranscriptEntry({ role: 'assistant', text: T.resolutions.retry_response });
          setStatus('idle');
        }, 1400);
      }, 1400);
    }, 1000);
  }, 700);
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR RESIZE
// ═══════════════════════════════════════════════════════════════════
(function () {
  const handle  = document.getElementById('resizeHandle');
  const sidebar = document.getElementById('transcriptWrap');
  const MIN_W = 160, MAX_W = 520;
  let dragging = false, startX, startW;

  handle.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    sidebar.style.width = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = document.body.style.userSelect = '';
  });
})();

// ═══════════════════════════════════════════════════════════════════
// INFO PANEL RESIZE (right sidebar)
// ═══════════════════════════════════════════════════════════════════
(function () {
  const handle  = document.getElementById('resizeHandleRight');
  const sidebar = document.getElementById('infoPanel');
  const MIN_W = 160, MAX_W = 800;
  let dragging = false, startX, startW;

  handle.addEventListener('mousedown', e => {
    dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    // dragging left shrinks the panel, dragging right expands it
    sidebar.style.width = Math.min(MAX_W, Math.max(MIN_W, startW - (e.clientX - startX))) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = document.body.style.userSelect = '';
  });
})();

// ═══════════════════════════════════════════════════════════════════
// BOOT — strings loaded via <script> tag as window.STRINGS_{LANG}
// ═══════════════════════════════════════════════════════════════════
T = window[`STRINGS_${LANG.toUpperCase()}`];
applyUIStrings();
// Info panel is open by default — mark button active
document.getElementById('infoBtn').classList.add('active');
selectFlow(1);
