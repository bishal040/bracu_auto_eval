// BRACU Auto Evaluator v7 — Account-locked activation
(function () {
  'use strict';

  // ---- Get the logged-in user's name from the page ----
  function getLoggedInUser() {
    // The sidebar shows the user name like "Shiham Mahdin..."
    const userLink = document.querySelector('.nav-link.dropdown-toggle.text-truncate');
    if (userLink) return userLink.textContent.trim();
    // Fallback: look for any truncated name in sidebar
    const spans = document.querySelectorAll('.text-truncate');
    for (const s of spans) {
      const t = s.textContent.trim();
      if (t.length > 3 && !t.includes('Home') && !t.includes('Course')) return t;
    }
    return '';
  }

  // ---- LICENSE CHECK — verifies key AND logged-in account ----
  function checkLicense() {
    return new Promise(resolve => {
      chrome.storage.local.get('bracuLicense', d => {
        const lic = d.bracuLicense;
        if (!lic || !lic.activated) return resolve(false);

        // Check that the current logged-in user matches who activated
        const currentUser = getLoggedInUser();
        if (!currentUser) return resolve(true); // Can't detect user (not on dashboard), allow
        if (lic.lockedUser && currentUser !== lic.lockedUser) {
          console.log('[BRACU AE] Account mismatch! Expected:', lic.lockedUser, 'Got:', currentUser);
          return resolve(false);
        }
        resolve(true);
      });
    });
  }

  const DELAY = { short: 400, med: 800, long: 1500 };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function sendMsg(d) { try { chrome.runtime.sendMessage(d); } catch(e){} }
  function sendProgress(l,c,p,d) { sendMsg({type:'progress',label:l,count:c,percent:p,detail:d}); }
  function sendComplete(d) { sendMsg({type:'complete',detail:d}); }
  function sendError(d) { sendMsg({type:'error',detail:d}); }

  function bg(action, extra={}) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({action, ...extra}, r => resolve(r||{}));
    });
  }

  function getState() {
    return new Promise(r => chrome.storage.local.get('bracuAE', d => r(d.bracuAE || null)));
  }
  function setState(state) {
    return new Promise(r => chrome.storage.local.set({bracuAE: state}, r));
  }
  function clearState() {
    return new Promise(r => chrome.storage.local.remove('bracuAE', r));
  }

  function isFormVisible() { return document.querySelectorAll('.rating-label-box').length > 0; }
  function hasSweetAlert() { return !!(document.querySelector('.swal2-container, .swal-overlay, .swal2-popup')); }

  function hasNextBtn() {
    const b = document.querySelector('#nextstep');
    if (b && b.offsetParent !== null && b.textContent.trim().toLowerCase() === 'next') return true;
    for (const btn of document.querySelectorAll('button'))
      if (btn.textContent.trim() === 'Next' && btn.offsetParent !== null) return true;
    return false;
  }

  function hasSubmitBtn() {
    const b = document.querySelector('#nextstep');
    if (b && b.offsetParent !== null) {
      const t = b.textContent.trim().toLowerCase();
      if (t === 'submit' || t.includes('submit') || t === 'finish') return true;
    }
    for (const btn of document.querySelectorAll('button')) {
      const t = btn.textContent.trim().toLowerCase();
      if ((t === 'submit' || t === 'finish') && btn.offsetParent !== null) return true;
    }
    return false;
  }

  function countEvalButtons() {
    let c = 0;
    for (const b of document.querySelectorAll('button'))
      if (b.textContent.trim() === 'Evaluate' && b.offsetParent !== null) c++;
    return c;
  }

  function getCourseName() {
    const rows = document.querySelectorAll('tr');
    for (const row of rows) {
      const btn = row.querySelector('button');
      if (btn && btn.textContent.trim() === 'Evaluate') {
        const cells = row.querySelectorAll('td');
        return cells.length >= 2 ? cells[1].textContent.trim().substring(0,40) : 'Course';
      }
    }
    return 'Course';
  }

  function getQuestionText() {
    for (const el of document.querySelectorAll('div, p, span, h5, h6, strong, b')) {
      const t = el.textContent.trim();
      if (t.startsWith('The ') && t.length > 25 && t.length < 250) return t;
    }
    return '';
  }

  async function doOneEval(rating, speed) {
    let step = 0;
    while (step < 35) {
      step++;
      if (!isFormVisible()) return true;

      const qBefore = getQuestionText();

      await bg('clickRating', { rating });
      await sleep(Math.max(speed, 800));

      const labels = document.querySelectorAll('.rating-label-box');
      const idx = rating - 1;
      if (labels[idx]) {
        labels[idx].click();
        if (labels[idx].parentElement) labels[idx].parentElement.click();
      }
      await sleep(DELAY.short);

      if (hasSubmitBtn()) {
        await bg('clickSubmit');
        await sleep(speed + 500);
        if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(500); }
        if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(500); }
        return true;
      }

      if (hasNextBtn()) {
        await bg('clickNext');
        await sleep(DELAY.short);

        if (hasSweetAlert()) {
          await bg('dismissAlert');
          await sleep(600);
          await bg('clickRating', { rating });
          await sleep(1200);
          await bg('clickNext');
          await sleep(DELAY.short);
          if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(500); }
        }

        let w = 0;
        while (w < 3000) {
          if (getQuestionText() !== qBefore) break;
          await sleep(200); w += 200;
        }
        await sleep(DELAY.short);
      } else {
        await sleep(1000);
        if (!isFormVisible()) return true;
      }
    }
    return true;
  }

  async function processNextCourse() {
    const state = await getState();
    if (!state || !state.running) return;

    const remaining = countEvalButtons();
    if (remaining === 0) {
      sendComplete(`All ${state.completed} evaluation(s) done! 🎉`);
      await clearState();
      return;
    }

    const name = getCourseName();
    const current = state.completed + 1;
    const total = state.total;

    sendProgress(`📝 ${name}`, `${current}/${total}`, Math.round(((current-1)/total)*100), 'Opening form...');
    await bg('clickEvaluate', { index: 0 });

    let w = 0;
    while (!isFormVisible() && w < 10000) { await sleep(300); w += 300; }
    if (!isFormVisible()) {
      await bg('clickEvaluate', { index: 0 });
      await sleep(3000);
      if (!isFormVisible()) { sendError(`Can't open form for: ${name}`); await clearState(); return; }
    }
    await sleep(DELAY.med);

    sendProgress(`📝 ${name}`, `${current}/${total}`, Math.round(((current-0.5)/total)*100), 'Filling ratings...');
    await doOneEval(state.rating, state.speed);

    let cw = 0;
    while (isFormVisible() && cw < 6000) { await sleep(300); cw += 300; }
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(600); }
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(600); }

    await setState({ ...state, completed: state.completed + 1 });
    sendProgress(`✅ ${name}`, `${current}/${total}`, Math.round((current/total)*100), 'Done! Moving to next...');
    await sleep(state.speed + 500);

    const newRemaining = countEvalButtons();
    if (newRemaining > 0) await processNextCourse();
  }

  async function startAll(rating, speed) {
    if (!(await checkLicense())) { sendError('⛔ Not activated or wrong account. Activate with YOUR BRACU login.'); return; }
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(300); }

    const total = countEvalButtons();
    if (total === 0) { sendComplete('No evaluations found! 🎉'); return; }

    await setState({ running: true, rating, speed, total, completed: 0 });
    sendProgress('Starting...', `0/${total}`, 0, `${total} course(s) to evaluate`);
    await sleep(500);
    await processNextCourse();
  }

  async function evaluateCurrent(rating, speed) {
    if (!(await checkLicense())) { sendError('⛔ Not activated or wrong account.'); return; }
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(300); }
    if (!isFormVisible()) { sendError('No form open. Click Evaluate first.'); return; }
    sendProgress('Working...', '', 10, 'Filling ratings...');
    await doOneEval(rating, speed);
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(300); }
    sendComplete('Done! 🎉');
  }

  chrome.runtime.onMessage.addListener((msg, sender, resp) => {
    if (msg.action === 'evaluateAll') { startAll(msg.rating, msg.speed); resp({ok:true}); }
    if (msg.action === 'evaluateCurrent') { evaluateCurrent(msg.rating, msg.speed); resp({ok:true}); }
    if (msg.action === 'stopAll') { clearState(); resp({ok:true}); }
    if (msg.action === 'ping') { resp({alive:true, form:isFormVisible(), evals:countEvalButtons()}); }
    if (msg.action === 'getLoggedInUser') { resp({user: getLoggedInUser()}); }
    return true;
  });

  async function autoResume() {
    await sleep(2000);
    if (!(await checkLicense())) return;
    const state = await getState();
    if (state && state.running) {
      console.log('[BRACU AE] Resuming!', state.completed, '/', state.total);
      sendProgress('Resuming...', `${state.completed}/${state.total}`, Math.round((state.completed/state.total)*100), 'Continuing...');
      await sleep(1000);
      await processNextCourse();
    }
  }

  if (!document.getElementById('bracu-auto-eval-fab')) {
    const f = document.createElement('div');
    f.id = 'bracu-auto-eval-fab';
    f.innerHTML = '⚡';
    f.title = 'BRACU Auto Evaluator';
    document.body.appendChild(f);
  }

  autoResume();
  console.log('[BRACU AE] ⚡ v7 loaded — account-locked activation');
})();
