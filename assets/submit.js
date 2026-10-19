/* Record page: validates an observation, keeps a queue in localStorage, exports CSV.
   Recording is open only after the organization or individual path (PB.session). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = PB.session.get();
  if (!S) { $("gate").hidden = false; return; }
  $("rec").hidden = false;
  $("who").innerHTML = (S.mode === "org"
      ? "Organization: <b>" + PB.esc(S.org_name) + "</b> (" + PB.esc(S.org_code) + ")"
      : "Individual observer") +
    " &middot; Observer ID <b class=\"mono\">" + PB.esc(S.observer_id) + "</b> &middot; " +
    '<a href="#" id="signout">Change</a>';
  $("signout").addEventListener("click", function (e) {
    e.preventDefault();
    if (window.confirm("Leave this participation path? Observations already on this device are kept.")) { PB.session.clear(); window.location.reload(); }
  });
  var QKEY = "pb.queue.v1", SKEY = "pb.site.v1";
  var SITE_FIELDS = ["observer_id", "observer_role", "country_code", "admin1", "locality", "latitude", "longitude", "elevation_m", "site_id",
                     "crop_id", "cultivar", "method", "n_plants"];
  var FIELDS = ["entry_id", "status", "country_code", "admin1", "locality", "site_id", "latitude", "longitude", "elevation_m",
                "crop_id", "scientific_name", "cultivar", "stage_scale", "stage_code", "obs_date", "year", "doy",
                "observer_id", "observer_role", "pathway", "org_code", "trained", "method", "n_plants", "confidence", "photo", "notes", "entered_at"];

  function load(key, dflt) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : dflt; } catch (e) { return dflt; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  var queue = load(QKEY, []);
  var site = load(SKEY, {});

  PB.fillCountrySelect($("country_code"), site.country_code || S.country_code || "", "-- choose --");
  PB.fillCropSelect($("crop_id"), site.crop_id || "", "-- choose --");
  SITE_FIELDS.forEach(function (f) { if (site[f] !== undefined && $(f).tagName !== "SELECT") $(f).value = site[f]; });
  if (site.observer_role) $("observer_role").value = site.observer_role;
  if (site.method) $("method").value = site.method;
  $("observer_id").value = S.observer_id;
  $("obs_date").value = today();
  $("obs_date").max = today();

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function cropChanged() {
    var c = PB.crop[$("crop_id").value];
    $("crop-sci").innerHTML = c ? "<i>" + PB.esc(c.sci) + "</i> &middot; " + PB.esc(c.ko) + " &middot; " + PB.esc(c.ja) + " &middot; " + PB.esc(c.zh) : "";
    PB.fillStageSelect($("stage_code"), c ? c.scale : "", "", c ? "-- choose --" : "-- choose a crop first --");
    if (c) $("method").value = c.scale.indexOf("FRUIT") === 0 ? "tagged plants" : "fixed plot";
    stageChanged();
  }
  function stageChanged() {
    var c = PB.crop[$("crop_id").value];
    var st = c ? PB.stage(c.scale, $("stage_code").value) : null;
    $("stage-def").innerHTML = st ? "<b>" + PB.esc(st.en) + ":</b> " + PB.esc(st.def) + "<br>" + PB.esc(st.ko) + " &middot; " + PB.esc(st.ja) + " &middot; " + PB.esc(st.zh) : "";
  }
  $("crop_id").addEventListener("change", cropChanged);
  $("stage_code").addEventListener("change", stageChanged);
  cropChanged();

  $("gps").addEventListener("click", function () {
    var m = $("gps-msg");
    if (!navigator.geolocation) { m.textContent = "Location not available on this device."; return; }
    m.textContent = "Locating...";
    navigator.geolocation.getCurrentPosition(function (p) {
      $("latitude").value = p.coords.latitude.toFixed(4);
      $("longitude").value = p.coords.longitude.toFixed(4);
      if (p.coords.altitude !== null && p.coords.altitude !== undefined && !$("elevation_m").value)
        $("elevation_m").value = Math.round(p.coords.altitude);
      m.textContent = "OK (accuracy about " + Math.round(p.coords.accuracy) + " m)";
    }, function (err) {
      m.textContent = "Could not get location: " + err.message;
    }, { enableHighAccuracy: true, timeout: 20000 });
  });

  function validate(o) {
    var errs = [];
    if (!o.country_code) errs.push("Choose a country.");
    if (!o.locality) errs.push("Enter the village or town.");
    if (!o.crop_id) errs.push("Choose a crop.");
    if (!o.stage_code) errs.push("Choose a stage.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.obs_date)) errs.push("Enter the date.");
    else if (o.obs_date > today()) errs.push("The date is in the future.");
    var lat = o.latitude === "" ? null : Number(o.latitude), lon = o.longitude === "" ? null : Number(o.longitude);
    if ((lat === null) !== (lon === null)) errs.push("Enter both latitude and longitude, or neither.");
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) errs.push("Latitude must be between -90 and 90.");
    if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) errs.push("Longitude must be between -180 and 180.");
    var dup = queue.some(function (q) {
      return q.crop_id === o.crop_id && q.stage_code === o.stage_code && q.year === o.year &&
        q.locality === o.locality && q.cultivar === o.cultivar;
    });
    if (dup) errs.push("This stage is already in the list for this crop, cultivar, place and year. Delete the old entry first if you want to correct it.");
    return errs;
  }

  $("obs").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var o = {};
    ["observer_id", "observer_role", "country_code", "admin1", "locality", "latitude", "longitude", "elevation_m", "site_id",
     "crop_id", "cultivar", "method", "n_plants", "stage_code", "obs_date", "confidence", "photo", "notes"].forEach(function (f) {
      o[f] = String($(f).value).trim();
    });
    o.site_id = o.site_id.toUpperCase();
    var c = PB.crop[o.crop_id];
    o.scientific_name = c ? c.sci : "";
    o.stage_scale = c ? c.scale : "";
    o.year = o.obs_date ? Number(o.obs_date.slice(0, 4)) : "";
    o.doy = o.obs_date ? PB.doy(o.obs_date) : "";
    var errs = validate(o);
    var msg = $("msg");
    if (errs.length) { msg.className = "err"; msg.innerHTML = errs.map(PB.esc).join("<br>"); return; }
    o.observer_id = S.observer_id;
    o.pathway = S.mode;
    o.org_code = S.org_code || "";
    o.trained = S.trained || "";
    o.entry_id = "E" + Date.now().toString(36).toUpperCase();
    o.status = "SUBMITTED";
    o.entered_at = new Date().toISOString();
    queue.push(o);
    var ok = save(QKEY, queue);
    var s = {};
    SITE_FIELDS.forEach(function (f) { s[f] = o[f]; });
    save(SKEY, s);
    msg.className = "ok";
    msg.textContent = ok ? "Added. " + queue.length + " observation(s) on this device." :
      "Added for this session only: this browser does not allow saving. Download the CSV before closing the page.";
    $("notes").value = "";
    $("photo").value = "no";
    $("stage_code").value = "";
    stageChanged();
    render();
  });

  function render() {
    if (!queue.length) { $("queue").innerHTML = '<p class="muted">No observations yet.</p>'; return; }
    var h = '<div class="tw"><table class="data full"><thead><tr><th class="num">#</th><th>Date</th><th>Crop</th><th>Cultivar</th><th>Stage</th>' +
      '<th>Place</th><th>Conf.</th><th>Notes</th><th></th></tr></thead><tbody>';
    queue.forEach(function (o, i) {
      h += '<tr><td class="num">' + (i + 1) + '</td><td class="code">' + o.obs_date + "</td><td>" + PB.esc(PB.cropName(o.crop_id)) + "</td><td>" + PB.esc(o.cultivar) +
        '</td><td><span class="mono">' + o.stage_code + "</span> " + PB.esc(PB.stageLabel(o.stage_scale, o.stage_code)) + "</td><td>" + PB.esc(o.locality) + ", " + o.country_code +
        "</td><td>" + o.confidence + "</td><td>" + PB.esc(o.notes) + '</td><td><button type="button" data-del="' + i + '">Delete</button></td></tr>';
    });
    $("queue").innerHTML = h + "</tbody></table></div>";
  }
  $("queue").addEventListener("click", function (ev) {
    var i = ev.target.getAttribute("data-del");
    if (i === null) return;
    if (!window.confirm("Delete observation #" + (Number(i) + 1) + "?")) return;
    queue.splice(Number(i), 1);
    save(QKEY, queue);
    render();
  });
  $("dl").addEventListener("click", function () {
    if (!queue.length) { window.alert("There are no observations to download."); return; }
    PB.download("phenorelay_submission_" + today() + ".csv", PB.toCSV(FIELDS, queue));
  });
  $("clear").addEventListener("click", function () {
    if (!queue.length) return;
    if (!window.confirm("Delete all " + queue.length + " observations from this device? Download the CSV first if you have not sent it.")) return;
    queue = [];
    save(QKEY, queue);
    render();
  });
  render();
})();
