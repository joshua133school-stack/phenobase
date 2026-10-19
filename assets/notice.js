/* Site-wide announcement popup. Shown once per visitor; dismissal is remembered on the device.
   To publish a new announcement, change ID and TEXT. To turn it off, set ID to "". */
(function () {
  "use strict";
  var ID = "nas-migration-2026-10";
  var TITLE = "Data migration complete";
  var TEXT = "All past data has been migrated to our new Synology DS225+ NAS system. Thank you for all your support.";
  var KEY = "pr.notice.dismissed";

  if (!ID) return;
  try { if (localStorage.getItem(KEY) === ID) return; } catch (e) { /* storage blocked: show every visit */ }

  var css = document.createElement("style");
  css.textContent =
    "#notice-bg{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}" +
    "#notice{background:#fff;border:1px solid #111;max-width:420px;width:100%;padding:12px 16px 14px}" +
    "#notice h2{margin:0 0 8px;border:0;padding:0}" +
    "#notice p{margin:0 0 12px}" +
    "@media print{#notice-bg{display:none}}";
  document.head.appendChild(css);

  var bg = document.createElement("div");
  bg.id = "notice-bg";
  bg.innerHTML = '<div id="notice" role="dialog" aria-modal="true" aria-labelledby="notice-t">' +
    '<h2 id="notice-t"></h2><p></p><button type="button">OK</button></div>';
  bg.querySelector("h2").textContent = TITLE;
  bg.querySelector("p").textContent = TEXT;
  document.body.appendChild(bg);

  var btn = bg.querySelector("button");
  function close() {
    try { localStorage.setItem(KEY, ID); } catch (e) { /* not remembered */ }
    bg.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  btn.addEventListener("click", close);
  bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
  document.addEventListener("keydown", onKey);
  btn.focus();
})();
