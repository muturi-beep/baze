import { h } from "../dom.js";
import { getState, syncCatalog } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function AdminView() {
  const el = h("main", { class: "screen admin-screen" });
  const s = getState();

  if (!s.user.verified) {
    el.appendChild(
      h("div", { class: "empty" }, "You must be logged in to view this page."),
    );
    return { el, destroy: () => {} };
  }

  el.appendChild(
    h(
      "header",
      { class: "topbar" },
      h(
        "button",
        { "aria-label": "back", onClick: () => (location.hash = "#/") },
        "←",
      ),
      h("h1", {}, "Admin Dashboard"),
      h("span"),
    ),
  );

  const form = h(
    "form",
    { class: "admin-form", onSubmit: handleSubmit },
    field(
      "Song Title",
      h("input", { name: "title", required: true, class: "claim-input" }),
    ),
    field(
      "Artist Name",
      h("input", { name: "artistName", required: true, class: "claim-input" }),
    ),
    field(
      "Album Name (Optional)",
      h("input", { name: "albumName", class: "claim-input" }),
    ),
    field(
      "YouTube Link or ID",
      h("input", {
        name: "youtubeVideoId",
        required: true,
        class: "claim-input",
        placeholder: "Paste full link or ID",
      }),
      h(
        "span",
        { class: "claim-field-hint" },
        "We will extract the ID automatically",
      ),
    ),
    field(
      "Genre",
      h(
        "select",
        { name: "genre", required: true, class: "claim-input" },
        h("option", { value: "afro-pop" }, "Afro-Pop"),
        h("option", { value: "hip-hop" }, "Hip-Hop"),
        h("option", { value: "gengetone" }, "Gengetone"),
        h("option", { value: "rnb" }, "R&B"),
        h("option", { value: "gospel" }, "Gospel"),
        h("option", { value: "benga" }, "Benga"),
      ),
    ),
    field(
      "Artwork URL (Optional)",
      h("input", {
        name: "artworkUrl",
        class: "claim-input",
        placeholder: "https://...",
      }),
    ),

    h(
      "button",
      { type: "submit", class: "claim-primary", style: { marginTop: "24px" } },
      "Publish Track",
    ),
  );

  el.appendChild(form);

  // --- DANGER ZONE (WEEKLY RESET) ---
  el.appendChild(
    h(
      "div",
      {
        style: {
          marginTop: "64px",
          padding: "24px",
          border: "1px solid var(--danger)",
          borderRadius: "12px",
          background: "rgba(255, 92, 108, 0.05)",
        },
      },
      h(
        "h3",
        {
          style: {
            color: "var(--danger)",
            marginTop: "0",
            marginBottom: "8px",
          },
        },
        "⚠️ Danger Zone",
      ),
      h(
        "p",
        {
          class: "muted",
          style: { fontSize: "14px", marginBottom: "16px", lineHeight: "1.5" },
        },
        "Ending the week will freeze the current leaderboard, save the results to the archive, reset all fan votes back to 10, and start the next week. This cannot be undone.",
      ),
      h(
        "button",
        {
          class: "claim-primary",
          style: { background: "var(--danger)", color: "#fff", marginTop: "0" },
          onClick: async (e) => {
            if (
              !confirm(
                "Are you absolutely sure? This will end the week and reset all votes.",
              )
            )
              return;
            const btn = e.target;
            btn.textContent = "Resetting...";
            btn.disabled = true;
            try {
              const res = await api.resetCycle();
              showToast(res.message || "Week reset successful!");
              // Force reload to fetch the new cycle data
              window.location.reload();
            } catch (err) {
              showToast(err.message || "Failed to reset cycle");
              btn.textContent = "End Week & Reset Votes";
              btn.disabled = false;
            }
          },
        },
        "End Week & Reset Votes",
      ),
    ),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Publishing...";
    btn.disabled = true;

    // Smart YouTube ID extraction
    let rawYt = form.youtubeVideoId.value.trim();
    let ytId = rawYt;
    if (rawYt.includes("v=")) {
      ytId = rawYt.split("v=")[1].split("&")[0];
    } else if (rawYt.includes("youtu.be/")) {
      ytId = rawYt.split("youtu.be/")[1].split("?")[0];
    }

    const data = {
      title: form.title.value,
      artistName: form.artistName.value,
      albumName: form.albumName.value,
      youtubeVideoId: ytId,
      genre: form.genre.value,
      artworkUrl: form.artworkUrl.value,
    };

    try {
      await api.addTrack(data);
      showToast("Track published successfully!");
      form.reset();

      await syncCatalog();
    } catch (err) {
      showToast(err.message || "Failed to publish track");
    } finally {
      btn.textContent = "Publish Track";
      btn.disabled = false;
    }
  }

  function field(label, input, hint) {
    return h(
      "label",
      { class: "claim-field" },
      h("span", { class: "claim-field-label" }, label),
      input,
      hint || null,
    );
  }

  return { el, destroy: () => {} };
}
