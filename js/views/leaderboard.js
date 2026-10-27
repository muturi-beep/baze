import { h } from "../dom.js";
import { subscribe, getState, getBoard } from "../store.js";
import { leaderboardRow, rankDelta, emptyState } from "../components.js";
import { formatRemaining } from "../format.js";

export function LeaderboardView() {
  var el = h("main", { class: "screen" });
  var tab = "all";

  function render() {
    var s = getState();
    var entries = getBoard(s.cycle.id);
    var yourVotes = entries.filter(function (e) {
      return e.votedByMe;
    });
    el.innerHTML = "";
    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("h1", {}, s.cycle.city + " " + s.cycle.genre),
        h("span", { class: "countdown" }, formatRemaining(s.cycle.endsAt)),
      ),
    );
    el.appendChild(
      h(
        "div",
        { role: "tablist", class: "tabs", "aria-label": "leaderboard view" },
        ["all", "fan", "jury"].map(function (t) {
          return h(
            "button",
            {
              role: "tab",
              "aria-selected": String(tab === t),
              class: tab === t ? "active" : "",
              onClick: function () {
                tab = t;
                render();
              },
            },
            t === "all" ? "All" : t === "fan" ? "Fan" : "Jury",
          );
        }),
      ),
    );
    el.appendChild(
      entries.length === 0
        ? emptyState({
            message: "Be the first to vote this week.",
            cta: { label: "Find tracks", to: "/" },
          })
        : h("ol", { class: "leaderboard" }, entries.map(leaderboardRow)),
    );
    if (yourVotes.length > 0) {
      el.appendChild(
        h(
          "section",
          { class: "your-votes" },
          h("h2", {}, "Your votes"),
          h(
            "ul",
            {},
            yourVotes.map(function (v) {
              return h(
                "li",
                {},
                "♥ " + v.track.title + " · #" + v.rank + " ",
                rankDelta(v.previousRank, v.rank),
              );
            }),
          ),
        ),
      );
    }
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
