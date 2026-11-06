/**
 * LifeDash — script.js
 * CodingCamp Assignment · Vanilla JS · No Frameworks
 *
 * Challenges implemented:
 *   ✅ Custom name in greeting
 *   ✅ Prevent duplicate tasks
 *   ✅ Sort tasks
 */

'use strict';

/* ================================================================
   STORAGE HELPERS
   ================================================================ */
const Store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('localStorage error:', e); }
  },
};

/* ================================================================
   INJECT SVG GRADIENT DEFS
   ================================================================ */
(function injectSvgDefs() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <defs>
      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#8B00FF"/>
        <stop offset="100%" stop-color="#C026FF"/>
      </linearGradient>
      <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#8B00FF"/>
        <stop offset="100%" stop-color="#C026FF"/>
      </linearGradient>
      <linearGradient id="timerGradDone" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#FF4D6D"/>
        <stop offset="100%" stop-color="#FF8C00"/>
      </linearGradient>
    </defs>`;
  document.body.prepend(svg);
})();

/* ================================================================
   TOAST NOTIFICATIONS
   ================================================================ */
(function initToastContainer() {
  const el = document.createElement('div');
  el.className = 'toast-container';
  el.id = 'toastContainer';
  document.body.appendChild(el);
})();

function showToast(msg, type = 'info', ms = 3000) {
  const wrap  = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, ms);
}

/* ================================================================
   WEB AUDIO — LOOPING ALARM
   Chime repeats every 2.5 s until stopAlarm() is called.
   Re-armed automatically after reset or new duration set.
   ================================================================ */
let _audioCtx      = null;
let _alarmNodes    = [];    // scheduled nodes, cleared on stop
let _alarmInterval = null;  // repeating interval handle
let _alarmActive   = false; // guard: prevent double-start

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/** One chime sequence (arpeggio C5→E5→G5→C6 + sub-bass thud). ~1.1 s */
function _playChime() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Rising arpeggio
    [[523.25, 0], [659.25, 0.15], [783.99, 0.30], [1046.50, 0.45]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const t   = now + delay;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.015, t + 0.10);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.26, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
      _alarmNodes.push(osc, env);
    });

    // Sub-bass thud
    const sub    = ctx.createOscillator();
    const subEnv = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.28);
    subEnv.gain.setValueAtTime(0.32, now);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    sub.connect(subEnv);
    subEnv.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.38);
    _alarmNodes.push(sub, subEnv);
  } catch (err) { console.warn('Audio error:', err); }
}

/** Begin looping alarm — fires immediately, then every 2.5 s. */
function startAlarm() {
  if (_alarmActive) return;
  _alarmActive   = true;
  _playChime();
  _alarmInterval = setInterval(_playChime, 2500);
}

/**
 * Stop alarm immediately and reset state so it can fire again
 * the next time the timer reaches zero.
 */
function stopAlarm() {
  _alarmActive = false;
  clearInterval(_alarmInterval);
  _alarmInterval = null;
  _alarmNodes.forEach(node => {
    try { if (node.stop) node.stop(); node.disconnect(); } catch (_) {}
  });
  _alarmNodes = [];
}

/* ================================================================
   THEME  [Challenge — Light / Dark Mode]
   ================================================================ */
const htmlEl        = document.documentElement;
const themeBtn      = document.getElementById('themeToggleBtn');
const iconMoon      = document.getElementById('themeIconMoon');
const iconSun       = document.getElementById('themeIconSun');

let currentTheme = Store.get('theme', 'dark');

function applyTheme(t) {
  currentTheme = t;
  htmlEl.setAttribute('data-theme', t);
  iconMoon.classList.toggle('hidden', t === 'light');
  iconSun.classList.toggle('hidden',  t === 'dark');
  Store.set('theme', t);
}

themeBtn.addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

/* ================================================================
   GREETING + CLOCK  [Challenge — Custom Name]
   ================================================================ */
const headerDateEl    = document.getElementById('headerDate');
const greetingTimeEl  = document.getElementById('greetingTime');
const greetingHeadEl  = document.getElementById('greetingHeadline');
const greetingSubEl   = document.getElementById('greetingSub');
const greetingClockEl = document.getElementById('greetingClock');
const nameInput       = document.getElementById('nameInput');
const saveNameBtn     = document.getElementById('saveNameBtn');

let storedName = Store.get('userName', '');

const MOTIVATIONS = [
  'Let\'s make today count.',
  'One task at a time.',
  'Stay focused. Stay sharp.',
  'Progress, not perfection.',
  'You\'ve got this.',
];

function getGreeting(h) {
  if (h >= 5  && h < 12) return ['MORNING BRIEFING',  'Good Morning'];
  if (h >= 12 && h < 17) return ['AFTERNOON SESSION',  'Good Afternoon'];
  if (h >= 17 && h < 21) return ['EVENING WIND-DOWN',  'Good Evening'];
  return ['LATE NIGHT MODE', 'Good Night'];
}

function updateClock() {
  const now  = new Date();
  const h    = now.getHours();
  const [eyebrow, greeting] = getGreeting(h);

  // Header date
  headerDateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Greeting
  greetingTimeEl.textContent = eyebrow;
  greetingHeadEl.textContent = storedName ? `${greeting}, ${storedName}!` : `${greeting}!`;
  greetingSubEl.textContent  = MOTIVATIONS[now.getDay() % MOTIVATIONS.length];

  // Clock
  greetingClockEl.textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function initGreeting() {
  if (storedName) nameInput.value = storedName;
  updateClock();
  setInterval(updateClock, 1000);
}

saveNameBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { showToast('Please enter a name.', 'error'); return; }
  storedName = name;
  Store.set('userName', name);
  updateClock();
  showToast(`Welcome, ${name}! 👋`, 'success');
});

nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveNameBtn.click(); });

/* ================================================================
   TASKS
   [Challenge — Prevent Duplicate Tasks]
   [Challenge — Sort Tasks]
   ================================================================ */
const taskInputEl   = document.getElementById('taskInput');
const addTaskBtn    = document.getElementById('addTaskBtn');
const taskListEl    = document.getElementById('taskList');
const sortSelectEl  = document.getElementById('sortSelect');
const clearDoneBtn  = document.getElementById('clearDoneBtn');
const taskCountLbl  = document.getElementById('taskCountLabel');
const filterTabs    = document.querySelectorAll('.filter-tab');

let tasks       = Store.get('tasks', []);  // [{id, text, done, createdAt}]
let activeFilter = 'all';
let activeSort   = Store.get('taskSort', 'default');

function saveTasks() { Store.set('tasks', tasks); }

function getFilteredSortedTasks() {
  let list = [...tasks];

  // Filter
  if (activeFilter === 'active') list = list.filter(t => !t.done);
  if (activeFilter === 'done')   list = list.filter(t =>  t.done);

  // Sort [Challenge]
  switch (activeSort) {
    case 'asc':  list.sort((a,b) => a.text.localeCompare(b.text)); break;
    case 'desc': list.sort((a,b) => b.text.localeCompare(a.text)); break;
    case 'done': list.sort((a,b) => Number(a.done) - Number(b.done)); break;
  }
  return list;
}

function renderTasks() {
  taskListEl.innerHTML = '';
  const list = getFilteredSortedTasks();

  if (list.length === 0) {
    taskListEl.innerHTML = `
      <li class="task-empty">
        <span class="task-empty__icon">✦</span>
        <span>${activeFilter === 'all' ? 'No tasks yet — add one above!' : 'Nothing here.'}</span>
      </li>`;
    return;
  }

  list.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' task-item--done' : ''}`;
    li.dataset.id = task.id;

    // Checkbox
    const cbWrap = document.createElement('div');
    cbWrap.className = 'task-checkbox-wrap';
    const cb = document.createElement('input');
    cb.type      = 'checkbox';
    cb.checked   = task.done;
    cb.className = 'task-checkbox';
    cb.setAttribute('aria-label', `Mark "${task.text}" ${task.done ? 'undone' : 'done'}`);
    cb.addEventListener('change', () => toggleTask(task.id));
    cbWrap.appendChild(cb);

    // Text
    const span = document.createElement('span');
    span.className   = 'task-item__text';
    span.textContent = task.text;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'task-item__actions';

    const editBtn = document.createElement('button');
    editBtn.className   = 'task-item__edit-btn';
    editBtn.textContent = '✏';
    editBtn.setAttribute('aria-label', `Edit: ${task.text}`);
    editBtn.addEventListener('click', () => startEdit(li, task));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn--danger';
    delBtn.innerHTML = '✕';
    delBtn.setAttribute('aria-label', `Delete: ${task.text}`);
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(cbWrap);
    li.appendChild(span);
    li.appendChild(actions);
    taskListEl.appendChild(li);
  });

  updateFooter();
}

function updateFooter() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const left  = total - done;
  taskCountLbl.textContent = `${left} task${left !== 1 ? 's' : ''} left`;
  updateProgress(done, total);
}

function addTask() {
  const text = taskInputEl.value.trim();
  if (!text) { showToast('Please enter a task.', 'error'); return; }

  // [Challenge: Prevent Duplicate Tasks]
  if (tasks.some(t => t.text.toLowerCase() === text.toLowerCase())) {
    showToast('Task already exists!', 'error');
    taskInputEl.select();
    return;
  }

  tasks.push({ id: Date.now(), text, done: false, createdAt: Date.now() });
  saveTasks();
  renderTasks();
  taskInputEl.value = '';
  taskInputEl.focus();
  showToast('Task added ✔', 'success');
}

function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function startEdit(li, task) {
  const textSpan  = li.querySelector('.task-item__text');
  const actions   = li.querySelector('.task-item__actions');

  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.value     = task.text;
  editInput.className = 'input task-item__edit-input';
  editInput.maxLength = 120;
  editInput.setAttribute('aria-label', 'Edit task');
  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn--primary btn--xs';
  saveBtn.innerHTML = '✔';
  saveBtn.setAttribute('aria-label', 'Save');

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--ghost btn--xs';
  cancelBtn.innerHTML = '✕';
  cancelBtn.setAttribute('aria-label', 'Cancel');

  actions.innerHTML = '';
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);

  function commit() {
    const newText = editInput.value.trim();
    if (!newText) { showToast('Task cannot be empty.', 'error'); editInput.focus(); return; }
    if (tasks.some(t => t.id !== task.id && t.text.toLowerCase() === newText.toLowerCase())) {
      showToast('Another task with that name exists.', 'error');
      editInput.select();
      return;
    }
    tasks = tasks.map(t => t.id === task.id ? { ...t, text: newText } : t);
    saveTasks();
    renderTasks();
    showToast('Task updated.', 'success');
  }

  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', () => renderTasks());
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') renderTasks();
  });
}

function initTasks() {
  // Sort
  sortSelectEl.value = activeSort;
  sortSelectEl.addEventListener('change', () => {
    activeSort = sortSelectEl.value;
    Store.set('taskSort', activeSort);
    renderTasks();
  });

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      activeFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  // Add
  addTaskBtn.addEventListener('click', addTask);
  taskInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  // Clear done
  clearDoneBtn.addEventListener('click', () => {
    const count = tasks.filter(t => t.done).length;
    if (!count) { showToast('No completed tasks to clear.', 'info'); return; }
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    renderTasks();
    showToast(`${count} completed task${count !== 1 ? 's' : ''} cleared.`, 'info');
  });

  renderTasks();
}

/* ================================================================
   DAILY PROGRESS RING
   ================================================================ */
const progressRingFill = document.getElementById('progressRingFill');
const progressPctEl    = document.getElementById('progressPct');
const statDoneEl       = document.getElementById('statDone');
const statTotalEl      = document.getElementById('statTotal');
const statLeftEl       = document.getElementById('statLeft');

const PROGRESS_CIRC = 2 * Math.PI * 50; // 314.16

function updateProgress(done, total) {
  const pct    = total ? Math.round((done / total) * 100) : 0;
  const offset = PROGRESS_CIRC * (1 - pct / 100);

  progressRingFill.style.strokeDashoffset = offset;
  progressPctEl.textContent  = pct + '%';
  statDoneEl.textContent     = done;
  statTotalEl.textContent    = total;
  statLeftEl.textContent     = total - done;
}

/* ================================================================
   FOCUS TIMER
   ================================================================ */
const timerDisplayEl  = document.getElementById('timerDisplay');
const timerStatusEl   = document.getElementById('timerStatus');
const timerRingFillEl = document.getElementById('timerRingFill');
const timerStartBtn   = document.getElementById('timerStartBtn');
const timerStopBtn    = document.getElementById('timerStopBtn');
const timerResetBtn   = document.getElementById('timerResetBtn');
const timerMinInput   = document.getElementById('timerMinInput');
const applyTimerBtn   = document.getElementById('applyTimerBtn');
const timerCard       = document.querySelector('.timer-card');
const timerAlertEl    = document.getElementById('timerAlert');

// Modal elements (already in HTML)
const timerDoneModal   = document.getElementById('timerDoneModal');
const modalDismissBtn  = document.getElementById('modalDismissBtn');
const modalSessionTime = document.getElementById('modalSessionTime');

const TIMER_CIRC         = 2 * Math.PI * 70; // 439.82 px  (r = 70)
const DEFAULT_DURATION   = 25;               // always reset to 25 min on page load

// timerDuration: user can change per-session via "Set" button,
// but on every page refresh it goes back to 25 (DEFAULT_DURATION).
let timerDuration = DEFAULT_DURATION;
let timerTotal    = DEFAULT_DURATION * 60;   // seconds
let timeLeft      = timerTotal;
let timerInterval = null;
let timerRunning  = false;

function fmt(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function renderTimer() {
  timerDisplayEl.textContent = fmt(timeLeft);
  const pct    = timerTotal ? timeLeft / timerTotal : 1;
  const offset = TIMER_CIRC * (1 - pct);
  timerRingFillEl.style.strokeDashoffset = offset;
  document.title = timerRunning ? `${fmt(timeLeft)} · LifeDash` : 'LifeDash — Focus Dashboard';
}

function setTimerRunning(running) {
  timerRunning = running;
  timerStartBtn.disabled = running;
  timerStopBtn.disabled  = !running;
  timerCard.classList.toggle('timer--running', running);
}

/* ---------- MODAL ---------- */
function openTimerModal() {
  // Update badge with session duration
  modalSessionTime.textContent = `✔ ${timerDuration} min focus session`;

  // Inject sound-wave bars once
  if (!timerDoneModal.querySelector('.modal-sound-indicator')) {
    const wave = document.createElement('div');
    wave.className = 'modal-sound-indicator';
    wave.setAttribute('aria-hidden', 'true');
    wave.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
    modalDismissBtn.insertAdjacentElement('beforebegin', wave);
  }

  timerDoneModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modalDismissBtn.focus();
}

function closeTimerModal() {
  stopAlarm();                          // ← kills sound immediately
  timerDoneModal.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ---------- TIMER LOGIC ---------- */
function startTimer() {
  if (timerRunning) return;
  // Unlock AudioContext on first user gesture
  try { getAudioCtx().resume(); } catch (_) {}

  if (timeLeft <= 0) timeLeft = timerTotal; // restart if fully elapsed
  timerCard.classList.remove('timer--done');
  timerStatusEl.textContent = 'RUNNING';
  setTimerRunning(true);

  timerInterval = setInterval(() => {
    timeLeft--;
    renderTimer();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      setTimerRunning(false);
      timerCard.classList.add('timer--done');
      timerStatusEl.textContent = 'COMPLETE';

      // 1. Start looping alarm sound
      startAlarm();

      // 2. Purple flash overlay
      const flash = document.createElement('div');
      flash.className = 'flash-overlay';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 900);

      // 3. Open persistent modal (alarm keeps looping until dismissed)
      openTimerModal();

      // 4. Screen-reader announcement
      timerAlertEl.textContent = 'Focus session complete! Dismiss the notification to stop the alarm.';
      setTimeout(() => { timerAlertEl.textContent = ''; }, 300);
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  setTimerRunning(false);
  timerStatusEl.textContent = 'PAUSED';
}

/**
 * Reset: stop countdown, close modal + alarm if open, restore to full duration.
 * This re-arms the alarm so the NEXT completed session will trigger it again.
 */
function resetTimer() {
  clearInterval(timerInterval);
  setTimerRunning(false);
  timerCard.classList.remove('timer--done');

  // Close modal & stop alarm if a session just finished
  if (!timerDoneModal.classList.contains('hidden')) {
    closeTimerModal();
  } else {
    stopAlarm(); // safety clean-up in case alarm is active without modal
  }

  timeLeft = timerTotal;
  timerStatusEl.textContent = 'READY';
  renderTimer();
}

timerStartBtn.addEventListener('click', startTimer);
timerStopBtn.addEventListener('click',  pauseTimer);
timerResetBtn.addEventListener('click', resetTimer);

/* Dismiss button: stop alarm, close modal */
modalDismissBtn.addEventListener('click', () => {
  closeTimerModal();
  showToast('🎉 Session dismissed. Great focus!', 'success', 4000);
});

/* Click outside modal box → also dismiss */
timerDoneModal.addEventListener('click', e => {
  if (e.target === timerDoneModal) {
    closeTimerModal();
  }
});

/* Escape key dismisses */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !timerDoneModal.classList.contains('hidden')) {
    closeTimerModal();
  }
});

/**
 * "Set" button: change duration, reset everything.
 * After this, the NEXT completed session fires alarm + modal fresh.
 */
applyTimerBtn.addEventListener('click', () => {
  const mins = parseInt(timerMinInput.value, 10);
  if (isNaN(mins) || mins < 1 || mins > 99) {
    showToast('Enter a value between 1 and 99.', 'error');
    return;
  }

  // Stop any running/completed state cleanly
  clearInterval(timerInterval);
  setTimerRunning(false);
  timerCard.classList.remove('timer--done');

  // Close modal & alarm if currently showing
  if (!timerDoneModal.classList.contains('hidden')) {
    closeTimerModal();
  } else {
    stopAlarm();
  }

  // Apply new duration (session-only, not persisted)
  timerDuration = mins;
  timerTotal    = mins * 60;
  timeLeft      = timerTotal;

  timerStatusEl.textContent = 'READY';
  renderTimer();
  showToast(`Timer set to ${mins} min. Ready to go!`, 'success');
});

function initTimer() {
  timerMinInput.value                    = DEFAULT_DURATION;
  timerTotal                             = DEFAULT_DURATION * 60;
  timeLeft                               = timerTotal;
  timerRingFillEl.style.strokeDasharray  = TIMER_CIRC;
  timerRingFillEl.style.strokeDashoffset = 0;
  renderTimer();
}

/* ================================================================
   QUICK LINKS
   ================================================================ */
const linkNameInputEl = document.getElementById('linkNameInput');
const linkUrlInputEl  = document.getElementById('linkUrlInput');
const addLinkBtn      = document.getElementById('addLinkBtn');
const linksListEl     = document.getElementById('linksList');

let links = Store.get('quickLinks', []); // [{id, name, url}]

function saveLinks() { Store.set('quickLinks', links); }

function getFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=16`; }
  catch { return null; }
}

function renderLinks() {
  linksListEl.innerHTML = '';

  if (!links.length) {
    linksListEl.innerHTML = '<p class="links-empty">No links saved yet.</p>';
    return;
  }

  links.forEach(link => {
    const wrap = document.createElement('div');
    wrap.className = 'link-chip-wrap';

    const a = document.createElement('a');
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'link-chip';

    const fav = getFavicon(link.url);
    if (fav) {
      const img = document.createElement('img');
      img.src   = fav;
      img.alt   = '';
      img.onerror = () => img.remove();
      a.appendChild(img);
    }
    a.appendChild(document.createTextNode(link.name));

    const del = document.createElement('button');
    del.className = 'link-chip-del';
    del.innerHTML = '&times;';
    del.setAttribute('aria-label', `Remove ${link.name}`);
    del.addEventListener('click', () => {
      links = links.filter(l => l.id !== link.id);
      saveLinks();
      renderLinks();
      showToast(`"${link.name}" removed.`, 'info');
    });

    wrap.appendChild(a);
    wrap.appendChild(del);
    linksListEl.appendChild(wrap);
  });
}

function addLink() {
  const name = linkNameInputEl.value.trim();
  const url  = linkUrlInputEl.value.trim();

  if (!name) { showToast('Enter a label.', 'error'); linkNameInputEl.focus(); return; }
  if (!url)  { showToast('Enter a URL.',   'error'); linkUrlInputEl.focus();  return; }

  let finalUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  try { new URL(finalUrl); }
  catch { showToast('Invalid URL.', 'error'); linkUrlInputEl.focus(); return; }

  links.push({ id: Date.now(), name, url: finalUrl });
  saveLinks();
  renderLinks();
  linkNameInputEl.value = '';
  linkUrlInputEl.value  = '';
  linkNameInputEl.focus();
  showToast(`"${name}" added!`, 'success');
}

function initLinks() {
  addLinkBtn.addEventListener('click', addLink);
  linkUrlInputEl.addEventListener('keydown',  e => { if (e.key === 'Enter') addLink(); });
  linkNameInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') linkUrlInputEl.focus(); });
  renderLinks();
}

/* ================================================================
   BOOTSTRAP
   ================================================================ */
function init() {
  applyTheme(currentTheme);
  initGreeting();
  initTimer();
  initTasks();
  initLinks();

  // Seed progress with loaded data
  const done  = tasks.filter(t => t.done).length;
  updateProgress(done, tasks.length);
}

document.addEventListener('DOMContentLoaded', init);
