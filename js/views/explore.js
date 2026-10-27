import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getBoard,
  getClaimedArtistId,
  getClaimedArtist,
} from "../store.js";
import { exploreCard, emptyState, bottomNav } from "../components.js";

export function ExploreView() {
  var el = h("main", { class: "screen explore" });
  var query = "";
  var filter = "all"; // "all" | "unvoted"

  /* ---------- persistent shell (built once) ---------- */
  var searchInput = h("input", {
    type: "search",
    class: "explore-search",
    placeholder: "Search tracks or artists",
    autocomplete: "off",
    "aria-label": "Search tracks or artists",
  });

  var allTab = h(
    "button",
    {
      role: "tab",
      type: "button",
      onClick: function () {
        setFilter("all");
      },
    },
    "All tracks",
  );

  var unvotedTab = h(
    "button",
    {
      role: "tab",
      type: "button",
      onClick: function () {
        setFilter("unvoted");
      },
    },
    "Unvoted",
  );

  var resultsWrap = h("div", { class: "explore-results" });

  el.appendChild(
    h(
      "header",
      { class: "topbar" },
      h(
        "button",
        {
          "aria-label": "back",
          onClick: function () {
            location.hash = "#/";
          },
        },
        "←",
      ),
      h("h1", {}, "Explore"),
      h("span"),
    ),
  );

  el.appendChild(
    h(
      "div",
      { class: "explore-search-wrap" },
      h("span", { class: "search-icon", "aria-hidden": "true" }, "🔍"),
      searchInput,
    ),
  );

  el.appendChild(
    h(
      "div",
      { class: "tabs", role: "tablist", "aria-label": "filter tracks" },
      allTab,
      unvotedTab,
    ),
  );

  el.appendChild(resultsWrap);
  el.appendChild(claimBanner());
  el.appendChild(bottomNav("explore"));

  /* ---------- behavior ---------- */
  searchInput.addEventListener("input", function (e) {
    query = e.target.value.trim();
    refreshResults();
  });

  function setFilter(f) {
    filter = f;
    updateTabs();
    refreshResults();
  }

  function updateTabs() {
    allTab.className = filter === "all" ? "active" : "";
    allTab.setAttribute("aria-selected", String(filter === "all"));
    unvotedTab.className = filter === "unvoted" ? "active" : "";
    unvotedTab.setAttribute("aria-selected", String(filter === "unvoted"));
  }

  function matchesQuery(entry, q) {
    if (!q) return true;
    var needle = q.toLowerCase();
    return (
      entry.track.title.toLowerCase().indexOf(needle) !== -1 ||
      entry.track.artist.name.toLowerCase().indexOf(needle) !== -1
    );
  }

  function refreshResults() {
    var s = getState();
    var entries = getBoard(s.cycle.id);

    var filtered = entries.filter(function (e) {
      if (filter === "unvoted" && e.votedByMe) return false;
      return matchesQuery(e, query);
    });

    resultsWrap.innerHTML = "";

    if (filtered.length === 0) {
      resultsWrap.appendChild(emptyState({ message: emptyMessage() }));
      return;
    }

    resultsWrap.appendChild(
      h(
        "div",
        { class: "explore-grid" },
        filtered.map(function (e) {
          return exploreCard({
            track: e.track,
            rank: e.rank,
            votedByMe: e.votedByMe,
          });
        }),
      ),
    );
  }

  function emptyMessage() {
    if (query) return 'No tracks match "' + query + '".';
    if (filter === "unvoted") return "You've voted for everything this week.";
    return "No tracks in this cycle yet.";
  }

  /* ---------- lifecycle ---------- */
  updateTabs();
  var unsub = subscribe(refreshResults);
  refreshResults();

  return { el: el, destroy: unsub };
}

function claimBanner() {
  var claimedId = getClaimedArtistId();
  if (claimedId) {
    var artist = getClaimedArtist();
    return h(
      "a",
      { class: "claim-banner", href: "#/artist/" + claimedId },
      h("span", { class: "claim-title" }, "You're verified"),
      h(
        "span",
        { class: "claim-sub" },
        (artist ? artist.name : "View profile") + " →",
      ),
    );
  }
  return h(
    "a",
    { class: "claim-banner", href: "#/claim" },
    h("span", { class: "claim-title" }, "Are you an artist?"),
    h("span", { class: "claim-sub" }, "Claim your profile →"),
  );
}
