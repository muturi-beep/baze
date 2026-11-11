import { h } from "../dom.js";
import { getState, syncCatalog } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function AdminView() {
  const el = h("main", { class: "screen admin-screen" });
  const s = getState();

  let allTracks = [];
  let pendingClaims = [];
  let isLoadingTracks = true;

  if (!s.user.verified) {
    el.appendChild(
      h("div", { class: "empty" }, "You must be logged in to view this page."),
    );
    return { el, destroy: () => {} };
  }

  // --- UI SHELL ---
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

  // 1. ADD TRACK FORM
  const form = h(
    "form",
    { class: "admin-form", onSubmit: handleSubmit },
    h(
      "h2",
      { style: { fontSize: "18px", marginBottom: "16px" } },
      "Add New Track",
    ),
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

  // 2. PENDING CLAIMS LIST
  const claimsWrap = h("div", { style: { marginTop: "48px" } });
  el.appendChild(claimsWrap);

  // 3. MANAGE TRACKS LIST
  const trackListWrap = h("div", { style: { marginTop: "48px" } });
  el.appendChild(trackListWrap);

  // 4. DANGER ZONE
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
        "Ending the week will freeze the current leaderboard, reset all votes, and start a new week.",
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

  // --- LOGIC: CLAIMS ---
  async function loadClaims() {
    try {
      const data = await api.getPendingClaims();
      pendingClaims = data.claims || [];
      renderClaimsList();
    } catch (err) {
      console.error("Failed to load claims", err);
      claimsWrap.innerHTML =
        "<p class='muted'>Failed to load pending claims.</p>";
    }
  }

  function renderClaimsList() {
    claimsWrap.innerHTML = "";
    claimsWrap.appendChild(
      h(
        "h2",
        { style: { fontSize: "18px", marginBottom: "16px" } },
        "Pending Artist Claims",
      ),
    );

    if (pendingClaims.length === 0) {
      claimsWrap.appendChild(
        h("p", { class: "muted" }, "No pending claims right now."),
      );
      return;
    }

    const list = h("div", {
      style: { display: "flex", flexDirection: "column", gap: "8px" },
    });

    pendingClaims.forEach((claim) => {
      list.appendChild(
        h(
          "div",
          {
            style: {
              padding: "16px",
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
          },
          h(
            "div",
            {},
            h(
              "div",
              { style: { fontWeight: "700", fontSize: "15px" } },
              `Claim: ${claim.artistName}`,
            ),
            h(
              "div",
              {
                style: {
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                },
              },
              `User: ${claim.userId.email} | Contact: ${claim.contactInfo}`,
            ),
          ),
          h(
            "button",
            {
              style: {
                background: "var(--success)",
                color: "#0b0b0f",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "700",
                cursor: "pointer",
              },
              onClick: async (e) => {
                e.target.textContent = "Approving...";
                e.target.disabled = true;
                try {
                  await api.approveClaim(claim._id);
                  showToast("Claim approved successfully!");
                  loadClaims(); // Refresh list
                } catch (err) {
                  showToast("Failed to approve claim");
                  e.target.textContent = "Approve";
                  e.target.disabled = false;
                }
              },
            },
            "Approve",
          ),
        ),
      );
    });
    claimsWrap.appendChild(list);
  }

  // --- LOGIC: TRACKS ---
  async function loadTracks() {
    try {
      const data = await api.getAdminTracks();
      allTracks = data.tracks || [];
      isLoadingTracks = false;
      renderTrackList();
    } catch (err) {
      showToast("Failed to load tracks");
      isLoadingTracks = false;
      renderTrackList();
    }
  }

  function renderTrackList() {
    trackListWrap.innerHTML = "";
    trackListWrap.appendChild(
      h(
        "h2",
        { style: { fontSize: "18px", marginBottom: "16px" } },
        "Manage Tracks",
      ),
    );

    if (isLoadingTracks) {
      trackListWrap.appendChild(
        h("p", { class: "muted" }, "Loading tracks..."),
      );
      return;
    }

    if (allTracks.length === 0) {
      trackListWrap.appendChild(
        h("p", { class: "muted" }, "No tracks in the database."),
      );
      return;
    }

    const list = h("div", {
      style: { display: "flex", flexDirection: "column", gap: "8px" },
    });

    allTracks.forEach((track) => {
      const row = h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            gap: "12px",
          },
        },
        h(
          "div",
          { style: { flex: 1, overflow: "hidden" } },
          h(
            "div",
            {
              style: {
                fontWeight: "600",
                fontSize: "14px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },
            track.title,
          ),
          h(
            "div",
            { style: { fontSize: "12px", color: "var(--text-muted)" } },
            track.artistId ? track.artistId.name : "Unknown Artist",
          ),
        ),
        h(
          "div",
          { style: { display: "flex", gap: "8px" } },
          h(
            "button",
            {
              style: {
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              },
              onClick: () => handleEdit(track),
            },
            "Edit",
          ),
          h(
            "button",
            {
              style: {
                background: "rgba(255,92,108,0.1)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              },
              onClick: () => handleDelete(track),
            },
            "Delete",
          ),
        ),
      );
      list.appendChild(row);
    });

    trackListWrap.appendChild(list);
  }

  async function handleEdit(track) {
    const newTitle = prompt("Edit Track Title:", track.title);
    if (newTitle === null) return;

    const newYt = prompt(
      "Edit YouTube ID (or leave blank):",
      track.youtubeVideoId || "",
    );
    if (newYt === null) return;

    try {
      await api.updateTrack(track._id, {
        title: newTitle,
        youtubeVideoId: newYt,
      });
      showToast("Track updated");
      await syncCatalog();
      loadTracks();
    } catch (err) {
      showToast("Failed to update track");
    }
  }

  async function handleDelete(track) {
    if (!confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteTrack(track._id);
      showToast("Track deleted");
      await syncCatalog();
      loadTracks();
    } catch (err) {
      showToast("Failed to delete track");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Publishing...";
    btn.disabled = true;

    let rawYt = form.youtubeVideoId.value.trim();
    let ytId = rawYt;
    if (rawYt.includes("v=")) ytId = rawYt.split("v=")[1].split("&")[0];
    else if (rawYt.includes("youtu.be/"))
      ytId = rawYt.split("youtu.be/")[1].split("?")[0];

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
      loadTracks();
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

  // Initial Load
  loadClaims();
  loadTracks();

  return { el, destroy: () => {} };
}
