// ============================================================
//  QUEFORY · Keeper page logic (admin.html)
// ============================================================
(function () {
  const cfg = window.QUEFORY_CONFIG || {};
  const KEEPER = cfg.keeperName || "the Keeper";
  const LISTENER = cfg.listenerName || "the Listener";
  const EMOJIS = ["💚", "🍵", "🫶", "🤍", "🌿", "✨", "🥹", "😂"];
  const configured = cfg.supabaseUrl && !cfg.supabaseUrl.startsWith("PASTE");
  const sb = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function when(iso) {
    return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  if (!configured) { $("setup").hidden = false; $("loginCard").hidden = false; return; }

  // ---------- Auth ----------
  async function start() {
    const { data } = await sb.auth.getSession();
    if (data.session) enter(); else showLogin();
  }
  function showLogin() { $("loginCard").hidden = false; $("dash").hidden = true; }

  async function enter() {
    const { data: ok } = await sb.rpc("quefory_is_keeper");
    if (!ok) {
      await sb.auth.signOut();
      showLogin();
      $("loginErr").textContent = "This account isn't the Keeper.";
      return;
    }
    $("loginCard").hidden = true;
    $("dash").hidden = false;
    load();
  }

  $("loginBtn").addEventListener("click", login);
  $("password").addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
  async function login() {
    $("loginErr").textContent = "";
    $("loginBtn").disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    $("loginBtn").disabled = false;
    if (error) return ($("loginErr").textContent = "Email or password is wrong.");
    enter();
  }
  $("logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });

  // ---------- Data ----------
  let posts = [];
  let msgs = {};
  let filter = "todo";

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      filter = t.dataset.f;
      document.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      render();
    })
  );
  $("refreshBtn").addEventListener("click", load);

  async function load() {
    const [p, m] = await Promise.all([
      sb.from("quefory_posts")
        .select("id,kind,sender_name,body,wants_reply,answer,answered_at,reaction,box_no,created_at")
        .order("created_at", { ascending: false }),
      sb.from("quefory_messages").select("id,post_id,author,body,created_at").order("created_at"),
    ]);
    if (p.error || m.error) return toast("Couldn't load. Try Refresh.");
    posts = p.data;
    msgs = {};
    m.data.forEach((x) => (msgs[x.post_id] = msgs[x.post_id] || []).push(x));
    render();
  }

  function needsMe(p) {
    if (p.kind === "ask") return !p.answer;
    const thread = msgs[p.id] || [];
    if (!p.reaction && !thread.length) return true;
    if (p.wants_reply) {
      const last = thread[thread.length - 1];
      return !last || last.author === "sender";
    }
    return false;
  }

  function emojiRow(p) {
    return `<div class="emojis">${EMOJIS.map((e) =>
      `<button class="emo" data-act="react" data-id="${p.id}" data-e="${e}" aria-pressed="${p.reaction === e}">${e}</button>`
    ).join("")}</div>`;
  }

  function render() {
    const todo = posts.filter(needsMe).length;
    $("stats").textContent = `${posts.length} messages · ${todo} waiting for you`;
    const list = posts.filter((p) =>
      filter === "all" ? true : filter === "todo" ? needsMe(p) : p.kind === filter
    );
    if (!list.length) {
      $("list").innerHTML = `<div class="empty">${filter === "todo" ? "All caught up 🌿" : "Nothing here yet."}</div>`;
      return;
    }
    $("list").innerHTML = list.map((p) => {
      const name = esc(p.sender_name || "Anonymous");
      if (p.kind === "ask") {
        return `<article class="card">
          <div class="who"><span>${name} · Ask Me <span class="badge g">PUBLIC</span></span><span>${when(p.created_at)}</span></div>
          <div class="q">${esc(p.body)}</div>
          <textarea class="field" id="ans-${p.id}" maxlength="2000" placeholder="Answer as ${esc(KEEPER)}…" style="min-height:70px">${esc(p.answer || "")}</textarea>
          <button class="btn g" data-act="answer" data-id="${p.id}">${p.answer ? "Update answer" : "Post answer"}</button>
          <p class="sub" style="margin:10px 0 0">Reaction (read mark)</p>
          ${emojiRow(p)}
          <div style="margin-top:12px"><button class="danger" data-act="delete" data-id="${p.id}">Delete</button></div>
        </article>`;
      }
      const thread = (msgs[p.id] || []).map((m) => {
        const me = m.author === "keeper";
        return `<div class="lbl ${me ? "r" : ""}">${me ? esc(LISTENER) : name} · ${when(m.created_at)}</div>
          <div class="bub ${me ? "me" : "them"}">${esc(m.body)}</div>`;
      }).join("");
      const reply = p.wants_reply
        ? `<textarea class="field" id="rep-${p.id}" maxlength="1000" placeholder="Reply as ${esc(LISTENER)}…" style="min-height:60px;margin-top:8px"></textarea>
           <button class="btn r" data-act="reply" data-id="${p.id}">Send reply</button>`
        : `<p class="sub" style="margin:8px 0 0">They chose “Just listen”. Leave a reaction so they know you've read it.</p>`;
      return `<article class="card">
        <div class="who"><span>${name} · Tell Me <span class="badge">🔒 #${esc(p.box_no)}</span></span><span>${when(p.created_at)}</span></div>
        <p class="sub" style="margin:6px 0 0">${p.wants_reply ? "💬 Wants a reply" : "🤍 Just listen"}</p>
        <div class="private-body">${esc(p.body)}</div>
        <div class="thread" style="margin:6px 0">${thread}</div>
        ${reply}
        <p class="sub" style="margin:10px 0 0">Reaction (read mark)</p>
        ${emojiRow(p)}
        <div style="margin-top:12px"><button class="danger" data-act="delete" data-id="${p.id}">Delete</button></div>
      </article>`;
    }).join("");
  }

  // ---------- Actions ----------
  $("list").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id;
    const p = posts.find((x) => x.id === id);
    b.disabled = true;
    let res;
    if (b.dataset.act === "answer") {
      const text = $("ans-" + id).value.trim();
      res = await sb.from("quefory_posts")
        .update({ answer: text || null, answered_at: text ? new Date().toISOString() : null })
        .eq("id", id);
      if (!res.error) toast(text ? "Answer posted 💚" : "Answer removed");
    } else if (b.dataset.act === "react") {
      const e2 = b.dataset.e === p.reaction ? null : b.dataset.e;
      res = await sb.from("quefory_posts").update({ reaction: e2 }).eq("id", id);
    } else if (b.dataset.act === "reply") {
      const text = $("rep-" + id).value.trim();
      if (!text) { b.disabled = false; return; }
      res = await sb.from("quefory_messages").insert({ post_id: id, author: "keeper", body: text });
      if (!res.error) toast("Reply sent 🤍");
    } else if (b.dataset.act === "delete") {
      if (!confirm("Delete this message for good?")) { b.disabled = false; return; }
      res = await sb.from("quefory_posts").delete().eq("id", id);
      if (!res.error) toast("Deleted");
    }
    b.disabled = false;
    if (res && res.error) return toast("Didn't work. Try again?");
    load();
  });

  start();
})();
