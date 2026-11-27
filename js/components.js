import { h } from "./dom.js";
import { formatRemaining, cycleProgress } from "./format.js";
import { api } from "./api.js"; // 🚨 Needed for the payment modal

export function rankDelta(prev, current) {
  if (prev == null) return h("span");
  if (prev === current) {
    return h("span", { class: "rank-delta same", "aria-label": "no change" }, "=");
  }
  var up = current < prev, n = Math.abs(current - prev);
  return h(
    "span",
    {
      class: "rank-delta " + (up ? "up" : "down"),
      "aria-label": up ? "moved up " + n + " places" : "moved down " + n + " places",
    },
    up ? "↑ " + n : "↓ " + n,
  );
}

export function voteButton(opts) {
  var exhausted = opts.budgetUsed >= opts.budgetTotal;
  
  // 🚨 FIX: Removed 'exhausted' so the button is clickable to buy votes
  var disabled = opts.state === "voted" || opts.state === "voting";
  
  var label =
    opts.state === "voted"
      ? "✓ Voted"
      : opts.state === "voting"
        ? "Voting…"
        : opts.state === "error"
          ? "Try again"
          : exhausted
            ? "Buy Votes 🪙" 
            : "♥ Vote";

  var btn = h(
    "button",
    {
      type: "button",
      class: "vote-button",
      "data-state": opts.state,
      "aria-disabled": String(disabled),
      "aria-label": opts.state === "voted" ? "You have voted" : "Vote for this track",
      onClick: function () {
        if (disabled) return;
        if (navigator.vibrate) navigator.vibrate(10);
        opts.onVote();
      },
    },
    label,
    opts.state === "idle" && !exhausted
      ? h("span", { class: "vote-budget" }, "(" + opts.budgetUsed + " of " + opts.budgetTotal + ")")
      : null,
  );
  
  if (disabled) btn.setAttribute("disabled", "");
  btn.addEventListener("pointerdown", function () { btn.style.transform = "scale(0.97)"; });
  btn.addEventListener("pointerup", function () { btn.style.transform = "scale(1)"; });
  btn.addEventListener("pointerleave", function () { btn.style.transform = "scale(1)"; });
  
  return h(
    "div",
    { class: "vote-wrap" },
    btn,
    h("p", { class: "hint" }, "Your vote counts as 1.0"),
  );
}

export function showToast(text) {
  var root = document.getElementById("toast-root");
  root.innerHTML = "";
  var el = h("div", { class: "toast", role: "status", "aria-live": "polite" }, text);
  root.appendChild(el);
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 3000);
}

export function authSheet(opts) {
  var backdrop = h("div", { class: "sheet-backdrop", role: "presentation" });
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) opts.onClose();
  });
  backdrop.appendChild(
    h(
      "div",
      { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "auth-title" },
      h("h2", { id: "auth-title" }, "Verify to make your vote count"),
      h("p", { class: "muted" }, "One fan, one vote. We verify so the leaderboard stays honest."),
      h("button", { class: "oauth", onClick: function () { opts.onVerify("google"); }, disabled: opts.pending ? "" : null }, "Continue with Google"),
      h("button", { class: "oauth", onClick: function () { opts.onVerify("phone"); }, disabled: opts.pending ? "" : null }, "Continue with phone"),
      h("button", { class: "oauth", onClick: function () { opts.onVerify("email"); }, disabled: opts.pending ? "" : null }, "Continue with email"),
      h("p", { class: "legal" }, "By continuing you agree to the rules: 1 fan = 1 vote."),
    ),
  );
  return backdrop;
}

export function cycleBanner(cycle) {
  var pct = cycleProgress(cycle);
  return h(
    "section",
    { class: "cycle-banner", "data-closing": String(cycle.status === "closing") },
    h("div", { class: "cycle-row" },
      h("span", { class: "loc" }, cycle.city.toUpperCase() + " · " + cycle.genre.toUpperCase()),
    ),
    h("div", { class: "cycle-row" },
      h("span", {}, "Week " + cycle.weekNumber),
      h("span", { class: "countdown" }, "ends in " + formatRemaining(cycle.endsAt)),
    ),
    h("div", { class: "progress", role: "progressbar", "aria-valuenow": String(Math.round(pct)), "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "cycle progress" },
      h("div", { class: "fill", style: { width: pct + "%" } }),
    ),
  );
}

export function leaderboardRow(entry) {
  return h(
    "li",
    { class: entry.votedByMe ? "voted" : "" },
    h(
      "a",
      { class: "row-link", href: "#/track/" + (entry.track.id || entry.track._id) },
      h("span", { class: "rank" }, "#" + entry.rank),
      rankDelta(entry.previousRank, entry.rank),
      h("div", { class: "meta" },
        h("span", { class: "title" }, entry.track.title + " — " + (entry.track.artist?.name || "Unknown")),
        h("span", { class: "votes" }, entry.votes.toLocaleString() + " votes"),
      ),
      entry.votedByMe ? h("span", { class: "heart", "aria-label": "you voted" }, "♥") : h("span"),
    ),
  );
}

export function trackCard(track) {
  var trackId = track.id || track._id;
  var fallbackImg = "https://picsum.photos/seed/" + trackId + "/400";
  return h(
    "a",
    { class: "track-card", href: "#/track/" + trackId },
    h("img", { src: track.artworkUrl || fallbackImg, alt: "", onError: function (e) { e.target.src = fallbackImg; } }),
    h("span", { class: "title" }, track.title),
    h("span", { class: "artist" }, track.artist?.name || "Unknown"),
  );
}

export function emptyState(opts) {
  return h(
    "div",
    { class: "empty" },
    h("p", {}, opts.message),
    opts.cta ? h("a", { class: "cta", href: "#" + opts.cta.to }, opts.cta.label) : null,
  );
}

export function bottomNav(activeKey) {
  var items = [
    { key: "home", href: "#/", label: "Home" },
    { key: "explore", href: "#/explore", label: "Explore" },
    { key: "votes", href: "#/votes", label: "Votes" },
    { key: "me", href: "#/me", label: "You" },
  ];
  return h(
    "nav",
    { class: "bottom-nav", "aria-label": "primary" },
    items.map(function (i) {
      return h("a", { href: i.href, class: i.key === activeKey ? "active" : "" }, i.label);
    }),
  );
}

export function exploreCard(opts) {
  var t = opts.track;
  var trackId = t.id || t._id;
  var fallbackImg = "https://picsum.photos/seed/" + trackId + "/400";
  return h(
    "a",
    { class: "explore-card" + (opts.votedByMe ? " voted" : ""), href: "#/track/" + trackId },
    h("img", { src: t.artworkUrl || fallbackImg, alt: "", onError: function (e) { e.target.src = fallbackImg; } }),
    h("span", { class: "title" }, t.title),
    h("span", { class: "artist" }, t.artist?.name || "Unknown"),
    h("span", { class: "meta" },
      opts.rank != null ? h("span", { class: "rank-pill" }, "#" + opts.rank) : null,
      opts.votedByMe ? h("span", { class: "heart-mini", "aria-label": "you voted" }, "♥") : null,
    ),
  );
}

export function genreChips(genres, currentId, onSelect) {
  var chips = [];
  var allActive = currentId == null;

  function makeChip(g, active) {
    var content = [
      h("span", { class: "genre-emoji" }, g.emoji),
      h("span", {}, g.name),
    ];
    if (onSelect) {
      return h("button", { type: "button", class: "genre-chip" + (active ? " active" : ""), role: "tab", "aria-selected": String(active), onClick: function () { onSelect(g.id); } }, content);
    }
    return h("a", { class: "genre-chip" + (active ? " active" : ""), href: g.id == null ? "#/" : "#/genre/" + g.id, role: "tab", "aria-selected": String(active) }, content);
  }

  chips.push(makeChip({ id: null, emoji: "🏆", name: "All genres" }, allActive));
  genres.forEach(function (g) { chips.push(makeChip(g, g.id === currentId)); });

  return h("div", { class: "genre-chips", role: "tablist", "aria-label": "browse by genre" }, chips);
}

export function albumCard(opts) {
  var alb = opts.album;
  if (!alb) return h("span");
  var albId = alb.id || alb._id;
  var fallbackImg = "https://picsum.photos/seed/" + albId + "/400";

  return h(
    "a",
    { class: "album-card", href: "#/album/" + albId },
    h("img", { src: alb.artworkUrl || fallbackImg, alt: "", onError: function (e) { e.target.src = fallbackImg; } }),
    h("span", { class: "title" }, alb.title),
    h("span", { class: "artist" }, opts.artist ? opts.artist.name : ""),
    h("span", { class: "votes" }, opts.votes.toLocaleString() + " votes"),
  );
}

export function producerCard(opts) {
  var prod = opts.producer;
  return h(
    "a",
    { class: "producer-card", href: "#/producer/" + prod.id },
    h("span", { class: "rank" }, "#" + opts.rank),
    h("div", { class: "producer-meta" },
      h("span", { class: "title" }, prod.name),
      h("span", { class: "votes" }, opts.votes.toLocaleString() + " votes · " + opts.trackCount + " track" + (opts.trackCount === 1 ? "" : "s")),
    ),
  );
}

export function showShareModal(track, onClose) {
  var backdrop = h("div", { class: "sheet-backdrop", style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 100 } });
  var cleanUrl = window.location.origin + "/share/track/" + track.id + "?ref=vote";
  var shareText = `I just voted for "${track.title}" by ${track.artist?.name || "Unknown"} on Baze! Help them climb the chart by voting too:`;

  const closeModal = () => { backdrop.remove(); if (onClose) onClose(); };
  backdrop.addEventListener("click", function(e) { if (e.target === backdrop) closeModal(); });

  var modal = h("div", { class: "sheet", style: { background: "var(--bg-elev)", borderRadius: "20px", padding: "32px 24px", textAlign: "center", maxWidth: "400px", width: "100%", position: "relative" } },
    h("button", { style: { position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "24px", cursor: "pointer" }, onClick: closeModal }, "×"),
    h("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "🚀"),
    h("h2", { style: { margin: "0 0 8px", fontSize: "22px" } }, "Vote Counted!"),
    h("p", { class: "muted", style: { margin: "0 0 24px", fontSize: "14px", lineHeight: "1.5" } }, 
      "Help ", h("strong", { style: { color: "var(--text)" } }, track.artist?.name || "this artist"), " climb the chart. Share this track with your friends."
    ),
    h("button", { class: "claim-primary", style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#25D366", color: "#fff" }, onClick: function () { window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + cleanUrl)}`, "_blank"); closeModal(); } }, "Share on WhatsApp"),
    h("button", { class: "claim-secondary", style: { marginTop: "12px" }, onClick: function () { if (navigator.share) { navigator.share({ title: track.title, text: shareText, url: cleanUrl }).catch(() => {}); } else { navigator.clipboard.writeText(shareText + " " + cleanUrl); showToast("Link copied!"); } closeModal(); } }, "Other Apps / Copy Link")
  );

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

export function showPaymentModal(userId, onSuccess) {
  const backdrop = h("div", { class: "sheet-backdrop", style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 100 } });
  const closeModal = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });

  let isProcessing = false;
  const phoneInput = h("input", { type: "tel", class: "claim-input", placeholder: "e.g. 0712345678", style: { marginBottom: "16px" } });
  const statusText = h("p", { style: { fontSize: "13px", textAlign: "center", marginTop: "12px" } }, "");

  const btn30 = h("button", { class: "claim-primary", onClick: () => handlePay(30) }, "Pay 30 KES (1 Vote)");
  const btn75 = h("button", { class: "claim-primary", style: { background: "var(--accent)" }, onClick: () => handlePay(75) }, "Pay 75 KES (Weekly Pass)");

  const handlePay = async (amount) => {
    if (isProcessing) return;
    if (!phoneInput.value.trim()) { statusText.textContent = "Please enter your phone number."; statusText.style.color = "var(--danger)"; return; }
    
    isProcessing = true; btn30.disabled = true; btn75.disabled = true;
    statusText.textContent = "Sending STK Push..."; statusText.style.color = "var(--accent)";

    try {
      const res = await api.initiatePayment({ phoneNumber: phoneInput.value, amount, userId });
      statusText.textContent = "Check your phone for the M-Pesa prompt...";
      
      const interval = setInterval(async () => {
        const check = await api.verifyPayment(res.checkoutId);
        if (check.status === "successful") { 
          clearInterval(interval); statusText.textContent = "✅ Payment Successful!"; statusText.style.color = "var(--success)"; 
          setTimeout(() => { closeModal(); onSuccess(); }, 1500); 
        } else if (check.status === "failed") { 
          clearInterval(interval); statusText.textContent = "❌ Payment failed."; statusText.style.color = "var(--danger)"; 
          isProcessing = false; btn30.disabled = false; btn75.disabled = false; 
        }
      }, 3000); 
    } catch (err) {
      statusText.textContent = "❌ Failed to initiate. Check number."; statusText.style.color = "var(--danger)"; 
      isProcessing = false; btn30.disabled = false; btn75.disabled = false;
    }
  };

  const modal = h("div", { class: "sheet", style: { background: "var(--bg-elev)", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%", position: "relative" } },
    h("button", { style: { position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "24px", cursor: "pointer" }, onClick: closeModal }, "×"),
    h("h2", { style: { margin: "0 0 8px", textAlign: "center" } }, "Get Votes"),
    h("p", { class: "muted", style: { textAlign: "center", fontSize: "13px", marginBottom: "20px" } }, "Choose how you want to vote this week."),
    phoneInput, h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, btn30, btn75), statusText
  );

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}