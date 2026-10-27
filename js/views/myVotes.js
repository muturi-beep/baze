import { h } from "../dom.js";
import { subscribe, getState, getBoard } from "../store.js";
import { rankDelta, emptyState, bottomNav } from "../components.js";

export function MyVotesView() {
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var entries = getBoard(s.cycle.id);
    var yourVotes = entries.filter(function (e) {
      return e.votedByMe;
    });
    var used = s.cycle.fanVoteBudget - s.user.votesRemaining;
    var pct = (used / s.cycle.fanVoteBudget) * 100;

    el.innerHTML = "";
    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h("h1", {}, "My Votes · Week " + s.cycle.weekNumber),
      ),
    );
    el.appendChild(
      h(
        "div",
        { class: "budget" },
        h(
          "div",
          {
            class: "progress",
            role: "progressbar",
            "aria-valuenow": String(used),
            "aria-valuemin": "0",
            "aria-valuemax": String(s.cycle.fanVoteBudget),
          },
          h("div", { class: "fill", style: { width: pct + "%" } }),
        ),
        h(
          "p",
          { class: "hint" },
          used + " of " + s.cycle.fanVoteBudget + " used",
        ),
      ),
    );
    el.appendChild(
      yourVotes.length === 0
        ? emptyState({
            message: "You haven't voted this week yet.",
            cta: { label: "Find something to vote for", to: "/" },
          })
        : h(
            "ol",
            { class: "leaderboard" },
            yourVotes.map(function (v) {
              return h(
                "li",
                {},
                h(
                  "a",
                  { class: "row-link", href: "#/track/" + v.track.id },
                  h("span", { class: "rank" }, "♥"),
                  rankDelta(v.previousRank, v.rank),
                  h("span", { class: "title" }, v.track.title),
                  h("span", { class: "votes" }, "#" + v.rank),
                ),
              );
            }),
          ),
    );
    el.appendChild(bottomNav("votes"));
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
