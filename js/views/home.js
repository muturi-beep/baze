import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getBoard,
  getGenres,
  getGenre,
  getAlbumBoard,
  getArtist,
} from "../store.js";
import {
  cycleBanner,
  trackCard,
  rankDelta,
  emptyState,
  bottomNav,
  genreChips,
  albumCard,
} from "../components.js";

export function HomeView() {
  var el = h("main", { class: "screen home" });
  var currentGenreId = null;

  function setGenre(id) {
    currentGenreId = id;
    render();
  }

  function sectionLabel(base, genre) {
    return genre ? base + " · " + genre.name : base;
  }

  function render() {
    var s = getState();
    var genre = currentGenreId ? getGenre(currentGenreId) : null;

    var allEntries = getBoard(s.cycle.id);
    var entries = currentGenreId
      ? allEntries.filter(function (e) {
          return e.track && e.track.genre === currentGenreId;
        })
      : allEntries;

    var trending = entries
      .filter(function (e) {
        return e.track && e.track.artist && e.track.album;
      })
      .slice(0, 4);
    var topAlbums = getAlbumBoard(s.cycle.id, currentGenreId).slice(0, 4);

    el.innerHTML = "";

    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("button", { "aria-label": "menu" }, "☰"),
        h("span", { class: "brand" }, "BAZE"),
        h(
          "a",
          {
            href: s.user.verified ? "#/me" : "#/login",
            "aria-label": "profile",
            class: "topbar-avatar",
          },
          s.user.verified ? s.user.name.charAt(0).toUpperCase() : "👤",
        ),
      ),
    );

    el.appendChild(cycleBanner(s.cycle));
    el.appendChild(genreChips(getGenres(), currentGenreId, setGenre));

    // --- HALL OF FAME LINK ---
    el.appendChild(
      h(
        "div",
        { style: { marginBottom: "24px", textAlign: "center" } },
        h(
          "a",
          {
            href: "#/results",
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "rgba(255, 138, 61, 0.1)",
              border: "1px solid var(--accent)",
              borderRadius: "999px",
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
            },
          },
          "🏆 View Hall of Fame",
        ),
      ),
    );

    // ---- Trending now ----
    var trendingHeading = genre ? "Trending in " + genre.name : "Trending now";
    var seeBoardHref = currentGenreId
      ? "#/genre/" + currentGenreId
      : "#/leaderboard";

    el.appendChild(
      h(
        "section",
        {},
        h(
          "div",
          { class: "section-head" },
          h("h2", {}, trendingHeading),
          h("span", { class: "live-dot" }, "● LIVE"),
        ),
        trending.length === 0
          ? emptyState({
              message:
                "No votes in " + (genre ? genre.name : "this cycle") + " yet.",
            })
          : h(
              "ol",
              { class: "trending-list" },
              trending.map(function (e) {
                return h(
                  "li",
                  {},
                  h(
                    "a",
                    { class: "row-link", href: "#/track/" + e.track.id },
                    h("span", { class: "rank" }, "#" + e.rank),
                    rankDelta(e.previousRank, e.rank),
                    h(
                      "span",
                      { class: "title" },
                      e.track.title +
                        " — " +
                        (e.track.artist?.name || "Unknown"),
                    ),
                    h("span", { class: "votes" }, e.votes.toLocaleString()),
                  ),
                );
              }),
            ),
        h("a", { class: "see-all", href: seeBoardHref }, "See full board →"),
      ),
    );

    // ---- Top albums ----
    if (topAlbums.length > 0) {
      el.appendChild(
        h(
          "section",
          {},
          h(
            "div",
            { class: "section-head" },
            h("h2", {}, sectionLabel("Top albums", genre)),
            h("a", { class: "see-all", href: "#/albums" }, "All albums →"),
          ),
          h(
            "div",
            { class: "album-row" },
            topAlbums.map(function (a) {
              return albumCard({
                album: a.album,
                artist: a.album ? getArtist(a.album.artistId) : null,
                votes: a.votes,
              });
            }),
          ),
        ),
      );
    }

    // ---- For you ----
    if (entries.length > 0) {
      el.appendChild(
        h(
          "section",
          {},
          h("h2", {}, genre ? "More " + genre.name : "For you"),
          h(
            "div",
            { class: "card-row" },
            entries.slice(0, 6).map(function (e) {
              return trackCard(e.track);
            }),
          ),
        ),
      );
    }

    // ---- New this week ----
    if (entries.length > 0) {
      el.appendChild(
        h(
          "section",
          {},
          h("h2", {}, "New this week"),
          h(
            "div",
            { class: "card-row" },
            entries.slice(-6).map(function (e) {
              return trackCard(e.track);
            }),
          ),
        ),
      );
    }

    el.appendChild(bottomNav("home"));
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
