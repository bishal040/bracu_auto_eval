document.addEventListener('DOMContentLoaded', () => {
  let selectedRating = 5;
  let selectedSpeed = 'normal';

  const activationScreen = document.getElementById('activationScreen');
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

  // ---- KEY VALIDATION (must match generate_key.js logic) ----
  function generateKey(studentId) {
    const SECRET = 'BRACU-BISHAL-X9K2M-2026';
    const input = `${SECRET}-${studentId}-AUTOEVAL`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    const n = Math.abs(hash);
    const seg1 = (n % 9000 + 1000).toString();
    const seg2 = ((n >> 8) % 9000 + 1000).toString();
    const seg3 = ((n >> 16) % 9000 + 1000).toString();
    const checksum = ((parseInt(seg1) + parseInt(seg2) + parseInt(seg3)) % 9000 + 1000).toString();
    return `AE-${seg1}-${seg2}-${seg3}-${checksum}`;
  }

  function validateKey(studentId, key) {
    return key.trim() === generateKey(studentId.trim());
  }

  // ---- Check if already activated ----
  chrome.storage.local.get('bracuLicense', (data) => {
    if (data.bracuLicense && data.bracuLicense.activated) {
      showMainScreen();
    } else {
      activationScreen.style.display = 'block';
      mainScreen.style.display = 'none';
    }
  });

  // ---- Activation ----
  document.getElementById('btnActivate').addEventListener('click', () => {
    const studentId = document.getElementById('studentId').value.trim();
    const key = document.getElementById('activationKey').value.trim();
    const errorEl = document.getElementById('activationError');

    if (!studentId) {
      errorEl.textContent = '❌ Please enter your Student ID.';
      errorEl.style.display = 'block';
      return;
    }
    if (!key) {
      errorEl.textContent = '❌ Please enter your activation key.';
      errorEl.style.display = 'block';
      return;
    }

    if (validateKey(studentId, key)) {
      // Lock activation to the currently logged-in BRACU account
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url || !tab.url.includes('courseevaluation.bracu.ac.bd')) {
          // Must be on the eval page to activate (so we can capture the account)
          errorEl.textContent = '❌ Open courseevaluation.bracu.ac.bd and LOG IN first, then activate.';
          errorEl.style.display = 'block';
          return;
        }

        // Get the logged-in user name from the page
        chrome.tabs.sendMessage(tab.id, { action: 'getLoggedInUser' }, (resp) => {
          const loggedInUser = resp && resp.user ? resp.user : '';

          if (!loggedInUser) {
            errorEl.textContent = '❌ Could not detect your BRACU account. Make sure you are logged in.';
            errorEl.style.display = 'block';
            return;
          }

          chrome.storage.local.set({
            bracuLicense: {
              activated: true,
              studentId,
              key,
              lockedUser: loggedInUser,  // Lock to this account!
              activatedAt: Date.now()
            }
          }, () => {
            errorEl.style.display = 'none';
            showMainScreen();
          });
        });
      });
    } else {
      errorEl.textContent = '❌ Invalid key. Contact the developer.';
      errorEl.style.display = 'block';
    }
  });

  // ---- Deactivate ----
  document.getElementById('btnDeactivate').addEventListener('click', () => {
    chrome.storage.local.remove('bracuLicense', () => {
      mainScreen.style.display = 'none';
      activationScreen.style.display = 'block';
    });
  });

  function showMainScreen() {
    activationScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    checkPageConnection();
  }

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
