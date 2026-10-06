// Vercel serverless function: POST /api/contact
// Validates input, blocks bots (honeypot + origin check), rate-limits by IP,
// then emails the message through Resend if RESEND_API_KEY is set.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;
const hits = new Map(); // best-effort, per warm instance. Use Upstash/Redis for strict limits.

const TOPICS = ["General question", "Report a mistake on the site", "Municipal partnership", "Privacy or data request", "Press"];
const clean = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_PER_WINDOW;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to send a message." });
  }

  const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || "";
  if (allowed.length && !allowed.includes(origin)) {
    return res.status(403).json({ error: "This form can only be sent from the Nagarik website." });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    res.setHeader("Retry-After", String(WINDOW_MS / 1000));
    return res.status(429).json({ error: "Too many messages. Please wait 10 minutes and try again." });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "We couldn't read that message. Please try again." });

  // Honeypot: real people never fill the hidden "website" field.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const topic = TOPICS.includes(body.topic) ? body.topic : TOPICS[0];
  const message = clean(body.message, 3000);

  if (name.length < 2) return res.status(400).json({ error: "Enter your name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (message.length < 20) return res.status(400).json({ error: "Write at least 20 characters so we can help." });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "Nagarik <no-reply@nagarik.example>";

  if (!key || !to) {
    // Not configured yet: log without personal data so deploys still work.
    console.log(`[contact] ${new Date().toISOString()} topic="${topic}" length=${message.length} (email not configured)`);
    return res.status(200).json({ ok: true });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to], reply_to: email,
        subject: `[Nagarik] ${topic} — ${name}`,
        html: `<p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p><b>Topic:</b> ${escapeHtml(topic)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`
      })
    });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[contact] send failed:", err.message);
    return res.status(502).json({ error: "We couldn't send your message right now. Please try again shortly." });
  }
};
