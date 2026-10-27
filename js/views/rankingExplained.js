import { h } from "../dom.js";

export function RankingExplainedView() {
  var el = h("main", { class: "screen ranking-explained" });

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
      h("h1", {}, "How ranking works"),
      h("span"),
    ),
  );

  el.appendChild(
    h(
      "p",
      { class: "ranking-intro" },
      "Baze rankings are simple. Fans vote. Votes decide rank. Nothing else.",
    ),
  );

  var sections = [
    {
      title: "One fan, one vote",
      body: "Each verified fan gets 10 votes per week. You can vote for any track once per cycle. Every fan's vote counts the same. We do not weight votes by account age, follower count, or anything else.",
    },
    {
      title: "What a cycle is",
      body: "A cycle runs from Monday 00:00 to Sunday 23:59 (EAT). Each week opens a new cycle with the tracks submitted that week. When a cycle closes, votes freeze and the rankings are computed.",
    },
    {
      title: "What \u2018certified\u2019 means",
      body: "Once a cycle closes, its rankings are certified — frozen, archived, and available under Results forever. Certified rankings never change. Live rankings are the current cycle, and they keep moving as votes come in.",
    },
    {
      title: "What we don't do",
      body: "We don't sell ranking positions. We don't let artists vote for their own tracks. We don't count unverified votes. If we ever introduce jury or curator weighting, it will be visible on every leaderboard and every certified result, along with the exact weight applied.",
    },
    {
      title: "Seeing something wrong?",
      body: "If you spot a fake artist, a duplicate track, or suspicious voting patterns, use the Report button on any track page. Every report is reviewed before the next cycle opens.",
    },
    {
      title: "This is a demo",
      body: "Baze is in early testing. Rankings on this preview are seeded for demonstration — no real votes are being counted yet. Nothing here is a certified result.",
    },
  ];

  sections.forEach(function (sec) {
    el.appendChild(
      h(
        "section",
        { class: "ranking-section" },
        h("h2", {}, sec.title),
        h("p", {}, sec.body),
      ),
    );
  });

  el.appendChild(
    h(
      "div",
      { class: "ranking-footer" },
      h(
        "a",
        { class: "claim-primary", href: "#/leaderboard" },
        "See current rankings",
      ),
      h(
        "a",
        { class: "claim-secondary", href: "#/results" },
        "See certified results",
      ),
    ),
  );

  return { el: el, destroy: function () {} };
}
