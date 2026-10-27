import { h } from "../dom.js";
import { subscribe, getState, getArtist, getArtistTotals } from "../store.js";
import { leaderboardRow, emptyState } from "../components.js";

export function ArtistView(params) {
  var artistId = params.artistId;
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var artist = getArtist(artistId);

    if (!artist) {
      el.innerHTML = "";
      el.appendChild(
        h(
          "div",
          { class: "empty" },
          h("p", {}, "Artist not found."),
          h("a", { class: "cta", href: "#/" }, "Back home"),
        ),
      );
      return;
    }

    var totals = getArtistTotals(s.cycle.id, artistId);

    el.innerHTML = "";

    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h(
          "button",
          {
            "aria-label": "back",
            onClick: function () {
              history.back();
            },
          },
          "←",
        ),
        h("span"),
        h("span"),
      ),
    );

    el.appendChild(
      h(
        "div",
        { class: "producer-hero" },
        h("div", { class: "producer-avatar" }, "🎤"),
        h("h1", { class: "producer-hero-title" }, artist.name),
        artist.claimed ? h("span", { class: "verified" }, "✓ claimed") : null,
        h(
          "p",
          { class: "producer-hero-meta" },
          totals.trackCount +
            " track" +
            (totals.trackCount === 1 ? "" : "s") +
            " · " +
            totals.totalVotes.toLocaleString() +
            " total votes",
        ),
      ),
    );

    if (totals.tracks.length === 0) {
      el.appendChild(emptyState({ message: "No tracks by this artist yet." }));
    } else {
      el.appendChild(
        h("h2", { class: "album-section-title" }, "Tracks this week"),
      );
      el.appendChild(
        h("ol", { class: "leaderboard" }, totals.tracks.map(leaderboardRow)),
      );
    }
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
