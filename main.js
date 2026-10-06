/* Nagarik shared behaviour: preferences, search, assistant, toasts. No external requests. */
(function () {
  const D = window.NAGARIK, doc = document, root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s), $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const store = { get(k) { try { return localStorage.getItem("ngk-" + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem("ngk-" + k, v); } catch (e) {} } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ICON = {
    svc: '<path d="M4 7h16M4 12h16M4 17h10"/>', faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
    page: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>', report: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    sos: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>', track: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  window.ngkSvg = svg; window.ngkEsc = esc;

  /* ---------- toast ---------- */
  const toastEl = doc.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite"); doc.body.appendChild(toastEl);
  window.ngkToast = m => { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2800); };

  /* ---------- preferences ---------- */
  const conn = navigator.connection || {};
  if (store.get("senior") === "1") root.classList.add("senior");
  if (store.get("lite") === "1" || conn.saveData || /2g/.test(conn.effectiveType || "")) root.classList.add("lite");
  const theme = store.get("theme"); if (theme) root.setAttribute("data-theme", theme);
  function syncBtns() {
    $$("[data-pref='senior']").forEach(b => b.setAttribute("aria-pressed", root.classList.contains("senior")));
    $$("[data-pref='lite']").forEach(b => b.setAttribute("aria-pressed", root.classList.contains("lite")));
  }
  doc.addEventListener("click", e => {
    const p = e.target.closest("[data-pref]"); if (!p) return;
    const k = p.dataset.pref;
    if (k === "theme") {
      const dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", dark ? "light" : "dark"); store.set("theme", dark ? "light" : "dark");
      ngkToast(dark ? "Light theme on" : "Dark theme on"); return;
    }
    const on = root.classList.toggle(k); store.set(k, on ? "1" : "0"); syncBtns();
    ngkToast(k === "senior" ? (on ? "Easy-read mode on: larger text, stronger contrast, no motion" : "Easy-read mode off") : (on ? "Lite mode on: 3D and animations paused to save data" : "Lite mode off"));
    doc.dispatchEvent(new CustomEvent("ngk:pref", { detail: { k, on } }));
  });
  syncBtns();

  /* ---------- mobile menu ---------- */
  const mb = $(".menu-btn"), nav = $(".nav");
  if (mb && nav) mb.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });

  /* ---------- language ---------- */
  const STR = {
    hi: { services: "सेवाएँ", apply: "आवेदन", track: "ट्रैक करें", report: "शिकायत दर्ज करें", map: "नागरिक मानचित्र", emergency: "आपातकाल", community: "समुदाय", help: "सहायता", my: "मेरा नागरिक",
      heroT: "सरकारी सेवाएँ, सरल भाषा में।", heroP: "खोजें, समझें, आवेदन करें, ट्रैक करें — एक ही जगह। नागरिक आपको सही आधिकारिक पोर्टल तक ले जाता है।", searchPh: "पूछें: पासपोर्ट कैसे बनवाएँ?", ask: "नागरिक AI से पूछें" },
    en: {}
  };
  const SUP = ["en", "hi"];
  function applyLang(l) {
    root.lang = l === "hi" ? "hi" : "en";
    $$("[data-i18n]").forEach(el => { if (!el.dataset.en) el.dataset.en = el.textContent; el.textContent = l === "hi" && STR.hi[el.dataset.i18n] ? STR.hi[el.dataset.i18n] : el.dataset.en; });
    $$("[data-i18n-ph]").forEach(el => { if (!el.dataset.enph) el.dataset.enph = el.placeholder; el.placeholder = l === "hi" && STR.hi[el.dataset.i18nPh] ? STR.hi[el.dataset.i18nPh] : el.dataset.enph; });
  }
  $$(".lang-sel").forEach(s => {
    s.value = store.get("lang") || "en";
    s.addEventListener("change", () => {
      const l = s.value;
      if (!SUP.includes(l)) { ngkToast("This language is planned. The preview has English and Hindi."); s.value = store.get("lang") || "en"; return; }
      store.set("lang", l); applyLang(l); $$(".lang-sel").forEach(o => o.value = l);
    });
  });
  applyLang(store.get("lang") || "en");

  /* ---------- search ---------- */
  const SYN = { pothole: "report", garbage: "report", kachra: "report", streetlight: "report", drain: "report", leak: "report", complaint: "report", "civic issue": "report",
    status: "track", track: "track", "ngk-": "track", emergency: "sos", ambulance: "sos", police: "sos", fire: "sos", accident: "sos" };
  function search(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const words = q.split(/\s+/).filter(w => w.length > 1 || /[^\x00-\x7F]/.test(w));
    const out = [];
    for (const k in SYN) if (q.includes(k)) {
      const t = SYN[k];
      if (t === "report" && !out.some(o => o.u === "/report")) out.push({ s: 99, type: "report", n: "Report a civic issue", d: "Photo + location, routed to your ward, tracking ID", u: "/report" });
      if (t === "track" && !out.some(o => o.u === "/track")) out.push({ s: 98, type: "track", n: "Track an application or report", d: "Use your NGK tracking ID or official reference", u: "/track" });
      if (t === "sos" && !out.some(o => o.u === "/emergency")) out.push({ s: 100, type: "sos", n: "Emergency: call 112", d: "All national helplines and local alerts", u: "/emergency" });
    }
    D.services.forEach(s => {
      const hay = (s.n + " " + s.hi + " " + s.kw + " " + s.portal).toLowerCase(); let sc = 0;
      words.forEach(w => { if (hay.includes(w)) sc += w.length > 3 ? 3 : 1; });
      if (sc) out.push({ s: sc + 1, type: "svc", n: s.n, d: s.who, u: "/services#" + s.id });
    });
    D.faqs.forEach((f, i) => {
      const hay = (f.q + " " + f.a).toLowerCase(); let sc = 0;
      words.forEach(w => { if (w.length > 3 && f.q.toLowerCase().includes(w)) sc += 2; else if (w.length > 3 && hay.includes(w)) sc += .5; });
      if (sc >= 2) out.push({ s: sc, type: "faq", n: f.q, d: f.a.slice(0, 90) + "…", u: "/help#faq-" + (i + 1) });
    });
    D.pages.forEach(p => { if (words.some(w => w.length > 2 && p.n.toLowerCase().includes(w))) out.push({ s: 1.5, type: "page", n: p.n, d: "Page", u: p.u }); });
    return out.sort((a, b) => b.s - a.s).slice(0, 8);
  }
  window.ngkSearch = search;
  const TYPE = { svc: ["Service", "", ICON.svc], faq: ["Answer", "gd", ICON.faq], page: ["Page", "", ICON.page], report: ["Action", "sa", ICON.report], track: ["Action", "", ICON.track], sos: ["Emergency", "bd", ICON.sos] };
  $$(".js-search").forEach(box => {
    const input = $("input", box), res = $(".search-res", box), live = $(".js-live", box);
    let sel = -1, items = [];
    function render() {
      items = search(input.value); sel = -1;
      if (!input.value.trim()) { res.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      res.hidden = false; input.setAttribute("aria-expanded", "true");
      res.innerHTML = items.length ? items.map((r, i) => { const t = TYPE[r.type]; return `<a class="res" role="option" id="${box.id}-o${i}" href="${r.u}"><span class="ico ${t[1]}">${svg(t[2])}</span><span><b>${esc(r.n)}</b><span>${t[0]} · ${esc(r.d)}</span></span></a>`; }).join("")
        : `<div class="res"><span><b>No exact match</b><span>Try different words, or <a href="#" data-ask="${esc(input.value)}">ask Nagarik AI</a>.</span></span></div>`;
      if (live) live.textContent = items.length + " results";
    }
    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", e => {
      const opts = $$(".res[role=option]", res);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!opts.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length; opts.forEach((o, i) => o.setAttribute("aria-selected", i === sel)); input.setAttribute("aria-activedescendant", opts[sel].id); }
      else if (e.key === "Enter") { e.preventDefault(); if (sel >= 0 && opts[sel]) location.href = opts[sel].getAttribute("href"); else if (opts[0]) location.href = opts[0].getAttribute("href"); else openAI(input.value); }
      else if (e.key === "Escape") { res.hidden = true; }
    });
    doc.addEventListener("click", e => { if (!box.contains(e.target)) res.hidden = true; });
    const vb = $(".js-voice", box); if (vb) vb.addEventListener("click", () => voice(input, render));
  });
  $$("[data-q]").forEach(b => b.addEventListener("click", () => { const box = $(".js-search"); if (!box) return; const i = $("input", box); i.value = b.dataset.q; i.focus(); i.dispatchEvent(new Event("input")); }));
  doc.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { const i = $(".js-search input"); if (i) { e.preventDefault(); i.focus(); } else { e.preventDefault(); openAI(""); } } });

  /* ---------- voice ---------- */
  function voice(input, cb) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { ngkToast("Voice search needs microphone access, which this preview can't use. Type your question instead."); return; }
    try {
      const r = new SR(); r.lang = root.lang === "hi" ? "hi-IN" : "en-IN"; r.interimResults = false;
      r.onresult = e => { input.value = e.results[0][0].transcript; cb(); };
      r.onerror = () => ngkToast("Microphone isn't available here. Type your question instead.");
      r.start(); ngkToast("Listening… speak now");
    } catch (e) { ngkToast("Microphone isn't available here. Type your question instead."); }
  }

  /* ---------- assistant ---------- */
  const fab = doc.createElement("button");
  fab.className = "ai-fab"; fab.type = "button"; fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML = '<span class="orb" aria-hidden="true"></span><span class="t" data-i18n="ask">Ask Nagarik AI</span>';
  doc.body.appendChild(fab);
  const panel = doc.createElement("div");
  panel.className = "ai-panel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Nagarik AI assistant");
  panel.innerHTML = `<div class="ai-head"><span class="ico ai">${svg('<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>')}</span><div style="flex:1"><b>Nagarik AI</b><div class="muted" style="font-size:.78rem">Guidance in plain language</div></div><button class="icon-btn" type="button" aria-label="Close assistant" data-close>✕</button></div>
  <div class="ai-log" aria-live="polite"></div>
  <p class="ai-note">Preview: answers come from Nagarik's help library. <b>AI guidance</b> is not official. Confirm on the linked official portal.</p>
  <form class="ai-form"><label class="sr-only" for="ai-in">Ask a question</label><input id="ai-in" type="text" placeholder="e.g. documents for passport" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">Ask</button></form>`;
  doc.body.appendChild(panel);
  const log = $(".ai-log", panel), aiIn = $("#ai-in");
  function add(html, who) { const m = doc.createElement("div"); m.className = "msg " + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; }
  function reply(q) {
    const lq = q.toLowerCase();
    if (/112|emergency|ambulance|accident|police|fire|danger|help me/.test(lq))
      return `<span class="lab"><span class="pill bad"><i></i>Emergency</span></span><span>If anyone is in danger, call <b>112</b> now. It connects police, fire and ambulance anywhere in India.</span><a href="/emergency">All helplines →</a>`;
    if (/pothole|garbage|streetlight|drain|leak|report|complaint/.test(lq) && !/rti|cyber|fraud/.test(lq))
      return `<span class="lab"><span class="pill ai"><i></i>AI guidance</span></span><span>You can report this on Nagarik in about a minute: choose the category, add a photo, confirm the location and submit. You'll get a tracking ID like NGK-24817.</span><a href="/report">Report an issue →</a>`;
    const r = search(q), top = r.find(x => x.type === "svc"), faq = r.find(x => x.type === "faq");
    if (top) {
      const s = D.services.find(x => "/services#" + x.id === top.u);
      return `<span class="lab"><span class="pill ai"><i></i>AI guidance</span></span><span><b>${esc(s.n)}</b>: ${esc(s.what)}</span><span><b>Usually needed:</b> ${s.docs.slice(0, 3).map(esc).join("; ")}.</span><span class="lab"><span class="pill good"><i></i>Official source</span></span><a href="${s.url}" target="_blank" rel="noopener">${esc(s.portal)}, ${esc(s.who)} ↗</a><a href="/services#${s.id}">Full checklist on Nagarik →</a>`;
    }
    if (faq) { const f = D.faqs.find(x => x.q === faq.n); return `<span class="lab"><span class="pill blue"><i></i>Nagarik help centre</span></span><span>${esc(f.a)}</span>`; }
    return `<span class="lab"><span class="pill ai"><i></i>AI guidance</span></span><span>I couldn't find that yet. Try naming the service, like "income certificate" or "voter ID", or browse all services.</span><a href="/services">Service directory →</a>`;
  }
  function openAI(q) {
    panel.hidden = false; fab.setAttribute("aria-expanded", "true");
    if (!log.children.length) add(`<span>Namaste! Ask me about a government service, a document, or a civic problem near you.</span><span class="lab"><button class="pill" data-aq="Documents for passport">Passport documents</button><button class="pill" data-aq="How to update Aadhaar address">Aadhaar address</button><button class="pill" data-aq="Report a pothole">Report pothole</button></span>`, "bot");
    if (q) { add(esc(q), "me"); setTimeout(() => add(reply(q), "bot"), 350); }
    setTimeout(() => aiIn.focus(), 50);
  }
  window.ngkOpenAI = openAI;
  fab.addEventListener("click", () => panel.hidden ? openAI("") : (panel.hidden = true));
  panel.addEventListener("click", e => { if (e.target.closest("[data-close]")) { panel.hidden = true; fab.focus(); } const a = e.target.closest("[data-aq]"); if (a) openAI(a.dataset.aq); });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") { panel.hidden = true; fab.focus(); } });
  $(".ai-form", panel).addEventListener("submit", e => { e.preventDefault(); const q = aiIn.value.trim().slice(0, 300); if (!q) return; aiIn.value = ""; openAI(q); });
  doc.addEventListener("click", e => { const a = e.target.closest("[data-ask]"); if (a) { e.preventDefault(); openAI(a.dataset.ask); } });

  /* ---------- declarative actions (no inline handlers, CSP-safe) ---------- */
  doc.addEventListener("click", e => {
    const go = e.target.closest("[data-go]"); if (go) { const i = $("input", go.closest(".js-search")); i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); return; }
    if (e.target.closest("[data-reload]")) { location.reload(); return; }
    const t = e.target.closest("[data-toast]"); if (t) ngkToast(t.dataset.toast);
  });
  doc.addEventListener("change", e => {
    const f = e.target.closest("input[type=file][data-maxmb]"); if (!f || !f.files[0]) return;
    if (f.files[0].size > (+f.dataset.maxmb) * 1048576) { ngkToast("Files must be " + f.dataset.maxmb + " MB or smaller"); f.value = ""; }
    else ngkToast("Preview: in the live app the file is virus-scanned and encrypted before saving");
  });
  /* ---------- contact form ---------- */
  const cf = $("#contact-form");
  if (cf) cf.addEventListener("submit", async e => {
    e.preventDefault();
    const v = id => $("#" + id, cf).value.trim(), errs = [];
    const set = (id, bad, msg) => { const el = $("#" + id, cf), er = $("#" + id + "-e", cf); el.setAttribute("aria-invalid", bad); er.hidden = !bad; if (bad) { er.textContent = msg; errs.push(el); } };
    set("c-name", v("c-name").length < 2, "Enter your name.");
    set("c-email", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("c-email")), "Enter a valid email address, like name@example.com.");
    set("c-msg", v("c-msg").length < 20, "Write at least 20 characters so we can help.");
    if (errs.length) { errs[0].focus(); return; }
    const btn = $("button[type=submit]", cf); btn.disabled = true; btn.textContent = "Sending…";
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v("c-name"), email: v("c-email"), topic: v("c-topic"), message: v("c-msg"), website: $("#c-web", cf).value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong. Try again in a minute.");
      cf.reset(); ngkToast("Thanks. We'll reply within 2 working days.");
    } catch (err) { ngkToast(location.protocol === "file:" || /claude|usercontent/.test(location.host) ? "Preview: the form sends once the site is deployed." : err.message); }
    finally { btn.disabled = false; btn.textContent = "Send message"; }
  });
  applyLang(store.get("lang") || "en");
})();
