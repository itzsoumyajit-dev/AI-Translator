// Hub Renderer Logic
const els = {
  mainTitle: document.getElementById('main-title'),
  mainSubtitle: document.getElementById('main-subtitle'),
  stateScanning: document.getElementById('state-scanning'),
  stateSuccess: document.getElementById('state-success'),
  stateError: document.getElementById('state-error'),
  browserName: document.getElementById('browser-name'),
  btnLaunch: document.getElementById('btn-launch'),
  btnMin: document.getElementById('btn-min'),
  btnMax: document.getElementById('btn-max'),
  btnClose: document.getElementById('btn-close')
};

// Window Controls
els.btnMin.onclick = () => window.electronAPI.minimizeWindow();
els.btnMax.onclick = () => window.electronAPI.maximizeWindow();
els.btnClose.onclick = () => window.electronAPI.closeWindow();

// Initialize App
async function init() {
  console.log('Hub Initializing...');
  
  // Wait a bit to show scanning animation
  await new Promise(r => setTimeout(r, 1500));
  
  try {
    const result = await window.electronAPI.detectBrowser();
    console.log('Detection result:', result);
    
    if (result && result.detected) {
      showSuccess(result.name);
    } else {
      showError();
    }
  } catch (err) {
    console.error('Detection failed:', err);
    showError();
  }
}

function showSuccess(name) {
  els.stateScanning.style.display = 'none';
  els.stateSuccess.style.display = 'flex';
  els.stateError.style.display = 'none';
  
  els.mainTitle.textContent = 'System Ready';
  els.mainSubtitle.textContent = 'Standalone mode active. No browser needed.';
  els.browserName.textContent = 'Locally Configured';
}

function showError() {
  els.stateScanning.style.display = 'none';
  els.stateSuccess.style.display = 'none';
  els.stateError.style.display = 'flex';
  
  els.mainTitle.textContent = 'Software Initialized';
  els.mainSubtitle.textContent = 'Click below to start the local translation engine.';
}

// Launch Logic
els.btnLaunch.onclick = async () => {
  els.btnLaunch.disabled = true;
  els.btnLaunch.innerHTML = '<span>STARTING...</span>';
  
  await window.electronAPI.startApp();
};

// Start detection
init();
