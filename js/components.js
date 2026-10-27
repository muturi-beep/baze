import { h } from "./dom.js";
import { formatRemaining, cycleProgress } from "./format.js";

export function rankDelta(prev, current) {
  if (prev == null) return h("span");
  if (prev === current) {
    return h(
      "span",
      { class: "rank-delta same", "aria-label": "no change" },
      "=",
    );
  }
  var up = current < prev,
    n = Math.abs(current - prev);
  return h(
    "span",
    {
      class: "rank-delta " + (up ? "up" : "down"),
      "aria-label": up
        ? "moved up " + n + " places"
        : "moved down " + n + " places",
    },
    up ? "↑ " + n : "↓ " + n,
  );
}

export function voteButton(opts) {
  var exhausted = opts.budgetUsed >= opts.budgetTotal;
  var disabled = opts.state === "voted" || opts.state === "voting" || exhausted;
  var label =
    opts.state === "voted"
      ? "✓ Voted"
      : opts.state === "voting"
        ? "Voting…"
        : opts.state === "error"
          ? "Try again"
          : exhausted
            ? "No votes left"
            : "♥ Vote";
  var btn = h(
    "button",
    {
      type: "button",
      class: "vote-button",
      "data-state": opts.state,
      "aria-disabled": String(disabled),
      "aria-label":
        opts.state === "voted" ? "You have voted" : "Vote for this track",
      onClick: function () {
        if (disabled) return;
        if (navigator.vibrate) navigator.vibrate(10);
        opts.onVote();
      },
    },
    label,
    opts.state === "idle" && !exhausted
      ? h(
          "span",
          { class: "vote-budget" },
          "(" + opts.budgetUsed + " of " + opts.budgetTotal + ")",
        )
      : null,
  );
  if (disabled) btn.setAttribute("disabled", "");
  btn.addEventListener("pointerdown", function () {
    btn.style.transform = "scale(0.97)";
  });
  btn.addEventListener("pointerup", function () {
    btn.style.transform = "scale(1)";
  });
  btn.addEventListener("pointerleave", function () {
    btn.style.transform = "scale(1)";
  });
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
  var el = h(
    "div",
    { class: "toast", role: "status", "aria-live": "polite" },
    text,
  );
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
      {
        class: "sheet",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "auth-title",
      },
      h("h2", { id: "auth-title" }, "Verify to make your vote count"),
      h(
        "p",
        { class: "muted" },
        "One fan, one vote. We verify so the leaderboard stays honest.",
      ),
      h(
        "button",
        {
          class: "oauth",
          onClick: function () {
            opts.onVerify("google");
          },
          disabled: opts.pending ? "" : null,
        },
        "Continue with Google",
      ),
      h(
        "button",
        {
          class: "oauth",
          onClick: function () {
            opts.onVerify("phone");
          },
          disabled: opts.pending ? "" : null,
        },
        "Continue with phone",
      ),
      h(
        "button",
        {
          class: "oauth",
          onClick: function () {
            opts.onVerify("email");
          },
          disabled: opts.pending ? "" : null,
        },
        "Continue with email",
      ),
      h(
        "p",
        { class: "legal" },
        "By continuing you agree to the rules: 1 fan = 1 vote.",
      ),
    ),
  );
  return backdrop;
}

export function cycleBanner(cycle) {
  var pct = cycleProgress(cycle);
  return h(
    "section",
    {
      class: "cycle-banner",
      "data-closing": String(cycle.status === "closing"),
    },
    h(
      "div",
      { class: "cycle-row" },
      h(
        "span",
        { class: "loc" },
        cycle.city.toUpperCase() + " · " + cycle.genre.toUpperCase(),
      ),
    ),
    h(
      "div",
      { class: "cycle-row" },
      h("span", {}, "Week " + cycle.weekNumber),
      h(
        "span",
        { class: "countdown" },
        "ends in " + formatRemaining(cycle.endsAt),
      ),
    ),
    h(
      "div",
      {
        class: "progress",
        role: "progressbar",
        "aria-valuenow": String(Math.round(pct)),
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-label": "cycle progress",
      },
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
      { class: "row-link", href: "#/track/" + entry.track.id },
      h("span", { class: "rank" }, "#" + entry.rank),
      rankDelta(entry.previousRank, entry.rank),
      h(
        "div",
        { class: "meta" },
        h(
          "span",
          { class: "title" },
          entry.track.title + " — " + entry.track.artist.name,
        ),
        h("span", { class: "votes" }, entry.votes.toLocaleString() + " votes"),
      ),
      entry.votedByMe
        ? h("span", { class: "heart", "aria-label": "you voted" }, "♥")
        : h("span"),
    ),
  );
}

export function trackCard(track) {
  return h(
    "a",
    { class: "track-card", href: "#/track/" + track.id },
    h("img", { src: track.artworkUrl, alt: "" }),
    h("span", { class: "title" }, track.title),
    h("span", { class: "artist" }, track.artist.name),
  );
}

export function emptyState(opts) {
  return h(
    "div",
    { class: "empty" },
    h("p", {}, opts.message),
    opts.cta
      ? h("a", { class: "cta", href: "#" + opts.cta.to }, opts.cta.label)
      : null,
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
      return h(
        "a",
        { href: i.href, class: i.key === activeKey ? "active" : "" },
        i.label,
      );
    }),
  );
}

export function exploreCard(opts) {
  var t = opts.track;
  return h(
    "a",
    {
      class: "explore-card" + (opts.votedByMe ? " voted" : ""),
      href: "#/track/" + t.id,
    },
    h("img", { src: t.artworkUrl, alt: "" }),
    h("span", { class: "title" }, t.title),
    h("span", { class: "artist" }, t.artist.name),
    h(
      "span",
      { class: "meta" },
      opts.rank != null
        ? h("span", { class: "rank-pill" }, "#" + opts.rank)
        : null,
      opts.votedByMe
        ? h("span", { class: "heart-mini", "aria-label": "you voted" }, "♥")
        : null,
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
      return h(
        "button",
        {
          type: "button",
          class: "genre-chip" + (active ? " active" : ""),
          role: "tab",
          "aria-selected": String(active),
          onClick: function () {
            onSelect(g.id);
          },
        },
        content,
      );
    }
    return h(
      "a",
      {
        class: "genre-chip" + (active ? " active" : ""),
        href: g.id == null ? "#/" : "#/genre/" + g.id,
        role: "tab",
        "aria-selected": String(active),
      },
      content,
    );
  }

  chips.push(
    makeChip({ id: null, emoji: "🏆", name: "All genres" }, allActive),
  );
  genres.forEach(function (g) {
    chips.push(makeChip(g, g.id === currentId));
  });

  return h(
    "div",
    { class: "genre-chips", role: "tablist", "aria-label": "browse by genre" },
    chips,
  );
}

export function albumCard(opts) {
  var alb = opts.album;
  var artist = opts.artist;
  return h(
    "a",
    { class: "album-card", href: "#/album/" + alb.id },
    h("img", { src: alb.artworkUrl, alt: "" }),
    h("span", { class: "title" }, alb.title),
    h("span", { class: "artist" }, artist ? artist.name : ""),
    h("span", { class: "votes" }, opts.votes.toLocaleString() + " votes"),
  );
}

export function producerCard(opts) {
  var prod = opts.producer;
  return h(
    "a",
    { class: "producer-card", href: "#/producer/" + prod.id },
    h("span", { class: "rank" }, "#" + opts.rank),
    h(
      "div",
      { class: "producer-meta" },
      h("span", { class: "title" }, prod.name),
      h(
        "span",
        { class: "votes" },
        opts.votes.toLocaleString() +
          " votes · " +
          opts.trackCount +
          " track" +
          (opts.trackCount === 1 ? "" : "s"),
      ),
    ),
  );
}
