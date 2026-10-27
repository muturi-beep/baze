import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getGenre,
  getGenreBoard,
  getGenres,
} from "../store.js";
import {
  leaderboardRow,
  emptyState,
  bottomNav,
  genreChips,
} from "../components.js";
import { formatRemaining } from "../format.js";

export function GenreView(params) {
  var genreId = params.genreId;
  var el = h("main", { class: "screen genre-page" });

  function render() {
    var s = getState();
    var genre = getGenre(genreId);

    el.innerHTML = "";

    if (!genre) {
      el.appendChild(
        h(
          "div",
          { class: "empty" },
          h("p", {}, "That genre doesn't exist."),
          h("a", { class: "cta", href: "#/" }, "Back to home"),
        ),
      );
      return;
    }

    var entries = getGenreBoard(s.cycle.id, genreId);
    var yourVotes = entries.filter(function (e) {
      return e.votedByMe;
    });

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
        h("h1", {}, genre.emoji + " " + genre.name),
        h("span", { class: "countdown" }, formatRemaining(s.cycle.endsAt)),
      ),
    );

    el.appendChild(genreChips(getGenres(), genreId));

    if (entries.length === 0) {
      el.appendChild(
        emptyState({
          message: "No tracks in this genre yet.",
          cta: { label: "Explore all tracks", to: "/explore" },
        }),
      );
    } else {
      el.appendChild(
        h("ol", { class: "leaderboard" }, entries.map(leaderboardRow)),
      );
    }

    if (yourVotes.length > 0) {
      el.appendChild(
        h(
          "section",
          { class: "your-votes" },
          h("h2", {}, "Your " + genre.name + " votes"),
          h(
            "ul",
            {},
            yourVotes.map(function (v) {
              return h("li", {}, "♥ " + v.track.title + " · #" + v.rank);
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
