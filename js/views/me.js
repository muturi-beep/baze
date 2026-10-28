import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getBoard,
  getGenre,
  resetDemo,
  logoutUser,
} from "../store.js";
import { bottomNav, emptyState, showToast } from "../components.js";

export function MeView() {
  var el = h("main", { class: "screen me" });

  function render() {
    var s = getState();
    var entries = getBoard(s.cycle.id);
    var yourVotes = entries.filter(function (e) {
      return e.votedByMe;
    });
    var used = s.cycle.fanVoteBudget - s.user.votesRemaining;
    var pct = (used / s.cycle.fanVoteBudget) * 100;

    var genreCounts = {};
    yourVotes.forEach(function (v) {
      var g = v.track.genre;
      if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
    var favGenreId = Object.keys(genreCounts).sort(function (a, b) {
      return genreCounts[b] - genreCounts[a];
    })[0];
    var favGenre = favGenreId ? getGenre(favGenreId) : null;

    var topPick =
      yourVotes.length > 0
        ? yourVotes.slice().sort(function (a, b) {
            return a.rank - b.rank;
          })[0]
        : null;

    el.innerHTML = "";

    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("span"),
        h("h1", {}, "You"),
        h("span"),
      ),
    );

    el.appendChild(
      h(
        "section",
        { class: "me-hero" },
        h(
          "div",
          { class: "me-avatar", "aria-hidden": "true" },
          s.user.verified ? s.user.name.charAt(0).toUpperCase() : "👤",
        ),
        h("h2", { class: "me-name" }, s.user.name),
        s.user.verified
          ? h("span", { class: "me-badge verified-badge" }, "✓ Verified voter")
          : h(
              "a",
              {
                class: "me-badge unverified-badge",
                href: "#/login",
                style: { textDecoration: "none" },
              },
              "Log in to vote",
            ),
      ),
    );

    el.appendChild(
      h(
        "section",
        { class: "me-budget" },
        h(
          "div",
          { class: "me-budget-row" },
          h("span", {}, "Week " + s.cycle.weekNumber + " votes"),
          h(
            "span",
            { class: "me-budget-count" },
            used + " of " + s.cycle.fanVoteBudget + " used",
          ),
        ),
        h(
          "div",
          {
            class: "progress",
            role: "progressbar",
            "aria-valuenow": String(used),
            "aria-valuemin": "0",
            "aria-valuemax": String(s.cycle.fanVoteBudget),
          },
          h("div", { class: "fill", style: { width: pct + "%" } }),
        ),
      ),
    );

    if (yourVotes.length === 0) {
      el.appendChild(
        emptyState({
          message: "You haven't voted this week yet.",
          cta: { label: "Find something to vote for", to: "/explore" },
        }),
      );
    } else {
      el.appendChild(
        h(
          "section",
          { class: "me-stats" },
          statRow(
            "♥",
            used + " vote" + (used === 1 ? "" : "s") + " cast this week",
          ),
          topPick
            ? statRow(
                "🏆",
                "Top pick: #" + topPick.rank + " " + topPick.track.title,
              )
            : null,
          favGenre
            ? statRow(favGenre.emoji, "Favorite genre: " + favGenre.name)
            : null,
        ),
      );

      el.appendChild(
        h("a", { class: "me-cta", href: "#/votes" }, "View all your votes →"),
      );
    }

    el.appendChild(
      h(
        "section",
        { class: "me-settings" },
        h("h3", {}, "Settings"),
        settingsItem("🔔", "Notifications", function () {
          showToast("Notifications coming soon");
        }),
        settingsItem("📊", "Vote history", function () {
          location.hash = "#/votes";
        }),
        settingsItem("ℹ️", "How ranking works", function () {
          location.hash = "#/ranking-explained";
        }),
        settingsItem("🏆", "Claim an artist profile", function () {
          location.hash = "#/claim";
        }),
        settingsItem("❓", "Help & support", function () {
          showToast("Support coming soon");
        }),
        s.user.verified
          ? settingsItem(
              "🚪",
              "Log out",
              async function () {
                await logoutUser();
                showToast("Logged out");
                location.hash = "#/";
              },
              true,
            )
          : null,
        settingsItem(
          "🗑",
          "Reset demo",
          function () {
            if (
              confirm("Reset all demo data? Votes and claims will be cleared.")
            ) {
              resetDemo();
              showToast("Demo reset");
              location.hash = "#/";
            }
          },
          true,
        ),
      ),
    );

    el.appendChild(bottomNav("me"));
  }

  function statRow(icon, text) {
    return h(
      "div",
      { class: "me-stat" },
      h("span", { class: "me-stat-icon" }, icon),
      h("span", { class: "me-stat-text" }, text),
    );
  }

  function settingsItem(icon, label, onClick, danger) {
    return h(
      "button",
      {
        type: "button",
        class: "me-setting" + (danger ? " danger" : ""),
        onClick: onClick,
      },
      h("span", { class: "me-setting-icon" }, icon),
      h("span", { class: "me-setting-label" }, label),
      h("span", { class: "me-setting-arrow" }, "→"),
    );
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
