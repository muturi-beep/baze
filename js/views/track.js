import { h } from "../dom.js";
import {
  subscribe,
  getState,
  getTrack,
  getBoard,
  verifyUser,
  castVote,
} from "../store.js";
import { voteButton, rankDelta, showToast, authSheet } from "../components.js";
import { formatDuration, formatRemaining } from "../format.js";

export function TrackView(params) {
  var trackId = params.trackId;
  var el = h("main", { class: "screen track-page" });
  var voteState = "idle";
  var authOpen = false;
  var verifying = false;
  var rankBefore = null;
  var rankAfter = null;
  var authSheetEl = null;

  function render() {
    var s = getState();
    var track = getTrack(trackId);
    if (!track) {
      el.textContent = "Track not found";
      return;
    }

    var entry = getBoard(s.cycle.id).find(function (e) {
      return e.trackId === trackId;
    });
    var voted = entry ? entry.votedByMe : false;
    if (voted && voteState !== "voted") voteState = "voted";
    if (!voted && voteState === "voted") voteState = "idle";
    var budgetUsed = s.cycle.fanVoteBudget - s.user.votesRemaining;
    var currentRank = rankAfter != null ? rankAfter : entry ? entry.rank : null;

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
        h("button", { "aria-label": "more options" }, "⋯"),
      ),
    );
    el.appendChild(
      h("img", { src: track.artworkUrl, alt: "", class: "artwork" }),
    );
    el.appendChild(h("h1", { class: "track-title" }, track.title));
    el.appendChild(
      h(
        "p",
        { class: "track-artist" },
        h("a", { href: "#/artist/" + track.artist.id }, track.artist.name),
        track.artist.claimed
          ? h("span", { class: "verified" }, "✓ claimed")
          : null,
      ),
    );

    // album + producer meta lines
    var metaItems = [];
    if (track.album) {
      metaItems.push(
        h("a", { href: "#/album/" + track.album.id }, track.album.title),
      );
    }
    metaItems.push(track.year);
    metaItems.push(formatDuration(track.durationSec));

    el.appendChild(
      h(
        "p",
        { class: "track-meta" },
        metaItems.reduce(function (acc, m) {
          if (acc.length) acc.push(" · ");
          acc.push(m);
          return acc;
        }, []),
      ),
    );

    if (track.producers && track.producers.length) {
      var producerNodes = [h("span", { class: "muted" }, "Produced by ")];
      track.producers.forEach(function (p, i) {
        if (i > 0) producerNodes.push(", ");
        producerNodes.push(h("a", { href: "#/producer/" + p.id }, p.name));
      });
      el.appendChild(h("p", { class: "track-producers" }, producerNodes));
    }

    el.appendChild(
      voteButton({
        state: voteState,
        budgetUsed: budgetUsed,
        budgetTotal: s.cycle.fanVoteBudget,
        onVote: handleVote,
      }),
    );

    var rankChildren = [
      "Rank ",
      h("strong", {}, "#" + (currentRank != null ? currentRank : "—")),
      " of " + s.cycle.trackCount,
    ];
    if (rankBefore != null && rankAfter != null && rankBefore !== rankAfter) {
      rankChildren.push(" · ", rankDelta(rankBefore, rankAfter));
    }
    el.appendChild(
      h("div", { class: "rank-line", "aria-live": "polite" }, rankChildren),
    );

    el.appendChild(
      h(
        "ul",
        { class: "tags" },
        h("li", {}, "🏙 " + s.cycle.city),
        h("li", {}, "🎵 " + s.cycle.genre),
        h("li", {}, "⏱ " + formatRemaining(s.cycle.endsAt)),
      ),
    );

    el.appendChild(
      h(
        "div",
        { class: "actions" },
        h("button", { onClick: handleShare }, "Share"),
        h(
          "button",
          {
            onClick: function () {
              location.hash = "#/report/" + track.id;
            },
          },
          "Report",
        ),
      ),
    );

    if (authOpen) {
      authSheetEl = authSheet({
        pending: verifying,
        onClose: function () {
          authOpen = false;
          render();
        },
        onVerify: handleVerify,
      });
      document.body.appendChild(authSheetEl);
    } else if (authSheetEl && authSheetEl.parentNode) {
      authSheetEl.parentNode.removeChild(authSheetEl);
      authSheetEl = null;
    }
  }

  function handleVote() {
    var s = getState();
    if (!s.user.verified) {
      authOpen = true;
      render();
      return;
    }
    var entry = getBoard(s.cycle.id).find(function (e) {
      return e.trackId === trackId;
    });
    rankBefore = entry ? entry.rank : null;
    rankAfter = null;
    voteState = "voting";
    render();
    castVote(s.cycle.id, trackId)
      .then(function (res) {
        voteState = "voted";
        rankAfter = res.rank;
        render();
        if (rankBefore != null) {
          var text =
            rankAfter < rankBefore
              ? "You moved this from #" + rankBefore + " → #" + rankAfter
              : rankAfter > rankBefore
                ? "Rank shifted #" + rankBefore + " → #" + rankAfter
                : "Vote counted. Rank unchanged.";
          showToast(text);
        }
      })
      .catch(function (err) {
        voteState = err && err.code === "ALREADY_VOTED" ? "voted" : "error";
        render();
      });
  }

  function handleVerify() {
    verifying = true;
    render();
    verifyUser().then(function () {
      authOpen = false;
      verifying = false;
      handleVote();
    });
  }

  function handleShare() {
    var url = location.href;
    var track = getTrack(trackId);
    if (navigator.share) {
      navigator
        .share({ url: url, title: track ? track.title : "Track" })
        .catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast("Link copied");
    }
  }

  var unsub = subscribe(render);
  render();
  return {
    el: el,
    destroy: function () {
      unsub();
      if (authSheetEl && authSheetEl.parentNode)
        authSheetEl.parentNode.removeChild(authSheetEl);
    },
  };
}
