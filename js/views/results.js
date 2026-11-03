import { h } from "../dom.js";
import { bottomNav, emptyState } from "../components.js";
import { api } from "../api.js";

export function ResultsView() {
  const el = h("main", { class: "screen" });
  let loading = true;
  let results = [];

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
        h("h1", {}, "Hall of Fame"),
        h("span"),
      ),
    );

    el.appendChild(
      h(
        "p",
        { class: "muted", style: { marginBottom: "24px" } },
        "Certified weekly winners. Once a week closes, these rankings are frozen forever.",
      ),
    );

    if (loading) {
      el.appendChild(
        h(
          "div",
          { class: "skeleton-list" },
          h("div", { class: "skeleton-row" }),
          h("div", { class: "skeleton-row" }),
        ),
      );
    } else if (results.length === 0) {
      el.appendChild(
        emptyState({
          message:
            "No weeks have been certified yet. Check back after Sunday at midnight!",
          cta: { label: "See current rankings", to: "/leaderboard" },
        }),
      );
    } else {
      results.forEach((week) => {
        el.appendChild(renderWeek(week));
      });
    }

    el.appendChild(bottomNav("home"));
  }

  function renderWeek(week) {
    // Show top 3 tracks
    const topTracks = week.results.slice(0, 3);
    const remainingCount = Math.max(0, week.results.length - 3);

    return h(
      "div",
      {
        style: {
          background: "var(--bg-elev)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          },
        },
        h(
          "h2",
          { style: { margin: 0, fontSize: "18px" } },
          `Week ${week.weekNumber}`,
        ),
        h(
          "span",
          {
            style: {
              background: "rgba(61, 220, 132, 0.15)",
              color: "var(--success)",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 8px",
              borderRadius: "999px",
            },
          },
          "✓ CERTIFIED",
        ),
      ),

      h(
        "ul",
        { style: { listStyle: "none", padding: 0, margin: 0 } },
        topTracks.map((track) => {
          const medal =
            track.rank === 1 ? "🥇" : track.rank === 2 ? "🥈" : "🥉";
          return h(
            "li",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              },
            },
            h("span", { style: { fontSize: "20px" } }, medal),
            h(
              "div",
              { style: { flex: 1 } },
              h(
                "div",
                {
                  style: {
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "var(--text)",
                  },
                },
                track.title,
              ),
              h(
                "div",
                { style: { fontSize: "12px", color: "var(--text-muted)" } },
                track.artistName,
              ),
            ),
            h(
              "span",
              {
                style: {
                  fontWeight: "700",
                  color: "var(--accent)",
                  fontSize: "14px",
                },
              },
              track.votes.toLocaleString(),
            ),
          );
        }),
      ),

      remainingCount > 0
        ? h(
            "p",
            {
              class: "muted",
              style: {
                fontSize: "13px",
                textAlign: "center",
                marginTop: "16px",
                marginBottom: 0,
              },
            },
            `+ ${remainingCount} more tracks`,
          )
        : null,
    );
  }

  // Fetch data on load
  api
    .getResults()
    .then((data) => {
      results = data.results || [];
      loading = false;
      render();
    })
    .catch((err) => {
      console.error(err);
      loading = false;
      render();
    });

  render(); // Initial render (shows skeleton)
  return { el, destroy: () => {} };
}
