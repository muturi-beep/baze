import { h } from "../dom.js";
import { subscribe, getState, getBoard } from "../store.js";

export function ResultsView() {
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var entries = getBoard(s.cycle.id);
    var total = entries.reduce(function (sum, e) {
      return sum + e.votes;
    }, 0);

    el.innerHTML = "";
    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("h1", {}, "Week " + s.cycle.weekNumber + " Results"),
        h("span", { class: "badge" }, "✓ CERTIFIED"),
      ),
    );
    el.appendChild(
      h(
        "p",
        { class: "muted" },
        s.cycle.city +
          " · " +
          s.cycle.genre +
          " · " +
          total.toLocaleString() +
          " votes",
      ),
    );
    el.appendChild(
      h(
        "ol",
        { class: "leaderboard" },
        entries.slice(0, 50).map(function (e, i) {
          var medal =
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + e.rank;
          return h(
            "li",
            {},
            h(
              "div",
              { class: "row-link" },
              h("span", { class: "rank" }, medal),
              h("span"),
              h(
                "div",
                { class: "meta" },
                h(
                  "span",
                  { class: "title" },
                  e.track.title + " — " + e.track.artist.name,
                ),
                h(
                  "span",
                  { class: "votes" },
                  e.votes.toLocaleString() + " fan votes",
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
