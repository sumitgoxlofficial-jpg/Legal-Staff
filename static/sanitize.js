/* Legal Staff: HTML sanitiser for drafts (pasted, restored from a backup, or typed in the editor).
   Parses with DOMParser (an inert document: nothing runs and nothing loads while parsing), then removes active content in the tree instead of
   pattern-matching the text, so unquoted attributes, odd casing, entities and nesting tricks cannot slip through. */
(function (root) {
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, FRAME: 1, FRAMESET: 1, OBJECT: 1, EMBED: 1, APPLET: 1, LINK: 1, META: 1, BASE: 1, FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1, SVG: 1, MATH: 1, TEMPLATE: 1, NOSCRIPT: 1, AUDIO: 1, VIDEO: 1, SOURCE: 1, CANVAS: 1 };
  var URL_ATTR = { href: 1, src: 1, action: 1, formaction: 1, 'xlink:href': 1, background: 1, poster: 1, srcset: 1, data: 1, cite: 1 };
  var STRIP = new RegExp('[\\u0000-\\u0020\\u007f-\\u009f\\u200b-\\u200f\\u2028\\u2029\\ufeff]+', 'g');
  function bad(v, attr, tag) {
    var s = String(v).replace(STRIP, '').toLowerCase();
    if (/^(javascript|vbscript|livescript|mocha):/.test(s)) return true;
    if (/^data:/.test(s)) return !(tag === 'IMG' && attr === 'src' && /^data:image\/(png|jpe?g|gif|webp);base64,/.test(s));
    return false;
  }
  function clean(html) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html == null ? '' : html), 'text/html');
    var all = Array.prototype.slice.call(doc.body.querySelectorAll('*'));
    all.forEach(function (el) {
      if (!el.parentNode) return;
      if (DROP[el.tagName.toUpperCase()]) { el.parentNode.removeChild(el); return; }
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        var n = a.name.toLowerCase(), v = a.value;
        if (n.indexOf('on') === 0 || n === 'srcdoc' || n === 'is' || n.indexOf('xmlns') === 0) { el.removeAttribute(a.name); return; }
        if (URL_ATTR[n] && bad(v, n, el.tagName.toUpperCase())) { el.removeAttribute(a.name); return; }
        if (n === 'style' && /expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|@import|url\s*\(\s*['"]?\s*(javascript|data:(?!image\/))/i.test(v.replace(/\\[0-9a-f]{1,6}\s?/gi, ''))) el.removeAttribute(a.name);
      });
      if (el.tagName === 'A' && el.getAttribute('target')) el.setAttribute('rel', 'noopener noreferrer');
    });
    return doc.body.innerHTML;
  }
  root.LSSanitize = { clean: clean };
})(typeof window !== 'undefined' ? window : this);
