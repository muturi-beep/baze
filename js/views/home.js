import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getBoard,
  getGenres,
  getGenre,
  getAlbumBoard,
  getProducerBoard,
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
  producerCard,
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
          return e.track.genre === currentGenreId;
        })
      : allEntries;

    var trending = entries.slice(0, 4);
    var topAlbums = getAlbumBoard(s.cycle.id, currentGenreId).slice(0, 4);
    var topProducers = getProducerBoard(s.cycle.id, currentGenreId).slice(0, 4);

    el.innerHTML = "";

    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("button", { "aria-label": "menu" }, "☰"),
        h("span", { class: "brand" }, "BAZE"),
        h("a", { href: "#/me", "aria-label": "profile" }, "👤"),
      ),
    );

    el.appendChild(cycleBanner(s.cycle));
    el.appendChild(genreChips(getGenres(), currentGenreId, setGenre));

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
                      e.track.title + " — " + e.track.artist.name,
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

    // ---- Top producers ----
    if (topProducers.length > 0) {
      el.appendChild(
        h(
          "section",
          {},
          h(
            "div",
            { class: "section-head" },
            h("h2", {}, sectionLabel("Top producers", genre)),
            h(
              "a",
              { class: "see-all", href: "#/producers" },
              "All producers →",
            ),
          ),
          h(
            "ol",
            { class: "producer-list" },
            topProducers.map(function (p) {
              return h(
                "li",
                {},
                producerCard({
                  producer: p.producer,
                  rank: p.rank,
                  votes: p.votes,
                  trackCount: p.trackCount,
                }),
              );
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
