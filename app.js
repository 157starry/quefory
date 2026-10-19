// ============================================================
//  QUEFORY · visitor page logic
// ============================================================
(function () {
  const cfg = window.QUEFORY_CONFIG || {};
  const KEEPER = cfg.keeperName || "the Keeper";
  const LISTENER = cfg.listenerName || "the Listener";
  const configured = cfg.supabaseUrl && !cfg.supabaseUrl.startsWith("PASTE");
  const sb = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  if (cfg.greeting) $("greeting").textContent = cfg.greeting;
  $("tellSub").textContent = `Only you and ${LISTENER} can see this.`;
  if (!configured) $("setup").hidden = false;

  // ---------- helpers ----------
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    if (s < 604800) return Math.floor(s / 86400) + "d";
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  function open(id) { $(id).hidden = false; }
  function close(id) { $(id).hidden = true; }
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.hasAttribute("data-close")) m.hidden = true;
    });
  });
  function counter(area, out) {
    const upd = () => ($(out).textContent = `${$(area).value.length} / 1000`);
    $(area).addEventListener("input", upd);
    upd();
  }
  counter("askBody", "askCount");
  counter("tellBody", "tellCount");

  // Boxes this device created (box number only, never the code)
  function myBoxes() {
    try { return JSON.parse(localStorage.getItem("quefory_my_boxes") || "[]"); } catch { return []; }
  }
  function rememberBox(no) {
    try {
      const list = myBoxes();
      if (!list.includes(no)) list.push(no);
      localStorage.setItem("quefory_my_boxes", JSON.stringify(list.slice(-50)));
    } catch {}
  }

  function needConfig() {
    if (!configured) { toast("Setup needed: fill in config.js"); return true; }
    return false;
  }

  // ---------- Ask Me ----------
  $("askBtn").addEventListener("click", async () => {
    if (needConfig()) return;
    const body = $("askBody").value.trim();
    if (!body) return toast("Write your question first 🌿");
    const btn = $("askBtn");
    btn.disabled = true;
    const { error } = await sb.rpc("quefory_submit_ask", { p_name: $("name").value.trim(), p_body: body });
    btn.disabled = false;
    if (error) return toast("Couldn't send. Try again?");
    $("askBody").value = "";
    $("askBody").dispatchEvent(new Event("input"));
    toast("Question sent 💚");
    loadBoard();
  });

  // ---------- Tell Me ----------
  let wantsReply = true;
  function setChoice(v) {
    wantsReply = v;
    $("chipReply").setAttribute("aria-pressed", String(v));
    $("chipListen").setAttribute("aria-pressed", String(!v));
  }
  $("chipReply").addEventListener("click", () => setChoice(true));
  $("chipListen").addEventListener("click", () => setChoice(false));

  let lastCode = null;
  $("tellBtn").addEventListener("click", async () => {
    if (needConfig()) return;
    const body = $("tellBody").value.trim();
    if (!body) return toast("Tell me something first 🤍");
    const btn = $("tellBtn");
    btn.disabled = true;
    const { data, error } = await sb.rpc("quefory_submit_tell", {
      p_name: $("name").value.trim(), p_body: body, p_wants_reply: wantsReply,
    });
    btn.disabled = false;
    if (error || !data) return toast("Couldn't send. Try again?");
    $("tellBody").value = "";
    $("tellBody").dispatchEvent(new Event("input"));
    rememberBox(data.box_no);
    lastCode = data;
    $("codeBox").textContent = "#" + data.box_no;
    $("codeDigits").innerHTML = data.code.split("").map((d) => `<div class="digit">${esc(d)}</div>`).join("");
    open("codeModal");
    loadBoard();
  });
  $("copyCode").addEventListener("click", async () => {
    if (!lastCode) return;
    const text = `Quefory box #${lastCode.box_no} · code ${lastCode.code}`;
    try { await navigator.clipboard.writeText(text); toast("Copied ✨"); }
    catch { toast(text); }
  });

  // ---------- Board ----------
  let posts = [];
  let filter = "all";
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      filter = t.dataset.f;
      document.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      renderBoard();
    })
  );

  async function loadBoard() {
    if (!configured) { $("board").innerHTML = `<div class="empty">The board will appear here once Quefory is connected.</div>`; return; }
    const { data, error } = await sb.rpc("quefory_board");
    if (error) { $("board").innerHTML = `<div class="empty">Couldn't load the board right now.</div>`; return; }
    posts = data || [];
    renderBoard();
  }

  function renderBoard() {
    const mine = myBoxes();
    const list = posts.filter((p) => filter === "all" || p.kind === filter);
    if (!list.length) {
      $("board").innerHTML = `<div class="empty">Nothing here yet. Be the first 🌱</div>`;
      return;
    }
    $("board").innerHTML = list.map((p) => {
      const head = `<div class="who"><span>${esc(p.sender_name)} · ${p.kind === "ask" ? "Ask Me" : "Tell Me"}</span><span>${ago(p.created_at)}</span></div>`;
      const react = p.reaction ? `<span class="react">${esc(p.reaction)}${p.kind === "tell" ? " read" : ""}</span>` : "";
      if (p.kind === "ask") {
        const ans = p.answer
          ? `<div class="ans"><b>${esc(KEEPER)}</b>${esc(p.answer)}</div>`
          : `<div class="waiting">Waiting for ${esc(KEEPER)}…</div>`;
        return `<article class="card">${head}<div class="q">${esc(p.body)}</div>${ans}${react}</article>`;
      }
      const isMine = mine.includes(p.box_no);
      const status = p.replied ? " · replied 💬" : "";
      return `<article class="card">${head}
        <button class="locked" data-box="${esc(p.box_no)}">🔒 Code-locked message
          <small>${isMine ? '<span class="mine">Your box</span> · ' : ""}Box #${esc(p.box_no)}${status} · tap to open</small>
        </button>${react}</article>`;
    }).join("");
    $("board").querySelectorAll("[data-box]").forEach((b) =>
      b.addEventListener("click", () => openUnlock(b.dataset.box))
    );
  }

  // ---------- Unlock ----------
  const digits = Array.from(document.querySelectorAll("#codeInputs input"));
  digits.forEach((inp, i) => {
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(-1);
      if (inp.value && i < 3) digits[i + 1].focus();
      if (digits.every((d) => d.value)) $("unlockBtn").focus();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) digits[i - 1].focus();
      if (e.key === "Enter") tryUnlock();
    });
    inp.addEventListener("paste", (e) => {
      const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
      if (t.length) {
        e.preventDefault();
        t.split("").forEach((c, k) => (digits[k].value = c));
        digits[Math.min(t.length, 3)].focus();
      }
    });
  });

  function openUnlock(boxNo) {
    digits.forEach((d) => (d.value = ""));
    $("unlockErr").textContent = "";
    $("boxNo").value = boxNo || "";
    $("boxNoWrap").hidden = !!boxNo;
    $("unlockFor").textContent = boxNo ? `Box #${boxNo} · enter your 4-digit code` : "Enter your box number and 4-digit code";
    open("unlockModal");
    setTimeout(() => (boxNo ? digits[0] : $("boxNo")).focus(), 50);
  }
  $("openAnyBtn").addEventListener("click", () => openUnlock(""));
  $("unlockBtn").addEventListener("click", tryUnlock);

  function errText(r) {
    if (r.error === "wrong_code") return `Wrong code. ${r.attempts_left} ${r.attempts_left === 1 ? "try" : "tries"} left.`;
    if (r.error === "locked") return "Too many wrong tries. This box is locked for 15 minutes.";
    if (r.error === "not_found") return "Box not found. Check the box number.";
    if (r.error === "listen_only") return "This box is set to Just listen.";
    return "Something went wrong. Try again?";
  }

  let current = null; // { box_no, code }
  async function tryUnlock() {
    if (needConfig()) return;
    const box = $("boxNo").value.trim().toUpperCase();
    const code = digits.map((d) => d.value).join("");
    if (box.length !== 4) return ($("unlockErr").textContent = "Enter your 4-character box number.");
    if (code.length !== 4) return ($("unlockErr").textContent = "Enter all 4 digits.");
    $("unlockBtn").disabled = true;
    const { data, error } = await sb.rpc("quefory_open_box", { p_box: box, p_code: code });
    $("unlockBtn").disabled = false;
    if (error || !data) return ($("unlockErr").textContent = "Something went wrong. Try again?");
    if (!data.ok) return ($("unlockErr").textContent = errText(data));
    current = { box_no: box, code };
    rememberBox(box);
    close("unlockModal");
    renderBox(data);
    open("boxModal");
    renderBoard();
  }

  function renderBox(data) {
    const b = data.box;
    $("boxBadge").textContent = `🔒 YOUR BOX · #${b.box_no}`;
    const items = [{ author: "sender", body: b.body, created_at: b.created_at }].concat(data.messages || []);
    $("thread").innerHTML = items.map((m) => {
      const me = m.author === "sender";
      const who = me ? `You · ${esc(b.sender_name)}` : esc(LISTENER);
      return `<div class="lbl ${me ? "r" : ""}">${who} · ${ago(m.created_at)}</div><div class="bub ${me ? "me" : "them"}">${esc(m.body)}</div>`;
    }).join("");
    const listenerReplied = (data.messages || []).some((m) => m.author === "keeper");
    $("replyArea").hidden = !b.wants_reply;
    $("listenNote").hidden = b.wants_reply && listenerReplied;
    if (!b.wants_reply) {
      $("listenNote").textContent = b.reaction
        ? `You chose "Just listen". ${LISTENER} has read it ${b.reaction}`
        : `You chose "Just listen". ${LISTENER} will read it soon 🤍`;
    } else if (!listenerReplied) {
      $("listenNote").textContent = b.reaction
        ? `${LISTENER} has read your message ${b.reaction}. A reply will show up here.`
        : `${LISTENER} hasn't replied yet. Come back later with your code.`;
    }
    $("boxErr").textContent = "";
  }

  $("replyBtn").addEventListener("click", async () => {
    if (!current) return;
    const body = $("replyBody").value.trim();
    if (!body) return;
    $("replyBtn").disabled = true;
    const { data, error } = await sb.rpc("quefory_box_reply", { p_box: current.box_no, p_code: current.code, p_body: body });
    $("replyBtn").disabled = false;
    if (error || !data) return ($("boxErr").textContent = "Couldn't send. Try again?");
    if (!data.ok) return ($("boxErr").textContent = errText(data));
    $("replyBody").value = "";
    renderBox(data);
  });
  // forget the code when the box is closed
  new MutationObserver(() => { if ($("boxModal").hidden) current = null; })
    .observe($("boxModal"), { attributes: true, attributeFilter: ["hidden"] });

  loadBoard();
  setInterval(() => { if (document.visibilityState === "visible") loadBoard(); }, 60000);
})();
