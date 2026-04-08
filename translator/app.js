// ========================================
// AI Translator — Frontend Application
// State-machine driven translator UI
// ========================================

(function () {
  'use strict';

  // ===== State =====
  const state = {
    phase: 'idle', // idle | selecting | translating | results | error
    languages: [],
    fromLang: '',
    toLang: '',
    inputText: '',
    translatedText: '',
    originalText: '',
    match: 0,
    fromName: '',
    toName: '',
    history: [],
    lastError: null,
  };

  // Load history from localStorage
  try {
    const saved = localStorage.getItem('translator-history');
    if (saved) {
      state.history = JSON.parse(saved);
    }
  } catch (e) {
    // Ignore
  }

  // ===== Elements =====
  const els = {
    bgCanvas: document.getElementById('bg-canvas'),
    appContainer: document.getElementById('app-container'),
    connectionBadge: document.getElementById('connection-badge'),
    // Window controls
    winMin: document.getElementById('win-min'),
    winMax: document.getElementById('win-max'),
    winClose: document.getElementById('win-close'),
    themeToggle: document.getElementById('theme-toggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    // Config panel
    panelConfig: document.getElementById('panel-config'),
    langFrom: document.getElementById('lang-from'),
    langTo: document.getElementById('lang-to'),
    swapBtn: document.getElementById('swap-btn'),
    inputText: document.getElementById('input-text'),
    charCount: document.getElementById('char-count'),
    clearBtn: document.getElementById('clear-btn'),
    translateBtn: document.getElementById('translate-btn'),
    btnLoader: document.getElementById('btn-loader'),
    // Results panel
    panelResults: document.getElementById('panel-results'),
    resultMeta: document.getElementById('result-meta'),
    resultFromLang: document.getElementById('result-from-lang'),
    resultToLang: document.getElementById('result-to-lang'),
    resultOriginal: document.getElementById('result-original'),
    resultTranslated: document.getElementById('result-translated'),
    matchFill: document.getElementById('match-fill'),
    matchValue: document.getElementById('match-value'),
    copyOriginal: document.getElementById('copy-original'),
    copyTranslated: document.getElementById('copy-translated'),
    speakTranslated: document.getElementById('speak-translated'),
    redirectBtn: document.getElementById('redirect-btn'),
    editBtn: document.getElementById('edit-btn'),
    // History
    historyCard: document.getElementById('history-card'),
    historyList: document.getElementById('history-list'),
    clearHistory: document.getElementById('clear-history'),
    // Error
    panelError: document.getElementById('panel-error'),
    errorTitle: document.getElementById('error-title'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    backBtn: document.getElementById('back-btn'),
    // Step indicator
    stepIndicator: document.getElementById('step-indicator'),
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
  };

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initBackground();
    initApp();
    bindEvents();
  });

  // ===== App Initialization =====
  async function initApp() {
    els.appContainer.style.display = 'block';
    els.appContainer.style.opacity = '0';
    
    // Smooth fade in
    setTimeout(() => {
      els.appContainer.style.transition = 'opacity 0.6s var(--ease-out)';
      els.appContainer.style.opacity = '1';
    }, 100);

    await loadLanguages();
    showPanel('config');
  }

  // ===== Theme Management =====
  function initTheme() {
    const savedTheme = localStorage.getItem('translator-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(theme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('translator-theme', theme);
    
    if (theme === 'light') {
      els.sunIcon.style.display = 'none';
      els.moonIcon.style.display = 'block';
    } else {
      els.sunIcon.style.display = 'block';
      els.moonIcon.style.display = 'none';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // ===== Load Languages =====
  async function loadLanguages() {
    try {
      const result = await window.electronAPI.getLanguages();

      if (result.success && result.languages) {
        state.languages = result.languages;
        populateSelects();
      }
    } catch (err) {
      showToast('Failed to load languages');
    }
  }

  function populateSelects() {
    const makeOptions = (select) => {
      // Keep the placeholder
      select.innerHTML = '<option value="" disabled selected>Select language...</option>';

      state.languages.forEach((lang) => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = `${lang.flag} ${lang.name} — ${lang.native}`;
        select.appendChild(opt);
      });
    };

    makeOptions(els.langFrom);
    makeOptions(els.langTo);

    // Restore previous selections
    if (state.fromLang) els.langFrom.value = state.fromLang;
    if (state.toLang) els.langTo.value = state.toLang;
  }

  // ===== Event Bindings =====
  function bindEvents() {
    // Window controls
    els.winMin.addEventListener('click', () => window.electronAPI.minimizeWindow());
    els.winMax.addEventListener('click', () => window.electronAPI.maximizeWindow());
    els.winClose.addEventListener('click', () => window.electronAPI.closeWindow());
    els.themeToggle.addEventListener('click', toggleTheme);

    // Language selectors
    els.langFrom.addEventListener('change', () => {
      state.fromLang = els.langFrom.value;
      validateForm();
    });

    els.langTo.addEventListener('change', () => {
      state.toLang = els.langTo.value;
      validateForm();
    });

    // Swap languages
    els.swapBtn.addEventListener('click', () => {
      const temp = els.langFrom.value;
      els.langFrom.value = els.langTo.value;
      els.langTo.value = temp;
      state.fromLang = els.langFrom.value;
      state.toLang = els.langTo.value;
      validateForm();
    });

    // Text input
    els.inputText.addEventListener('input', () => {
      state.inputText = els.inputText.value;
      els.charCount.textContent = state.inputText.length;
      validateForm();
    });

    // Clear button
    els.clearBtn.addEventListener('click', () => {
      els.inputText.value = '';
      state.inputText = '';
      els.charCount.textContent = '0';
      validateForm();
      els.inputText.focus();
    });

    // Translate button
    els.translateBtn.addEventListener('click', handleTranslate);

    // Keyboard shortcut
    els.inputText.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!els.translateBtn.disabled) {
          handleTranslate();
        }
      }
    });

    // Results actions
    els.copyOriginal.addEventListener('click', () => copyText(state.originalText, els.copyOriginal));
    els.copyTranslated.addEventListener('click', () => copyText(state.translatedText, els.copyTranslated));
    els.speakTranslated.addEventListener('click', () => speakText(state.translatedText, state.toLang));

    // Redirect / New Translation
    els.redirectBtn.addEventListener('click', () => {
      state.inputText = '';
      state.fromLang = '';
      state.toLang = '';
      els.inputText.value = '';
      els.langFrom.value = '';
      els.langTo.value = '';
      els.charCount.textContent = '0';
      showPanel('config');
    });

    // Edit & Retry
    els.editBtn.addEventListener('click', () => {
      showPanel('config');
    });

    // Error retry
    els.retryBtn.addEventListener('click', handleTranslate);
    els.backBtn.addEventListener('click', () => showPanel('config'));

    // History
    els.clearHistory.addEventListener('click', () => {
      state.history = [];
      saveHistory();
      renderHistory();
    });
  }


  // ===== Validate Form =====
  function validateForm() {
    const valid = state.fromLang && state.toLang && state.inputText.trim().length > 0;
    els.translateBtn.disabled = !valid;
  }

  // ===== Translate =====
  async function handleTranslate() {
    if (!state.fromLang || !state.toLang || !state.inputText.trim()) return;

    state.phase = 'translating';
    updateSteps(2);

    // Show loading
    els.translateBtn.disabled = true;
    els.btnLoader.style.display = 'flex';
    const btnText = els.translateBtn.querySelector('span');
    btnText.textContent = 'Translating...';

    try {
      const data = await window.electronAPI.translate({
        text: state.inputText.trim(),
        from: state.fromLang,
        to: state.toLang,
      });

      if (!data.success) {
        throw new Error(data.error || 'Translation failed');
      }

      // Success
      state.translatedText = data.translatedText;
      state.originalText = data.originalText;
      state.match = data.match || 0;
      state.fromName = data.from.name;
      state.toName = data.to.name;
      state.phase = 'results';

      // Add to history
      addToHistory({
        from: state.fromLang,
        to: state.toLang,
        fromName: state.fromName,
        toName: state.toName,
        original: state.originalText.substring(0, 100),
        translated: state.translatedText.substring(0, 100),
        timestamp: Date.now(),
      });

      showResults();
    } catch (err) {
      state.phase = 'error';
      state.lastError = err.message;
      showError(err.message);
    } finally {
      els.btnLoader.style.display = 'none';
      btnText.textContent = 'Translate';
      els.translateBtn.disabled = false;
    }
  }

  // ===== Show Panels =====
  function showPanel(panel) {
    els.panelConfig.style.display = 'none';
    els.panelResults.style.display = 'none';
    els.panelError.style.display = 'none';

    if (panel === 'config') {
      els.panelConfig.style.display = 'block';
      els.panelConfig.style.animation = 'none';
      void els.panelConfig.offsetHeight; // trigger reflow
      els.panelConfig.style.animation = 'panel-enter 0.4s var(--ease-out)';
      updateSteps(1);
      validateForm();
    } else if (panel === 'results') {
      els.panelResults.style.display = 'block';
      els.panelResults.style.animation = 'none';
      void els.panelResults.offsetHeight;
      els.panelResults.style.animation = 'panel-enter 0.4s var(--ease-out)';
      updateSteps(3);
    } else if (panel === 'error') {
      els.panelError.style.display = 'block';
      els.panelError.style.animation = 'none';
      void els.panelError.offsetHeight;
      els.panelError.style.animation = 'panel-enter 0.4s var(--ease-out)';
    }
  }

  function updateSteps(current) {
    const steps = els.stepIndicator.querySelectorAll('.step');
    steps.forEach((step) => {
      const num = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed');
      if (num < current) step.classList.add('completed');
      else if (num === current) step.classList.add('active');
    });
  }

  // ===== Show Results =====
  function showResults() {
    els.resultFromLang.textContent = state.fromName;
    els.resultToLang.textContent = state.toName;
    els.resultOriginal.textContent = state.originalText;
    els.resultTranslated.textContent = state.translatedText;

    // Match bar animation
    const matchPct = Math.round(state.match * 100);
    els.matchValue.textContent = `${matchPct}%`;
    setTimeout(() => {
      els.matchFill.style.width = `${matchPct}%`;
    }, 200);

    // Meta info
    const now = new Date();
    els.resultMeta.textContent = `${now.toLocaleTimeString()} • ${state.originalText.length} chars`;

    showPanel('results');
    renderHistory();

    // Scroll to results
    setTimeout(() => {
      els.panelResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  // ===== Show Error =====
  function showError(message) {
    els.errorTitle.textContent = 'Translation Failed';
    els.errorMessage.textContent = message || 'Something went wrong. Please try again.';
    showPanel('error');
  }

  // ===== Copy =====
  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      showToast('Copied to clipboard');
      setTimeout(() => btn.classList.remove('copied'), 2000);
    } catch {
      showToast('Failed to copy');
    }
  }

  // ===== Text to Speech =====
  function speakText(text, langCode) {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);

    showToast('Playing audio...');
  }

  // ===== History =====
  function addToHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > 10) {
      state.history = state.history.slice(0, 10);
    }
    saveHistory();
  }

  function saveHistory() {
    try {
      localStorage.setItem('translator-history', JSON.stringify(state.history));
    } catch (e) {
      // Ignore
    }
  }

  function renderHistory() {
    if (state.history.length === 0) {
      els.historyCard.style.display = 'none';
      return;
    }

    els.historyCard.style.display = 'block';
    els.historyList.innerHTML = '';

    state.history.forEach((entry, idx) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Translation from ${entry.fromName} to ${entry.toName}`);
      item.innerHTML = `
        <span class="history-item-pair">${entry.from}→${entry.to}</span>
        <span class="history-item-text">${escapeHtml(entry.original)}</span>
        <span class="history-item-arrow">→</span>
        <span class="history-item-result">${escapeHtml(entry.translated)}</span>
      `;

      item.addEventListener('click', () => {
        // Load this translation into the form
        state.fromLang = entry.from;
        state.toLang = entry.to;
        els.langFrom.value = entry.from;
        els.langTo.value = entry.to;
        els.inputText.value = entry.original;
        state.inputText = entry.original;
        els.charCount.textContent = entry.original.length;
        showPanel('config');
        validateForm();
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });

      els.historyList.appendChild(item);
    });
  }

  // ===== Toast =====
  function showToast(message) {
    els.toastMessage.textContent = message;
    els.toast.classList.add('show');
    setTimeout(() => {
      els.toast.classList.remove('show');
    }, 2500);
  }

  // ===== Utilities =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Animated Background =====
  function initBackground() {
    const canvas = els.bgCanvas;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: -999, y: -999 };

    function resize() {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.3 + 0.05;
        this.hue = 230 + Math.random() * 80;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Mouse interaction
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          this.x += (dx / dist) * force * 0.5;
          this.y += (dy / dist) * force * 0.5;
        }

        // Wrap around
        if (this.x < -10) this.x = window.innerWidth + 10;
        if (this.x > window.innerWidth + 10) this.x = -10;
        if (this.y < -10) this.y = window.innerHeight + 10;
        if (this.y > window.innerHeight + 10) this.y = -10;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 60%, 65%, ${this.opacity})`;
        ctx.fill();
      }
    }

    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 15000));
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(250, 50%, 60%, ${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      drawConnections();
      requestAnimationFrame(animate);
    }

    animate();
  }
})();
