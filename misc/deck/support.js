// templates/deck/support.js — review-time helpers for the deck, loaded from
// <helmet> so they are in place before the first slide renders. Nothing here
// is part of the deck's look: it is the baseline-grid overlay a designer
// toggles while checking the rhythm. The window flag keeps a second
// evaluation of this helmet script (a Design Component recreates helmet
// nodes when the page is opened directly) from binding the key twice.

// Review aid: baseline-grid overlay — add ?baselines to the URL, or press B to toggle.
(() => {
  if (window.__deckBaselineAid) return;
  window.__deckBaselineAid = true;
  const stage = () => document.querySelector('deck-stage');
  if (new URLSearchParams(location.search).has('baselines')) {
    let tries = 600; // wait out the deck's first render (up to ~10s of frames)
    const arm = () => { const s = stage(); if (s) s.setAttribute('data-baselines', ''); else if (tries-- > 0) requestAnimationFrame(arm); };
    arm();
  }
  addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // typing guard, as in deck-stage's own keys
    if ((e.key === 'b' || e.key === 'B') && !e.metaKey && !e.ctrlKey && !e.altKey) stage()?.toggleAttribute('data-baselines');
  });
})();
