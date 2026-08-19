document.addEventListener('DOMContentLoaded', () => {
  let selectedRating = 5;
  let selectedSpeed = 'normal';

  const mainScreen = document.getElementById('mainScreen');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const btnEvaluateAll = document.getElementById('btnEvaluateAll');
  const btnEvaluateCurrent = document.getElementById('btnEvaluateCurrent');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const progressCount = document.getElementById('progressCount');
  const progressDetail = document.getElementById('progressDetail');

  // ---- Page check ----
  function checkPageConnection() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.url && tab.url.includes('courseevaluation.bracu.ac.bd')) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected to BRACU Evaluation';
        btnEvaluateAll.disabled = false;
        btnEvaluateCurrent.disabled = false;
      } else {
        statusDot.classList.add('error');
        statusText.textContent = 'Open courseevaluation.bracu.ac.bd first';
        btnEvaluateAll.disabled = true;
        btnEvaluateCurrent.disabled = true;
      }
    });
  }

  checkPageConnection();

  // ---- Rating buttons ----
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRating = parseInt(btn.dataset.value);
    });
  });

  // ---- Speed buttons ----
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSpeed = btn.dataset.speed;
    });
  });

  // ---- Evaluate All ----
  btnEvaluateAll.addEventListener('click', () => {
    const speedMs = selectedSpeed === 'fast' ? 300 : selectedSpeed === 'normal' ? 600 : 1200;
    progressSection.style.display = 'block';
    progressLabel.textContent = 'Starting...';
    progressBar.style.width = '0%';
    btnEvaluateAll.disabled = true;
    btnEvaluateCurrent.disabled = true;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'evaluateAll', rating: selectedRating, speed: speedMs });
    });
  });

  // ---- Evaluate Current ----
  btnEvaluateCurrent.addEventListener('click', () => {
    const speedMs = selectedSpeed === 'fast' ? 300 : selectedSpeed === 'normal' ? 600 : 1200;
    progressSection.style.display = 'block';
    progressLabel.textContent = 'Working...';
    progressBar.style.width = '0%';
    btnEvaluateAll.disabled = true;
    btnEvaluateCurrent.disabled = true;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'evaluateCurrent', rating: selectedRating, speed: speedMs });
    });
  });

  // ---- Progress listener ----
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'progress') {
      progressSection.style.display = 'block';
      progressLabel.textContent = msg.label || 'Working...';
      progressCount.textContent = msg.count || '';
      progressBar.style.width = (msg.percent || 0) + '%';
      progressDetail.textContent = msg.detail || '';
    }
    if (msg.type === 'complete') {
      progressLabel.textContent = '✅ All done!';
      progressBar.style.width = '100%';
      progressDetail.textContent = msg.detail || '';
      progressCount.textContent = '';
      btnEvaluateAll.disabled = false;
      btnEvaluateCurrent.disabled = false;
    }
    if (msg.type === 'error') {
      progressLabel.textContent = '❌ Error';
      progressDetail.textContent = msg.detail || '';
      btnEvaluateAll.disabled = false;
      btnEvaluateCurrent.disabled = false;
    }
  });
});
