// Background service worker — executes clicks in the PAGE's JavaScript context
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Click a rating option in the page's MAIN world
  if (msg.action === 'clickRating' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (rating) => {
        const val = String(rating);
        const idx = rating - 1;

        // Try clicking labels
        const labels = document.querySelectorAll('.rating-label-box');
        for (let i = 0; i < labels.length; i++) {
          if (labels[i].textContent.trim() === val || i === idx) {
            labels[i].click();
            if (labels[i].parentElement) labels[i].parentElement.click();
            if (labels[i].parentElement && labels[i].parentElement.parentElement) {
              labels[i].parentElement.parentElement.click();
            }
          }
        }

        // Try radios by value and by index
        const radios = document.querySelectorAll('input[type="radio"]');
        for (let j = 0; j < radios.length; j++) {
          if (radios[j].value === val || j === idx) {
            radios[j].checked = true;
            radios[j].click();
            radios[j].dispatchEvent(new Event('change', { bubbles: true }));
            radios[j].dispatchEvent(new Event('input', { bubbles: true }));
            if (radios[j].id) {
              const lbl = document.querySelector('label[for="' + radios[j].id + '"]');
              if (lbl) lbl.click();
            }
            break;
          }
        }

        // Try clicking elements with data attributes
        document.querySelectorAll('[data-value="' + val + '"], [data-rating="' + val + '"]').forEach(e => e.click());

        return true;
      },
      args: [msg.rating]
    }).then(() => sendResponse({ ok: true }))
      .catch(e => { console.error('[BRACU AE bg]', e); sendResponse({ ok: false }); });
    return true;
  }

  // Click Next button in MAIN world
  if (msg.action === 'clickNext' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        const btn = document.querySelector('#nextstep');
        if (btn) btn.click();
        else {
          for (const b of document.querySelectorAll('button')) {
            if (b.textContent.trim() === 'Next') { b.click(); break; }
          }
        }
      }
    }).then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false }));
    return true;
  }

  // Click Submit in MAIN world
  if (msg.action === 'clickSubmit' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        const btn = document.querySelector('#nextstep');
        if (btn) btn.click();
        for (const b of document.querySelectorAll('button')) {
          const t = b.textContent.trim().toLowerCase();
          if (t === 'submit' || t === 'finish') { b.click(); break; }
        }
      }
    }).then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false }));
    return true;
  }

  // Dismiss alert in MAIN world — handles "Yes", "Yes Submit", "OK", "Confirm", swal2, etc.
  if (msg.action === 'dismissAlert' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        // 1) SweetAlert2 confirm button
        const s2 = document.querySelector('.swal2-confirm');
        if (s2) { s2.click(); return 'swal2-confirm'; }
        // 2) SweetAlert1 confirm
        const s1 = document.querySelector('.swal-button--confirm, .swal-button');
        if (s1) { s1.click(); return 'swal1-confirm'; }
        // 3) Broad search: "yes", "yes submit", "ok", "confirm", "yes, submit"
        const targets = ['yes, submit', 'yes submit', 'yes', 'ok', 'confirm', 'submit'];
        for (const b of document.querySelectorAll('button')) {
          const t = b.textContent.trim().toLowerCase();
          if (targets.includes(t) && b.offsetParent !== null) {
            b.click(); return 'btn:' + t;
          }
        }
        // 4) Look for buttons inside swal/modal overlays
        const overlays = document.querySelectorAll('.swal2-container, .swal-overlay, .modal.show, [class*="confirm"]');
        for (const ov of overlays) {
          const btns = ov.querySelectorAll('button');
          for (const b of btns) {
            if (b.offsetParent !== null) { b.click(); return 'overlay-btn'; }
          }
        }
        return false;
      }
    }).then(r => sendResponse({ ok: true, dismissed: r?.[0]?.result }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // Select a dropdown option in MAIN world
  if (msg.action === 'selectDropdown' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (optionIndex) => {
        const selects = document.querySelectorAll('select');
        for (const sel of selects) {
          if (sel.offsetParent === null) continue;
          // Pick the desired option (optionIndex) or the last option if index is out of range
          const opts = sel.options;
          if (opts.length === 0) continue;
          // Skip placeholder/empty options — pick optionIndex among real options
          let realOpts = [];
          for (let i = 0; i < opts.length; i++) {
            if (opts[i].value && opts[i].value !== '' && opts[i].textContent.trim() !== 'Select Option') {
              realOpts.push(i);
            }
          }
          if (realOpts.length === 0) realOpts = [opts.length - 1];
          const targetIdx = optionIndex < realOpts.length ? realOpts[optionIndex] : realOpts[realOpts.length - 1];
          sel.selectedIndex = targetIdx;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          // Also try to trigger Angular/React change detection
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(sel, opts[targetIdx].value);
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return opts[targetIdx].textContent.trim();
        }
        return false;
      },
      args: [msg.optionIndex || 0]
    }).then(r => sendResponse({ ok: true, selected: r?.[0]?.result }))
      .catch(e => { console.error('[BRACU AE bg]', e); sendResponse({ ok: false }); });
    return true;
  }

  // Type text into a text input/textarea in MAIN world
  if (msg.action === 'typeText' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (text) => {
        // Find visible text inputs or textareas
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        for (const inp of inputs) {
          if (inp.offsetParent === null) continue;
          // Skip if already filled
          if (inp.value && inp.value.length > 0) continue;
          const nativeSetter = Object.getOwnPropertyDescriptor(
            inp instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
            'value'
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(inp, text);
          } else {
            inp.value = text;
          }
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          inp.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
          inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
          return true;
        }
        return false;
      },
      args: [msg.text || 'Good']
    }).then(r => sendResponse({ ok: true, typed: r?.[0]?.result }))
      .catch(e => { console.error('[BRACU AE bg]', e); sendResponse({ ok: false }); });
    return true;
  }

  // Detect question type in MAIN world
  if (msg.action === 'detectQuestionType' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
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
    }).then(r => sendResponse({ ok: true, ...(r?.[0]?.result || {}) }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // Click Evaluate button by index in MAIN world
  if (msg.action === 'clickEvaluate' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (index) => {
        const btns = [];
        for (const b of document.querySelectorAll('button')) {
          if (b.textContent.trim() === 'Evaluate') btns.push(b);
        }
        if (btns[index]) { btns[index].click(); return true; }
        return false;
      },
      args: [msg.index || 0]
    }).then(r => sendResponse({ ok: true, clicked: r?.[0]?.result }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // Dump form HTML for debugging
  if (msg.action === 'dumpHTML' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        const modal = document.querySelector('.modal.show, .modal-dialog, [class*="modal"]');
        if (modal) return modal.innerHTML.substring(0, 5000);
        const labels = document.querySelectorAll('.rating-label-box');
        if (labels.length === 0) return 'NO_FORM';
        const container = labels[0].closest('.modal-body, .modal-content, form') || labels[0].parentElement.parentElement;
        return container ? container.innerHTML.substring(0, 3000) : 'NO_CONTAINER';
      }
    }).then(r => {
      console.log('[BRACU AE] Form HTML:', r?.[0]?.result);
      sendResponse({ html: r?.[0]?.result });
    }).catch(() => sendResponse({ html: 'ERROR' }));
    return true;
  }
});
