import { h } from "../dom.js";
import { subscribe, getState, getProducerBoard } from "../store.js";
import { emptyState, bottomNav } from "../components.js";
import { formatRemaining } from "../format.js";

export function ProducersView() {
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var board = getProducerBoard(s.cycle.id);

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
        h("h1", {}, "Producer Rankings"),
        h("span", { class: "countdown" }, formatRemaining(s.cycle.endsAt)),
      ),
    );

    el.appendChild(
      h(
        "p",
        { class: "muted section-note" },
        "Producers ranked by total votes across tracks they produced.",
      ),
    );

    if (board.length === 0) {
      el.appendChild(emptyState({ message: "No producer data yet." }));
    } else {
      el.appendChild(
        h(
          "ol",
          { class: "producer-board" },
          board.map(function (p) {
            return h(
              "li",
              {},
              h(
                "a",
                {
                  class: "producer-board-row",
                  href: "#/producer/" + p.producerId,
                },
                h("span", { class: "rank" }, "#" + p.rank),
                h(
                  "div",
                  { class: "meta" },
                  h("span", { class: "title" }, p.producer.name),
                  h(
                    "span",
                    { class: "votes" },
                    p.votes.toLocaleString() +
                      " votes · " +
                      p.trackCount +
                      " track" +
                      (p.trackCount === 1 ? "" : "s"),
                  ),
                ),
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
