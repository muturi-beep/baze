import { h } from "../dom.js";
import { subscribe, getState, getTrack, getBoard, castVote } from "../store.js";
import { voteButton, rankDelta, showToast } from "../components.js";
import { formatDuration, formatRemaining } from "../format.js";

export function TrackView(params) {
  var trackId = params.trackId;
  var el = h("main", { class: "screen track-page" });
  var voteState = "idle";
  var rankBefore = null;
  var rankAfter = null;

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

    // 1. The Image
    el.appendChild(
      h("img", { src: track.artworkUrl, alt: "", class: "artwork" }),
    );

    // 2. Wrap all details in a container to fix the desktop grid spacing
    var details = h("div", { class: "track-details" });

    details.appendChild(h("h1", { class: "track-title" }, track.title));
    details.appendChild(
      h(
        "p",
        { class: "track-artist" },
        h("a", { href: "#/artist/" + track.artist.id }, track.artist.name),
        track.artist.claimed
          ? h("span", { class: "verified" }, "✓ claimed")
          : null,
      ),
    );

    var metaItems = [];
    if (track.album) {
      metaItems.push(
        h("a", { href: "#/album/" + track.album.id }, track.album.title),
      );
    }
    metaItems.push(track.year);
    metaItems.push(formatDuration(track.durationSec));

    details.appendChild(
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
      details.appendChild(h("p", { class: "track-producers" }, producerNodes));
    }

    // --- CHECK IF USER OWNS THE TRACK ---
    var isOwnTrack =
      s.user.claimedArtistId && s.user.claimedArtistId === track.artistId;

    if (isOwnTrack) {
      details.appendChild(
        h(
          "div",
          { class: "vote-wrap", style: { margin: "24px 0" } },
          h(
            "div",
            {
              class: "badge",
              style: {
                background: "var(--bg-elev)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                padding: "12px",
                display: "block",
                textAlign: "center",
              },
            },
            "🎤 You cannot vote for your own track",
          ),
        ),
      );
    } else {
      details.appendChild(
        voteButton({
          state: voteState,
          budgetUsed: budgetUsed,
          budgetTotal: s.cycle.fanVoteBudget,
          onVote: handleVote,
        }),
      );
    }
    // -------------------------------------------

    var rankChildren = [
      "Rank ",
      h("strong", {}, "#" + (currentRank != null ? currentRank : "—")),
      " of " + s.cycle.trackCount,
    ];
    if (rankBefore != null && rankAfter != null && rankBefore !== rankAfter) {
      rankChildren.push(" · ", rankDelta(rankBefore, rankAfter));
    }
    details.appendChild(
      h("div", { class: "rank-line", "aria-live": "polite" }, rankChildren),
    );

    details.appendChild(
      h(
        "ul",
        { class: "tags" },
        h("li", {}, "🏙 " + s.cycle.city),
        h("li", {}, "🎵 " + s.cycle.genre),
        h("li", {}, "⏱ " + formatRemaining(s.cycle.endsAt)),
      ),
    );

    details.appendChild(
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

    // 3. Append the wrapped details block to the main view
    el.appendChild(details);
  }

  function handleVote() {
    var s = getState();

    // If not verified, send to the real login page
    if (!s.user.verified) {
      location.hash = "#/login";
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
        // Handle the self-vote error just in case the backend catches it
        if (err && err.code === "CANNOT_VOTE_FOR_SELF") {
          showToast("You cannot vote for your own track");
          voteState = "idle";
        } else if (err && err.code === "ALREADY_VOTED") {
          voteState = "voted";
        } else {
          voteState = "error";
        }
        render();
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
  return { el: el, destroy: unsub };
}
