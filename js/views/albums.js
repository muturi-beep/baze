import { h } from "../dom.js";
import { subscribe, getState, getAlbumBoard, getArtist } from "../store.js";
import { emptyState, bottomNav } from "../components.js";
import { formatRemaining } from "../format.js";

export function AlbumsView() {
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var board = getAlbumBoard(s.cycle.id);

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
        h("h1", {}, "Album Rankings"),
        h("span", { class: "countdown" }, formatRemaining(s.cycle.endsAt)),
      ),
    );

    el.appendChild(
      h(
        "p",
        { class: "muted section-note" },
        "Albums ranked by total votes across their tracks.",
      ),
    );

    if (board.length === 0) {
      el.appendChild(emptyState({ message: "No albums yet this week." }));
    } else {
      el.appendChild(
        h(
          "div",
          { class: "album-grid" },
          board.map(function (a, i) {
            var artist = a.album ? getArtist(a.album.artistId) : null;
            return h(
              "a",
              { class: "album-tile", href: "#/album/" + a.albumId },
              h(
                "div",
                { class: "album-tile-art" },
                h("img", { src: a.album.artworkUrl, alt: "" }),
                h("span", { class: "album-rank" }, "#" + a.rank),
              ),
              h("span", { class: "album-title" }, a.album.title),
              h("span", { class: "album-artist" }, artist ? artist.name : ""),
              h(
                "span",
                { class: "album-votes" },
                a.votes.toLocaleString() + " votes",
              ),
            );
          }),
        ),
      );
    }

    el.appendChild(bottomNav("home"));
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
