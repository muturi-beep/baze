import confetti from "canvas-confetti";
import { h } from "../dom.js";
// 🚨 FIX: Imported syncLeaderboard
import { subscribe, getState, getTrack, getBoard, castVote, syncLeaderboard } from "../store.js";
// 🚨 FIX: Imported showPaymentModal
import { voteButton, rankDelta, showToast, showShareModal, showPaymentModal } from "../components.js";
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
      el.innerHTML = "<p>Track not found.</p>";
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
          { "aria-label": "back", onClick: () => history.back() },
          "←",
        ),
        h("button", { "aria-label": "more options" }, "⋯"),
      ),
    );

    var fallbackImg = "https://picsum.photos/seed/" + track.id + "/400";
    var imageUrl = track.artworkUrl || fallbackImg;

    el.appendChild(
      h("img", {
        src: imageUrl,
        alt: "",
        class: "artwork",
        onError: function (e) {
          e.target.src = fallbackImg;
        },
      }),
    );

    var details = h("div", { class: "track-details" });

    details.appendChild(h("h1", { class: "track-title" }, track.title));

    details.appendChild(
      h(
        "p",
        { class: "track-artist" },
        h(
          "a",
          { href: "#/artist/" + track.artistId },
          track.artist ? track.artist.name : "Unknown Artist",
        ),
        track.artist && track.artist.claimedBy
          ? h("span", { class: "verified" }, "✓ claimed")
          : null,
      ),
    );

    var metaItems = [];
    if (track.album) {
      metaItems.push(
        h("a", { href: "#/album/" + track.albumId }, track.album.title),
      );
    }
    if (track.releaseDate) metaItems.push(track.releaseDate.split("-")[0]);

    if (track.durationMs) {
      var mins = Math.floor(track.durationMs / 60000);
      var secs = Math.floor((track.durationMs % 60000) / 1000);
      metaItems.push(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

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

    if (track.youtubeVideoId) {
      const origin = window.location.origin;
      const embedUrl = `https://www.youtube.com/embed/${track.youtubeVideoId}?origin=${encodeURIComponent(origin)}&enablejsapi=1&rel=0`;

      details.appendChild(
        h(
          "div",
          { class: "youtube-player", style: { margin: "24px 0", borderRadius: "12px", overflow: "hidden" } },
          h("iframe", {
            width: "100%",
            height: "200",
            src: embedUrl,
            title: "YouTube video player",
            frameborder: "0",
            referrerpolicy: "strict-origin-when-cross-origin",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            allowfullscreen: true,
          }),
        ),
      );

      details.appendChild(
        h(
          "a",
          {
            href: `https://www.youtube.com/watch?v=${track.youtubeVideoId}`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { display: "block", textAlign: "center", marginTop: "12px", fontSize: "13px", color: "var(--accent)", textDecoration: "none" },
          },
          "If the player fails, watch directly on YouTube →",
        ),
      );
    }

    var isOwnTrack = s.user.claimedArtistId && s.user.claimedArtistId === track.artistId;

    if (isOwnTrack) {
      details.appendChild(
        h(
          "div",
          { class: "vote-wrap", style: { margin: "24px 0" } },
          h(
            "div",
            { class: "badge", style: { background: "var(--bg-elev)", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "12px", display: "block", textAlign: "center" } },
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
        h("li", {}, "🎵 " + (track.genre || s.cycle.genre)),
        h("li", {}, "⏱ " + formatRemaining(s.cycle.endsAt)),
      ),
    );

    details.appendChild(
      h(
        "div",
        { class: "actions" },
        h("button", { onClick: handleShare }, "Share"),
        h("button", { onClick: () => { location.hash = "#/report/" + track.id; } }, "Report"),
      ),
    );

    el.appendChild(details);
  }

  function handleVote() {
    var s = getState();
    if (!s.user.verified) {
      location.hash = "#/login";
      return;
    }

    // 🚨 NEW: Intercept the click if they are out of votes!
    if (s.user.votesRemaining <= 0) {
      showPaymentModal(s.user.id, async () => {
        await syncLeaderboard(); // Refresh the local state from the DB
        handleVote(); // Retry the vote automatically
      });
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

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ff8a3d", "#3ddc84", "#f5f5f7"],
        });

        if (rankBefore != null) {
          var text =
            rankAfter < rankBefore
              ? "You moved this from #" + rankBefore + " → #" + rankAfter
              : rankAfter > rankBefore
                ? "Rank shifted #" + rankBefore + " → #" + rankAfter
                : "Vote counted. Rank unchanged.";
          showToast(text);
        }

        var track = getTrack(trackId);
        setTimeout(function() {
          showShareModal(track, function() {});
        }, 800); 

      })
      .catch(function (err) {
        // Fallback check just in case the backend rejects it
        if (err && err.code === "NO_VOTES_LEFT") {
          voteState = "idle";
          render();
          showPaymentModal(s.user.id, async () => {
            await syncLeaderboard(); 
            handleVote(); 
          });
        } else if (err && err.code === "CANNOT_VOTE_FOR_SELF") {
          showToast("You cannot vote for your own track");
          voteState = "idle";
          render();
        } else if (err && err.code === "ALREADY_VOTED") {
          voteState = "voted";
          render();
        } else {
          voteState = "error";
          render();
        }
      });
  }

  function handleShare() {
    var url = window.location.origin + "/share/track/" + trackId;
    var track = getTrack(trackId);

    if (navigator.share) {
      navigator.share({ url: url, title: track ? track.title : "Track" }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast("Link copied");
    }
  }

  var unsub = subscribe(render);
  render();
  return { el: el, destroy: unsub };
}