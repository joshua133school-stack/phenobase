/* Search page: reads the query from the URL, filters PB_OBS, renders records or summaries. */
(function () {
  "use strict";
  var P = PB.params();
  var ref = PB.ref;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- fill and restore the form ---------- */
  var groups = [];
  ref.crops.forEach(function (c) { if (groups.indexOf(c.group) < 0) groups.push(c.group); });
  $("f-group").innerHTML = '<option value="">any</option>' + groups.map(function (g) {
    return '<option' + (g === P.group ? " selected" : "") + ">" + PB.esc(g) + "</option>";
  }).join("");
  PB.fillCropSelect($("f-crop"), P.crop || "", "Any crop");
  PB.fillCountrySelect($("f-cc"), P.cc || "", "Any country");
  function stageOptions() {
    var c = PB.crop[$("f-crop").value];
    PB.fillStageSelect($("f-stage"), c ? c.scale : "", P.stage || "", "Any stage");
  }
  stageOptions();
  $("f-crop").addEventListener("change", stageOptions);
  ["site", "y1", "y2", "q"].forEach(function (k) { if (P[k]) $("f-" + k).value = P[k]; });
  ["qc", "role", "conf", "n"].forEach(function (k) { if (P[k]) $("f-" + k).value = P[k]; });
  var view = P.view || "records";
  Array.prototype.forEach.call(document.querySelectorAll("input[name=view]"), function (r) {
    r.checked = r.value === view;
  });

  /* ---------- filter ---------- */
  var y1 = parseInt(P.y1, 10), y2 = parseInt(P.y2, 10);
  var text = (P.q || "").toLowerCase();
  var site = (P.site || "").toUpperCase().trim();
  var R = PB.records().filter(function (r) {
    var c = PB.crop[r.crop_id];
    if (P.crop && r.crop_id !== P.crop) return false;
    if (P.group && (!c || c.group !== P.group)) return false;
    if (P.cc && r.country_code !== P.cc) return false;
    if (site && r.site_id.indexOf(site) !== 0) return false;
    if (P.stage && r.stage_code !== P.stage) return false;
    if (y1 && r.year < y1) return false;
    if (y2 && r.year > y2) return false;
    if (P.qc && r.qc_status !== P.qc) return false;
    if (P.role && r.observer_role !== P.role) return false;
    if (P.conf === "high" && r.confidence !== "high") return false;
    if (P.conf === "medium" && r.confidence === "low") return false;
    if (text) {
      var hay = (r.cultivar + " " + r.locality + " " + r.admin1 + " " + r.notes + " " + r.record_id).toLowerCase();
      if (hay.indexOf(text) < 0) return false;
    }
    return true;
  });

  /* ---------- query description ---------- */
  // every piece is HTML-escaped here; desc is joined as HTML below
  var e = PB.esc, desc = [];
  if (P.crop) desc.push("crop = " + e(PB.cropName(P.crop)));
  if (P.group) desc.push("group = " + e(P.group));
  if (P.cc) desc.push("country = " + e(PB.countryName(P.cc)));
  if (site) desc.push("site = " + e(site) + "*");
  if (P.stage) desc.push("stage = " + e(P.stage));
  if (y1 || y2) desc.push("years = " + (y1 || "...") + "&ndash;" + (y2 || "..."));
  if (text) desc.push("text contains &quot;" + e(P.q) + "&quot;");
  if (P.qc) desc.push("QC = " + e(P.qc));
  if (P.role) desc.push("observer = " + e(P.role));
  if (P.conf) desc.push("confidence &ge; " + e(P.conf));

  var out = "";
  out += '<h2>Results</h2><p><b>Query:</b> ' + (desc.length ? desc.join("; ") : "all records") +
    "<br><b>" + R.length + "</b> record" + (R.length === 1 ? "" : "s") + " found." +
    (R.length ? ' &nbsp; [<a href="#" id="dl">Download these records as CSV</a>]' : "") +
    ' &nbsp; [<a href="' + PB.esc(window.location.href) + '">Permanent link</a>]</p>';
  if (window.PB_OBS && window.PB_OBS.demo)
    out += '<div class="notice demo"><b>Demonstration data.</b> These records are synthetic and must not be used for analysis.</div>';

  function link(changes) {
    var o = {};
    Object.keys(P).forEach(function (k) { o[k] = P[k]; });
    Object.keys(changes).forEach(function (k) { o[k] = changes[k]; });
    return "search.html" + PB.qs(o);
  }

  /* ---------- views ---------- */
  if (!R.length) {
    out += "<p>No records match this query. Try removing a condition.</p>";
  } else if (view === "year") {
    out += yearView();
  } else if (view === "site") {
    out += siteView();
  } else {
    out += recordView();
  }
  $("out").innerHTML = out;

  var dl = $("dl");
  if (dl) dl.addEventListener("click", function (e) {
    e.preventDefault();
    var fields = window.PB_OBS.fields.slice();
    var objs = R.map(function (r) {
      var o = {};
      fields.forEach(function (f) { o[f] = r[f]; });
      o.crop_name_en = PB.cropName(r.crop_id);
      o.stage_label_en = PB.stageLabel(r.stage_scale, r.stage_code);
      return o;
    });
    PB.download("phenobase_query_" + new Date().toISOString().slice(0, 10) + ".csv",
      PB.toCSV(fields.concat(["crop_name_en", "stage_label_en"]), objs));
  });

  function recordView() {
    var cols = [
      ["record_id", "Record ID"], ["obs_date", "Date"], ["doy", "DOY"], ["country_code", "Ctry"],
      ["locality", "Locality"], ["crop_id", "Crop"], ["cultivar", "Cultivar"], ["stage_code", "Stage"],
      ["observer_role", "Observer"], ["confidence", "Conf."], ["qc_status", "QC"]
    ];
    var sort = P.sort || "obs_date", dir = P.dir === "asc" ? 1 : P.dir === "desc" ? -1 : (P.sort ? 1 : -1);
    var numeric = { doy: 1 };
    R.sort(function (a, b) {
      var x = a[sort], y = b[sort];
      if (sort === "crop_id") { x = PB.cropName(x); y = PB.cropName(y); }
      var c = numeric[sort] ? x - y : String(x).localeCompare(String(y));
      return c * dir || a.record_id.localeCompare(b.record_id);
    });
    var n = parseInt(P.n, 10) || 50, pages = Math.ceil(R.length / n);
    var page = Math.min(Math.max(parseInt(P.page, 10) || 1, 1), pages);
    var rows = R.slice((page - 1) * n, page * n);

    var h = pager(page, pages, n);
    h += '<div class="tw"><table class="data full"><thead><tr>';
    cols.forEach(function (c) {
      var on = c[0] === sort;
      var nd = on && dir === 1 ? "desc" : "asc";
      h += '<th class="sortable' + (c[0] === "doy" ? " num" : "") + '"><a href="' + PB.esc(link({ sort: c[0], dir: nd, page: "" })) + '">' +
        c[1] + "</a>" + (on ? ' <span class="arrow">' + (dir === 1 ? "&#9650;" : "&#9660;") + "</span>" : "") + "</th>";
    });
    h += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var st = PB.stage(r.stage_scale, r.stage_code);
      h += "<tr>" +
        '<td class="code"><a href="record.html?id=' + r.record_id + '">' + r.record_id + "</a>" + (r.status === "DEMO" ? ' <span class="badge demo">DEMO</span>' : "") + "</td>" +
        '<td class="code">' + r.obs_date + "</td>" +
        '<td class="num">' + r.doy + "</td>" +
        '<td class="code" title="' + PB.esc(PB.countryName(r.country_code)) + '">' + r.country_code + "</td>" +
        "<td>" + PB.esc(r.locality) + "</td>" +
        '<td><a href="' + PB.esc(link({ crop: r.crop_id, page: "" })) + '">' + PB.esc(PB.cropName(r.crop_id)) + "</a></td>" +
        "<td>" + PB.esc(r.cultivar) + "</td>" +
        '<td><span class="mono">' + r.stage_code + "</span> " + PB.esc(st ? st.en : "") + "</td>" +
        "<td>" + PB.esc(r.observer_role) + "</td>" +
        "<td>" + r.confidence + "</td>" +
        '<td><span class="badge ' + (r.qc_status === "verified" ? "ok" : "wait") + '">' + r.qc_status + "</span></td>" +
        "</tr>";
    });
    h += "</tbody></table></div>";
    h += pager(page, pages, n);
    return h;
  }

  function pager(page, pages, n) {
    if (pages <= 1) return "";
    var h = '<div class="pager">Page ' + page + " of " + pages + " (" + n + " per page): ";
    if (page > 1) h += '<a href="' + PB.esc(link({ page: page - 1 })) + '">&laquo; Prev</a> ';
    for (var i = 1; i <= pages; i++) {
      if (pages > 12 && i > 2 && i < pages - 1 && Math.abs(i - page) > 2) {
        if (i === 3 || i === pages - 2) h += "&hellip; ";
        continue;
      }
      h += i === page ? "<b>[" + i + "]</b> " : '<a href="' + PB.esc(link({ page: i })) + '">' + i + "</a> ";
    }
    if (page < pages) h += '<a href="' + PB.esc(link({ page: page + 1 })) + '">Next &raquo;</a>';
    return h + "</div>";
  }

  function stats(list) {
    var n = list.length, s = 0, mn = 999, mx = 0;
    list.forEach(function (v) { s += v; if (v < mn) mn = v; if (v > mx) mx = v; });
    var m = s / n, ss = 0;
    list.forEach(function (v) { ss += (v - m) * (v - m); });
    return { n: n, mean: m, min: mn, max: mx, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0 };
  }

  function groupBy(keyFn) {
    var g = {}, order = [];
    R.forEach(function (r) {
      var k = keyFn(r);
      if (!g[k]) { g[k] = []; order.push(k); }
      g[k].push(r);
    });
    return { g: g, keys: order };
  }

  function cropStageOrder(a, b) {
    return PB.cropName(a.crop_id).localeCompare(PB.cropName(b.crop_id)) ||
      a.stage_scale.localeCompare(b.stage_scale) || a.stage_code.localeCompare(b.stage_code);
  }

  function yearView() {
    // crop x stage, then year. Delta is the mean of per-site anomalies (DOY minus that site's own mean),
    // so years are comparable even when different sites report in different years.
    var cs = groupBy(function (r) { return r.crop_id + "|" + r.stage_scale + "|" + r.stage_code; });
    var keys = cs.keys.sort(function (a, b) {
      return cropStageOrder(cs.g[a][0], cs.g[b][0]);
    });
    var h = '<p class="small">Mean day of year (DOY) for each crop, stage and year, over all matching sites. ' +
      "&Delta; is the mean <b>site anomaly</b>: each record's DOY minus the mean DOY of its own site, averaged over the sites reporting that year " +
      '(<span style="color:#3d5c14">negative = earlier</span>, <span style="color:#8b4513">positive = later</span> than usual). ' +
      "Mean DOY mixes sites and depends on which sites reported; &Delta; does not.</p>";
    h += '<div class="tw"><table class="data"><thead><tr><th>Crop</th><th>Stage</th><th class="num">Year</th><th class="num">n</th>' +
      '<th class="num">Mean DOY</th><th>Mean date</th><th class="num">Min</th><th class="num">Max</th><th class="num">&Delta; days</th><th></th></tr></thead><tbody>';
    keys.forEach(function (k) {
      var list = cs.g[k], r0 = list[0];
      var all = stats(list.map(function (r) { return r.doy; }));
      var siteDoy = {};
      list.forEach(function (r) { (siteDoy[r.site_id] = siteDoy[r.site_id] || []).push(r.doy); });
      var siteMean = {};
      Object.keys(siteDoy).forEach(function (s) { siteMean[s] = stats(siteDoy[s]).mean; });
      var byY = {}, anomY = {};
      list.forEach(function (r) {
        (byY[r.year] = byY[r.year] || []).push(r.doy);
        (anomY[r.year] = anomY[r.year] || []).push(r.doy - siteMean[r.site_id]);
      });
      var years = Object.keys(byY).sort();
      h += '<tr class="group"><td colspan="10">' + PB.esc(PB.cropName(r0.crop_id)) + " &middot; " +
        r0.stage_code + " " + PB.esc(PB.stageLabel(r0.stage_scale, r0.stage_code)) +
        " &middot; all years: mean DOY " + all.mean.toFixed(1) + " (" + PB.doyToMD(all.mean) + "), n = " + all.n + "</td></tr>";
      years.forEach(function (y) {
        var s = stats(byY[y]), d = stats(anomY[y]).mean;
        var w = Math.min(Math.round(Math.abs(d) * 4), 80);
        h += "<tr><td>" + PB.esc(PB.cropName(r0.crop_id)) + '</td><td class="code">' + r0.stage_code + "</td>" +
          '<td class="num"><a href="' + PB.esc(link({ view: "records", y1: y, y2: y, crop: r0.crop_id, stage: r0.stage_code, page: "" })) + '">' + y + "</a></td>" +
          '<td class="num">' + s.n + '</td><td class="num">' + s.mean.toFixed(1) + '</td><td class="nowrap">' + PB.doyToMD(s.mean) +
          '</td><td class="num">' + s.min + '</td><td class="num">' + s.max + '</td><td class="num">' + (d > 0 ? "+" : "") + d.toFixed(1) +
          '</td><td><span class="bar" style="width:' + w + "px;background:" + (d < 0 ? "#6b8e23" : "#cd853f") + ";border-color:" + (d < 0 ? "#3d5c14" : "#8b4513") + '"></span></td></tr>';
      });
    });
    return h + "</tbody></table></div>";
  }

  function siteView() {
    var gs = groupBy(function (r) { return r.site_id + "|" + r.crop_id + "|" + r.stage_code; });
    var keys = gs.keys.sort(function (a, b) {
      var x = gs.g[a][0], y = gs.g[b][0];
      return x.site_id.localeCompare(y.site_id) || cropStageOrder(x, y);
    });
    var h = '<p class="small">One row per site, crop and stage. <b>Trend</b> is the least-squares slope of DOY on year, in days per decade ' +
      "(negative = stage is getting earlier); it is shown only where the site has 5 or more years.</p>";
    h += '<div class="tw"><table class="data"><thead><tr><th>Site</th><th>Locality</th><th>Crop / cultivar</th><th>Stage</th>' +
      '<th class="num">Years</th><th>Period</th><th class="num">Mean DOY</th><th>Mean date</th><th class="num">Earliest</th><th class="num">Latest</th>' +
      '<th class="num">SD</th><th class="num">Trend d/10y</th></tr></thead><tbody>';
    keys.forEach(function (k) {
      var list = gs.g[k], r0 = list[0];
      var s = stats(list.map(function (r) { return r.doy; }));
      var ys = list.map(function (r) { return r.year; });
      var trend = "";
      if (s.n >= 5) {
        var my = ys.reduce(function (a, b) { return a + b; }, 0) / s.n, sxy = 0, sxx = 0;
        list.forEach(function (r) { sxy += (r.year - my) * (r.doy - s.mean); sxx += (r.year - my) * (r.year - my); });
        if (sxx > 0) { var b = sxy / sxx * 10; trend = (b > 0 ? "+" : "") + b.toFixed(1); }
      }
      h += '<tr><td class="code"><a href="' + PB.esc(link({ view: "records", site: r0.site_id, crop: r0.crop_id, stage: r0.stage_code, page: "" })) + '">' + r0.site_id + "</a></td>" +
        "<td>" + PB.esc(r0.locality) + ", " + r0.country_code + "</td>" +
        "<td>" + PB.esc(PB.cropName(r0.crop_id)) + " <span class=\"muted\">'" + PB.esc(r0.cultivar) + "'</span></td>" +
        '<td><span class="mono">' + r0.stage_code + "</span> " + PB.esc(PB.stageLabel(r0.stage_scale, r0.stage_code)) + "</td>" +
        '<td class="num">' + s.n + '</td><td class="code">' + Math.min.apply(null, ys) + "&ndash;" + Math.max.apply(null, ys) + "</td>" +
        '<td class="num">' + s.mean.toFixed(1) + '</td><td class="nowrap">' + PB.doyToMD(s.mean) + "</td>" +
        '<td class="num">' + s.min + '</td><td class="num">' + s.max + '</td><td class="num">' + s.sd.toFixed(1) + "</td>" +
        '<td class="num">' + (trend || "&middot;") + "</td></tr>";
    });
    return h + "</tbody></table></div>";
  }
})();
