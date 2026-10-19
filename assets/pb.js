/* PhenoBase shared helpers. Requires data/reference.js (window.PB_REF).
   Pages that list observations also load data/observations.js (window.PB_OBS). */
(function () {
  "use strict";
  var REF = window.PB_REF || { crops: [], scales: {}, countries: [], languages: [] };
  var PB = {};

  PB.ref = REF;
  PB.crop = {};
  REF.crops.forEach(function (c) { PB.crop[c.id] = c; });
  PB.country = {};
  REF.countries.forEach(function (c) { PB.country[c.code] = c; });

  PB.stage = function (scale, code) {
    var s = REF.scales[scale];
    if (!s) return null;
    for (var i = 0; i < s.stages.length; i++) if (s.stages[i].code === code) return s.stages[i];
    return null;
  };
  PB.stageLabel = function (scale, code) {
    var st = PB.stage(scale, code);
    return st ? st.en : "(unknown stage)";
  };
  PB.cropName = function (id) { var c = PB.crop[id]; return c ? c.en : id; };
  PB.countryName = function (cc) { var c = PB.country[cc]; return c ? c.en : cc; };

  PB.esc = function (v) {
    return String(v === undefined || v === null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  PB.params = function () {
    var out = {};
    var q = window.location.search.replace(/^\?/, "");
    if (!q) return out;
    q.split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, " "));
      var v = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
    return out;
  };

  PB.qs = function (obj) {
    var parts = [];
    Object.keys(obj).forEach(function (k) {
      if (obj[k] !== "" && obj[k] !== undefined && obj[k] !== null)
        parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
    });
    return parts.length ? "?" + parts.join("&") : "";
  };

  /* Observation rows as objects. */
  PB.records = function () {
    var O = window.PB_OBS;
    if (!O) return [];
    if (PB._recs) return PB._recs;
    PB._recs = O.rows.map(function (r) {
      var o = {};
      for (var i = 0; i < O.fields.length; i++) o[O.fields[i]] = r[i];
      return o;
    });
    return PB._recs;
  };

  PB.csvCell = function (v) {
    var s = String(v === undefined || v === null ? "" : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  PB.toCSV = function (fields, objs) {
    var lines = [fields.join(",")];
    objs.forEach(function (o) { lines.push(fields.map(function (f) { return PB.csvCell(o[f]); }).join(",")); });
    return lines.join("\r\n") + "\r\n";
  };
  PB.download = function (filename, text, mime) {
    // BOM so spreadsheet programs open UTF-8 (Korean, Japanese, Chinese, Thai...) correctly
    var blob = new Blob(["﻿" + text], { type: (mime || "text/csv") + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  PB.doyToMD = function (doy) {
    var d = new Date(Date.UTC(2001, 0, 1) + (Math.round(doy) - 1) * 86400000); // non-leap reference year
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getUTCDate() + " " + m[d.getUTCMonth()];
  };
  PB.doy = function (iso) {
    var p = iso.split("-");
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    return Math.round((t - Date.UTC(+p[0], 0, 1)) / 86400000) + 1;
  };

  /* Fill a <select> with crops grouped by crop group. */
  PB.fillCropSelect = function (sel, selected, blankLabel) {
    var html = blankLabel !== undefined ? '<option value="">' + PB.esc(blankLabel) + "</option>" : "";
    var groups = [];
    REF.crops.forEach(function (c) { if (groups.indexOf(c.group) < 0) groups.push(c.group); });
    groups.forEach(function (g) {
      html += '<optgroup label="' + PB.esc(g) + '">';
      REF.crops.forEach(function (c) {
        if (c.group !== g) return;
        html += '<option value="' + c.id + '"' + (c.id === selected ? " selected" : "") + ">" +
          PB.esc(c.en) + " / " + PB.esc(c.ko) + "</option>";
      });
      html += "</optgroup>";
    });
    sel.innerHTML = html;
  };

  PB.fillCountrySelect = function (sel, selected, blankLabel) {
    var html = blankLabel !== undefined ? '<option value="">' + PB.esc(blankLabel) + "</option>" : "";
    REF.countries.forEach(function (c) {
      html += '<option value="' + c.code + '"' + (c.code === selected ? " selected" : "") + ">" +
        c.code + " " + PB.esc(c.en) + "</option>";
    });
    sel.innerHTML = html;
  };

  /* Fill a <select> with the stages of one scale (or all scales if none given). */
  PB.fillStageSelect = function (sel, scale, selected, blankLabel) {
    var html = blankLabel !== undefined ? '<option value="">' + PB.esc(blankLabel) + "</option>" : "";
    var scales = scale ? [scale] : Object.keys(REF.scales);
    var done = false;
    scales.forEach(function (k) {
      if (!scale) html += '<optgroup label="' + PB.esc(REF.scales[k].name) + '">';
      REF.scales[k].stages.forEach(function (s) {
        var on = !done && s.code === selected;
        if (on) done = true;
        html += '<option value="' + s.code + '"' + (on ? " selected" : "") + ">" +
          s.code + " " + PB.esc(s.en) + (s.core ? " *" : "") + "</option>";
      });
      if (!scale) html += "</optgroup>";
    });
    sel.innerHTML = html;
  };

  /* Participation session: how this device's observer joined (organization or individual).
     Kept in localStorage; get() returns null when not set or when storage is blocked. */
  var SESSION_KEY = "pb.session.v1";
  PB.session = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
    },
    set: function (s) {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
    },
    clear: function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing stored */ }
    }
  };
  PB.org = function (code) {
    code = String(code || "").trim().toUpperCase();
    var list = REF.organizations || [];
    for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return null;
  };

  window.PB = PB;
})();
