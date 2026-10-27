import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getProducer,
  getProducerTracks,
} from "../store.js";
import { leaderboardRow, emptyState } from "../components.js";

export function ProducerView(params) {
  var producerId = params.producerId;
  var el = h("main", { class: "screen" });

  function render() {
    var s = getState();
    var producer = getProducer(producerId);

    if (!producer) {
      el.innerHTML = "";
      el.appendChild(
        h(
          "div",
          { class: "empty" },
          h("p", {}, "Producer not found."),
          h("a", { class: "cta", href: "#/producers" }, "All producers"),
        ),
      );
      return;
    }

    var tracks = getProducerTracks(s.cycle.id, producerId);
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
        { class: "producer-hero" },
        h("div", { class: "producer-avatar" }, "🎛"),
        h("h1", { class: "producer-hero-title" }, producer.name),
        producer.claimed ? h("span", { class: "verified" }, "✓ claimed") : null,
        h(
          "p",
          { class: "producer-hero-meta" },
          tracks.length +
            " track" +
            (tracks.length === 1 ? "" : "s") +
            " · " +
            totalVotes.toLocaleString() +
            " total votes",
        ),
      ),
    );

    if (tracks.length === 0) {
      el.appendChild(
        emptyState({ message: "No tracks by this producer yet." }),
      );
    } else {
      el.appendChild(
        h("h2", { class: "album-section-title" }, "Tracks produced"),
      );
      el.appendChild(
        h("ol", { class: "leaderboard" }, tracks.map(leaderboardRow)),
      );
    }
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}
