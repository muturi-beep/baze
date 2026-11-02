import { h } from "../dom.js";
import { getState, syncCatalog } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function AdminView() {
  const el = h("main", { class: "screen admin-screen" });
  const s = getState();

  // Simple guard: only show if logged in
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
      h("h1", {}, "Admin: Add Music"),
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
      "YouTube Video ID",
      h("input", {
        name: "youtubeVideoId",
        required: true,
        class: "claim-input",
        placeholder: "e.g. dQw4w9WgXcQ",
      }),
      h(
        "span",
        { class: "claim-field-hint" },
        "Find this in the YouTube URL after 'v='",
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

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Publishing...";
    btn.disabled = true;

    const data = {
      title: form.title.value,
      artistName: form.artistName.value,
      albumName: form.albumName.value,
      youtubeVideoId: form.youtubeVideoId.value,
      genre: form.genre.value,
      artworkUrl: form.artworkUrl.value,
    };

    try {
      await api.addTrack(data);
      showToast("Track published successfully!");
      form.reset();

      // Refresh the catalog so the new track appears instantly
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
