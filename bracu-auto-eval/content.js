// BRACU Auto Evaluator v8 — Public release
(function () {
  'use strict';


  const DELAY = { short: 250, med: 500, long: 1000 };

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

  // Form is visible if we can see rating labels, dropdowns, or text inputs in a modal
  function isFormVisible() {
    if (document.querySelectorAll('.rating-label-box').length > 0) return true;
    // Also check for select dropdowns or text inputs within a modal
    const modal = document.querySelector('.modal.show, .modal-dialog, [class*="modal"]');
    if (modal) {
      if (modal.querySelector('select') && modal.querySelector('select').offsetParent !== null) return true;
      const inp = modal.querySelector('input[type="text"], textarea');
      if (inp && inp.offsetParent !== null) return true;
    }
    return false;
  }

  function hasSweetAlert() {
    if (document.querySelector('.swal2-container, .swal-overlay, .swal2-popup')) return true;
    // Also look for confirm dialogs with "Yes" or "Yes, Submit" buttons
    for (const b of document.querySelectorAll('button')) {
      const t = b.textContent.trim().toLowerCase();
      if ((t === 'yes, submit' || t === 'yes submit') && b.offsetParent !== null) return true;
    }
    return false;
  }

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

  // Detect what type of question is currently showing
  function detectLocalQuestionType() {
    const hasRatingLabels = document.querySelectorAll('.rating-label-box').length > 0;
    let hasSelect = false;
    for (const s of document.querySelectorAll('select')) {
      if (s.offsetParent !== null) { hasSelect = true; break; }
    }
    let hasTextInput = false;
    for (const inp of document.querySelectorAll('input[type="text"], textarea')) {
      if (inp.offsetParent !== null) { hasTextInput = true; break; }
    }
    return { hasRatingLabels, hasSelect, hasTextInput };
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
    // Get any prominent question text from the form
    for (const el of document.querySelectorAll('div, p, span, h5, h6, strong, b')) {
      const t = el.textContent.trim();
      if (t.length > 20 && t.length < 250) {
        if (t.startsWith('The ') || t.startsWith('I have') || t.startsWith('Please') || t.startsWith('What')) return t;
      }
    }
    // Fallback: any long-ish text in the modal
    const modal = document.querySelector('.modal.show, .modal-content');
    if (modal) {
      for (const el of modal.querySelectorAll('div, p, span, h5, h6, strong, b')) {
        const t = el.textContent.trim();
        if (t.length > 15 && t.length < 250) return t;
      }
    }
    return '';
  }

  // Wait until question text changes (or timeout)
  async function waitForQuestionChange(previousText, timeoutMs = 3000) {
    let w = 0;
    while (w < timeoutMs) {
      const current = getQuestionText();
      if (current !== previousText && current.length > 0) return true;
      if (!isFormVisible()) return true; // Form closed
      await sleep(150);
      w += 150;
    }
    return false;
  }

  async function doOneEval(rating, speed) {
    let step = 0;
    const maxSteps = 40;

    while (step < maxSteps) {
      step++;

      // Check if form is still open
      if (!isFormVisible() && !hasSweetAlert()) return true;

      const qBefore = getQuestionText();
      const qType = detectLocalQuestionType();

      console.log(`[BRACU AE] Step ${step}: rating=${qType.hasRatingLabels}, select=${qType.hasSelect}, text=${qType.hasTextInput}, submit=${hasSubmitBtn()}, next=${hasNextBtn()}`);

      // ---- CASE 1: Submit button visible (last question) ----
      if (hasSubmitBtn()) {
        // If there's a text input on the submit page, fill it first
        if (qType.hasTextInput) {
          await bg('typeText', { text: 'Good' });
          await sleep(DELAY.short);
        }
        // If there's a select dropdown on the submit page, fill it first
        if (qType.hasSelect) {
          await bg('selectDropdown', { optionIndex: 3 }); // Pick a high option
          await sleep(DELAY.short);
        }

        await bg('clickSubmit');
        await sleep(speed + 400);

        // Dismiss the "Yes, Submit" confirmation alert
        for (let attempt = 0; attempt < 5; attempt++) {
          if (hasSweetAlert()) {
            await bg('dismissAlert');
            await sleep(500);
          } else {
            break;
          }
        }
        // Wait for any remaining alerts
        await sleep(300);
        if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(500); }
        return true;
      }

      // ---- CASE 2: Rating labels (emoji buttons 1-5) ----
      if (qType.hasRatingLabels) {
        // Click via background script (MAIN world)
        await bg('clickRating', { rating });
        await sleep(DELAY.short);

        // Also click directly from content script
        const labels = document.querySelectorAll('.rating-label-box');
        const idx = rating - 1;
        if (labels[idx]) {
          labels[idx].click();
          if (labels[idx].parentElement) labels[idx].parentElement.click();
        }

        // Rating click usually auto-advances to next question
        // Wait briefly for auto-advance
        await sleep(speed + 200);

        // If it didn't auto-advance and Next is visible, click it
        if (hasNextBtn() && getQuestionText() === qBefore) {
          await bg('clickNext');
          await sleep(DELAY.short);
        }

        // Handle any alert that popped up (e.g., "please select")
        if (hasSweetAlert()) {
          await bg('dismissAlert');
          await sleep(400);
          // Re-try clicking the rating
          await bg('clickRating', { rating });
          await sleep(600);
          if (hasNextBtn()) {
            await bg('clickNext');
            await sleep(DELAY.short);
          }
          if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(400); }
        }

        await waitForQuestionChange(qBefore, 2000);
        continue;
      }

      // ---- CASE 3: Dropdown select (attendance %, hours per week) ----
      if (qType.hasSelect) {
        // Select the last/highest option (e.g., "75% - 100%" or "6+ Hours")
        await bg('selectDropdown', { optionIndex: 3 }); // Pick index 3 (usually the highest real option)
        await sleep(DELAY.med);

        // Must click Next for dropdown questions
        if (hasNextBtn()) {
          await bg('clickNext');
          await sleep(DELAY.short);
        }

        // Handle any alert
        if (hasSweetAlert()) {
          await bg('dismissAlert');
          await sleep(400);
        }

        await waitForQuestionChange(qBefore, 2000);
        continue;
      }

      // ---- CASE 4: Text input / textarea (open-ended questions Q13, Q14) ----
      if (qType.hasTextInput) {
        await bg('typeText', { text: 'Good' });
        await sleep(DELAY.med);

        // Must click Next for text questions
        if (hasNextBtn()) {
          await bg('clickNext');
          await sleep(DELAY.short);
        }

        // Handle any alert
        if (hasSweetAlert()) {
          await bg('dismissAlert');
          await sleep(400);
        }

        await waitForQuestionChange(qBefore, 2000);
        continue;
      }

      // ---- CASE 5: Unknown question type — try clicking Next anyway ----
      console.log('[BRACU AE] Unknown question type at step', step, '— trying Next');
      if (hasNextBtn()) {
        await bg('clickNext');
        await sleep(speed + 300);
      }
      if (hasSweetAlert()) {
        await bg('dismissAlert');
        await sleep(400);
      }

      await waitForQuestionChange(qBefore, 2000);

      // Safety: if nothing changed after trying, wait longer
      if (getQuestionText() === qBefore && isFormVisible()) {
        await sleep(1000);
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
    if (hasSweetAlert()) { await bg('dismissAlert'); await sleep(300); }

    const total = countEvalButtons();
    if (total === 0) { sendComplete('No evaluations found! 🎉'); return; }

    await setState({ running: true, rating, speed, total, completed: 0 });
    sendProgress('Starting...', `0/${total}`, 0, `${total} course(s) to evaluate`);
    await sleep(500);
    await processNextCourse();
  }

  async function evaluateCurrent(rating, speed) {
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
    if (msg.action === 'getLoggedInUser') { resp({user: ''}); }
    return true;
  });

  async function autoResume() {
    await sleep(2000);
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
