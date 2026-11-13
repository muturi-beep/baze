import { h } from "../dom.js";
import { subscribe, getState, getBoard, getArtists } from "../store.js";
import {
  exploreCard,
  emptyState,
  bottomNav,
  genreChips,
} from "../components.js";
import { GENRES } from "../data.js";

export function ExploreView() {
  var el = h("main", { class: "screen explore" });
  var query = "";
  var filter = "all"; // "all" | "unvoted"
  var currentGenreId = null;

  // Calculate trending artists based on total votes
  function getTrendingArtists(s) {
    var board = getBoard(s.cycle.id);
    var artistVotes = {};

    board.forEach(function (e) {
      if (e.track && e.track.artistId && e.votes > 0) {
        var aid = e.track.artistId._id || e.track.artistId;
        artistVotes[aid] = (artistVotes[aid] || 0) + e.votes;
      }
    });

    var artists = getArtists();
    return artists
      .map(function (a) {
        return { ...a, totalVotes: artistVotes[a._id] || 0 };
      })
      .sort(function (a, b) {
        return b.totalVotes - a.totalVotes;
      })
      .slice(0, 6); // Top 6 artists
  }

  /* ---------- persistent shell (built once) ---------- */
  var searchInput = h("input", {
    type: "search",
    class: "explore-search",
    placeholder: "Search tracks, artists, or albums",
    autocomplete: "off",
    "aria-label": "Search tracks, artists, or albums",
  });

  var allTab = h(
    "button",
    { role: "tab", type: "button", onClick: () => setFilter("all") },
    "All tracks",
  );
  var unvotedTab = h(
    "button",
    { role: "tab", type: "button", onClick: () => setFilter("unvoted") },
    "Unvoted",
  );

  var trendingWrap = h("div", { class: "trending-artists-wrap" });
  var resultsWrap = h("div", { class: "explore-results" });

  el.appendChild(
    h(
      "header",
      { class: "topbar" },
      h(
        "button",
        { "aria-label": "back", onClick: () => (location.hash = "#/") },
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

  el.appendChild(trendingWrap);

  el.appendChild(
    h(
      "div",
      { class: "tabs", role: "tablist", "aria-label": "filter tracks" },
      allTab,
      unvotedTab,
    ),
  );

  // Genre Filter Chips
  var genreFilterWrap = h("div", { class: "explore-genre-filter" });
  el.appendChild(genreFilterWrap);
  el.appendChild(resultsWrap);

  // --- NEW: ARTIST SUBMISSION BANNER ---
  el.appendChild(
    h("div", { style: { marginTop: "32px", padding: "24px", background: "var(--bg-elev)", borderRadius: "16px", textAlign: "center", border: "1px dashed var(--border)" } },
      h("h3", { style: { margin: "0 0 8px" } }, "Are you an artist?"),
      h("p", { class: "muted", style: { fontSize: "14px", marginBottom: "16px" } }, "Submit your song to be featured on the Baze chart."),
      h("a", { href: "#/submit", class: "claim-primary", style: { display: "inline-block", width: "auto", padding: "0 24px" } }, "Submit Music")
    )
  );
  // ------------------------------------

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

  function setGenre(id) {
    currentGenreId = id;
    buildGenreChips();
    refreshResults();
  }

  function updateTabs() {
    allTab.className = filter === "all" ? "active" : "";
    allTab.setAttribute("aria-selected", String(filter === "all"));
    unvotedTab.className = filter === "unvoted" ? "active" : "";
    unvotedTab.setAttribute("aria-selected", String(filter === "unvoted"));
  }

  function buildGenreChips() {
    genreFilterWrap.innerHTML = "";
    genreFilterWrap.appendChild(genreChips(GENRES, currentGenreId, setGenre));
  }

  function matchesQuery(entry, q) {
    if (!q) return true;
    var needle = q.toLowerCase();
    var title = entry.track.title.toLowerCase();
    var artist = (entry.track.artist?.name || "").toLowerCase();
    var album = (entry.track.album?.title || "").toLowerCase();

    return (
      title.indexOf(needle) !== -1 ||
      artist.indexOf(needle) !== -1 ||
      album.indexOf(needle) !== -1
    );
  }

  function refreshResults() {
    var s = getState();

    // 1. Build Trending Artists
    var trending = getTrendingArtists(s);
    trendingWrap.innerHTML = "";
    if (trending.length > 0 && !query) {
      trendingWrap.appendChild(
        h(
          "div",
          { class: "explore-section-head" },
          h("h2", {}, "🔥 Trending Artists"),
          h("a", { href: "#/leaderboard", class: "see-all" }, "See all"),
        ),
      );
      var scrollRow = h("div", { class: "trending-artist-row" });
      trending.forEach(function (a) {
        var fallbackImg = "https://picsum.photos/seed/" + a._id + "/200";
        scrollRow.appendChild(
          h(
            "a",
            { href: "#/artist/" + a._id, class: "trending-artist-card" },
            h("img", {
              src: a.imageUrl || fallbackImg,
              alt: "",
              onError: (e) => (e.target.src = fallbackImg),
            }),
            h("span", { class: "artist-name" }, a.name),
            h(
              "span",
              { class: "artist-votes" },
              a.totalVotes.toLocaleString() + " votes",
            ),
          ),
        );
      });
      trendingWrap.appendChild(scrollRow);
    }

    // 2. Filter Tracks
    var entries = getBoard(s.cycle.id);
    var filtered = entries.filter(function (e) {
      if (!e.track || !e.track.artist) return false;
      if (filter === "unvoted" && e.votedByMe) return false;
      if (currentGenreId && e.track.genre !== currentGenreId) return false;
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
    if (filter === "unvoted")
      return "You've voted for everything in this category.";
    return "No tracks found.";
  }

  /* ---------- lifecycle ---------- */
  updateTabs();
  buildGenreChips();
  var unsub = subscribe(refreshResults);
  refreshResults();

  return { el: el, destroy: unsub };
}