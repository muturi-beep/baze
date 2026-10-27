import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getAlbum,
  getAlbumTracks,
  getArtist,
} from "../store.js";
import { leaderboardRow, emptyState } from "../components.js";

export function AlbumView(params) {
  var albumId = params.albumId;
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var album = getAlbum(albumId);

    if (!album) {
      el.innerHTML = "";
      el.appendChild(
        h(
          "div",
          { class: "empty" },
          h("p", {}, "Album not found."),
          h("a", { class: "cta", href: "#/albums" }, "All albums"),
        ),
      );
      return;
    }

    var artist = getArtist(album.artistId);
    var tracks = getAlbumTracks(s.cycle.id, albumId);
    var totalVotes = tracks.reduce(function (sum, t) {
      return sum + t.votes;
    }, 0);

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
        { class: "album-hero" },
        h("img", { src: album.artworkUrl, alt: "", class: "album-hero-art" }),
        h("h1", { class: "album-hero-title" }, album.title),
        h(
          "a",
          {
            class: "album-hero-artist",
            href: artist ? "#/artist/" + artist.id : "#",
          },
          artist ? artist.name : "Unknown",
        ),
        h("p", { class: "album-hero-meta" }, album.year + " · " + album.genre),
        h(
          "p",
          { class: "album-hero-votes" },
          totalVotes.toLocaleString() + " total votes",
        ),
      ),
    );

    if (tracks.length === 0) {
      el.appendChild(emptyState({ message: "No tracks in this album yet." }));
    } else {
      el.appendChild(h("h2", { class: "album-section-title" }, "Tracks"));
      el.appendChild(
        h("ol", { class: "leaderboard" }, tracks.map(leaderboardRow)),
      );
    }
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
