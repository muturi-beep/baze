import { h } from "../dom.js";
import { getState, getArtist, getArtistTotals } from "../store.js";
import { showToast, bottomNav } from "../components.js";

export function DashboardView() {
  var el = h("main", { class: "screen" });
  var s = getState();

  if (!s.user.verified || !s.claimedArtistId) {
    el.appendChild(
      h(
        "div",
        { class: "empty" },
        h(
          "p",
          {},
          "You need to claim an artist profile to view this dashboard.",
        ),
        h("a", { class: "cta", href: "#/claim" }, "Claim Profile"),
      ),
    );
    return { el, destroy: () => {} };
  }

  var artist = getArtist(s.claimedArtistId);
  var totals = getArtistTotals(s.cycle.id, s.claimedArtistId);
  var topTrack = totals.tracks[0];

  function render() {
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
        h("h1", {}, "Artist Dashboard"),
        h("span"),
      ),
    );

    el.appendChild(
      h(
        "div",
        { class: "artist-dash-hero" },
        h(
          "h2",
          { style: { fontSize: "28px", margin: "0 0 8px" } },
          artist ? artist.name : "Artist",
        ),
        h(
          "span",
          {
            class: "badge",
            style: {
              background: "rgba(61, 220, 132, 0.15)",
              color: "var(--success)",
            },
          },
          "✓ Verified Artist",
        ),
        h(
          "p",
          { class: "muted", style: { marginTop: "16px" } },
          "Week " + s.cycle.weekNumber + " Performance",
        ),
      ),
    );

    el.appendChild(
      h(
        "div",
        { class: "artist-stats-grid" },
        h(
          "div",
          { class: "artist-stat-card" },
          h("span", { class: "artist-stat-label" }, "Total Votes"),
          h(
            "span",
            { class: "artist-stat-value" },
            totals.totalVotes.toLocaleString(),
          ),
        ),
        h(
          "div",
          { class: "artist-stat-card" },
          h("span", { class: "artist-stat-label" }, "Tracks in Cycle"),
          h("span", { class: "artist-stat-value" }, totals.trackCount),
        ),
      ),
    );

    if (topTrack) {
      el.appendChild(
        h(
          "div",
          { class: "artist-share-card" },
          h(
            "div",
            { style: { marginBottom: "16px" } },
            h(
              "p",
              {
                class: "muted",
                style: {
                  margin: "0 0 4px",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                },
              },
              "Your Top Track",
            ),
            h(
              "h3",
              { style: { margin: "0 0 4px", fontSize: "18px" } },
              topTrack.track.title,
            ),
            h(
              "p",
              {
                style: {
                  margin: 0,
                  fontWeight: "700",
                  color: "var(--accent)",
                  fontSize: "20px",
                },
              },
              `#${topTrack.rank} Rank`,
            ),
            h(
              "p",
              {
                class: "muted",
                style: { margin: "4px 0 0", fontSize: "14px" },
              },
              `${topTrack.votes.toLocaleString()} votes`,
            ),
          ),
          h(
            "button",
            {
              class: "claim-primary",
              style: {
                marginTop: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              },
              onClick: () => shareRank(topTrack),
            },
            "📢 Share Your Rank",
          ),
        ),
      );
    } else {
      el.appendChild(
        h(
          "div",
          { class: "empty", style: { padding: "32px 0" } },
          h("p", {}, "No votes yet this week."),
          h(
            "p",
            { class: "muted", style: { fontSize: "13px" } },
            "Share your track link with fans to get on the board!",
          ),
        ),
      );
    }

    if (totals.tracks.length > 0) {
      el.appendChild(
        h(
          "h2",
          {
            style: {
              fontSize: "16px",
              marginTop: "32px",
              marginBottom: "16px",
            },
          },
          "All Your Tracks",
        ),
      );
      el.appendChild(
        h(
          "ul",
          { class: "leaderboard" },
          totals.tracks.map(function (t) {
            return h(
              "li",
              {},
              h(
                "a",
                { class: "row-link", href: "#/track/" + t.trackId },
                h("span", { class: "rank" }, "#" + t.rank),
                h(
                  "div",
                  { class: "meta" },
                  h("span", { class: "title" }, t.track.title),
                  h(
                    "span",
                    { class: "votes" },
                    t.votes.toLocaleString() + " votes",
                  ),
                ),
              ),
            );
          }),
        ),
      );
    }

    el.appendChild(bottomNav("me"));
  }

  function shareRank(trackEntry) {
    var text = `I'm currently #${trackEntry.rank} on Baze with "${trackEntry.track.title}"! Vote for me here:`;
    var url = window.location.origin + "/#/track/" + trackEntry.trackId;

    if (navigator.share) {
      navigator
        .share({
          title: "Vote for " + trackEntry.track.title,
          text: text,
          url: url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text + " " + url);
      showToast("Share link copied to clipboard!");
    }
  }

  render();
  return { el, destroy: () => {} };
}
