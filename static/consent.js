/* Legal Staff — storage notice. One script tag on any page: <script src="/static/consent.js" defer></script>
   Shows a small, non-blocking card (bottom-left) once; "OK" stores the choice in localStorage `ls.consent.v1`.
   Injects its own CSS, respects reduced motion, and lifts itself above a sticky `.convert-bar` when one is on screen. */
(function () {
  'use strict';
  var KEY = 'ls.consent.v1';
  if (window.__lsConsent) return; window.__lsConsent = true;
  function read() { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify({ ok: true, at: new Date().toISOString() })); } catch (e) {} }
  if (read()) return;

  function init() {
    if (document.getElementById('ls-consent')) return;
    var css = '#ls-consent{position:fixed;left:16px;bottom:16px;z-index:80;max-width:380px;width:calc(100% - 32px);box-sizing:border-box;background:#0A0A0A;color:#CFCFCF;border:1px solid #262626;border-radius:12px;padding:16px 16px 14px;box-shadow:0 18px 50px rgba(0,0,0,.28);font:14px/1.55 "Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;gap:14px;align-items:flex-end;transition:bottom .2s ease}'
      + '#ls-consent p{margin:0;flex:1}#ls-consent a{color:#FFFFFF;text-decoration:underline;text-underline-offset:2px}'
      + '#ls-consent button{flex:none;height:38px;min-width:64px;padding:0 16px;border-radius:8px;border:1px solid #FFFFFF;background:#FFFFFF;color:#0A0A0A;font-family:inherit;font-size:14px;font-weight:600;line-height:1;cursor:pointer}'
      + '#ls-consent button:hover{background:#E5E5E5}#ls-consent button:focus-visible,#ls-consent a:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}'
      + '@media (prefers-reduced-motion:no-preference){#ls-consent{animation:ls-consent-in .35s cubic-bezier(.2,.7,.2,1) both}@keyframes ls-consent-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}'
      + '@media (prefers-reduced-motion:reduce){#ls-consent{transition:none}}'
      + '@media (max-width:480px){#ls-consent{left:12px;bottom:12px;width:calc(100% - 24px);padding:14px;font-size:13.5px}}'
      + '@media print{#ls-consent{display:none}}';
    var st = document.createElement('style'); st.id = 'ls-consent-css'; st.textContent = css; document.head.appendChild(st);

    var box = document.createElement('div');
    box.id = 'ls-consent'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Cookie and storage notice');
    box.innerHTML = '<p>We use only essential browser storage to sign you in and run the app — no advertising or analytics cookies. Read our <a href="/cookies">Cookie Policy</a> and <a href="/privacy">Privacy Policy</a>.</p><button type="button">OK</button>';
    document.body.appendChild(box);

    // Keep clear of the sticky tool bar: when .convert-bar is on screen, sit just above it.
    var bars = Array.prototype.slice.call(document.querySelectorAll('.convert-bar'));
    var base = function () { return window.innerWidth <= 480 ? 12 : 16; };
    var ticking = false;
    function place() {
      ticking = false;
      var lift = 0, vh = window.innerHeight || document.documentElement.clientHeight;
      bars.forEach(function (b) { var r = b.getBoundingClientRect(); if (r.height && r.top < vh && r.bottom > 0) lift = Math.max(lift, vh - r.top); });
      box.style.bottom = (lift + base()) + 'px';
    }
    function onMove() { if (!ticking) { ticking = true; (window.requestAnimationFrame || setTimeout)(place); } }
    if (bars.length) { window.addEventListener('scroll', onMove, { passive: true }); window.addEventListener('resize', onMove); }
    place();

    box.querySelector('button').addEventListener('click', function () {
      save();
      window.removeEventListener('scroll', onMove); window.removeEventListener('resize', onMove);
      box.parentNode.removeChild(box);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
