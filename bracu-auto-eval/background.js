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

  // Dismiss alert in MAIN world
  if (msg.action === 'dismissAlert' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        const s2 = document.querySelector('.swal2-confirm');
        if (s2) { s2.click(); return true; }
        const s1 = document.querySelector('.swal-button--confirm, .swal-button');
        if (s1) { s1.click(); return true; }
        for (const b of document.querySelectorAll('button')) {
          if (b.textContent.trim().toLowerCase() === 'ok' && b.offsetParent !== null) {
            b.click(); return true;
          }
        }
        return false;
      }
    }).then(r => sendResponse({ ok: true, dismissed: r?.[0]?.result }))
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
