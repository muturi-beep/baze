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
  let searchQuery = "";

  if (!s.user.verified) {
    el.appendChild(h("div", { class: "empty" }, "You must be logged in to view this page."));
    return { el, destroy: () => {} };
  }

  // --- UI SHELL ---
  el.appendChild(
    h("header", { class: "topbar" },
      h("button", { "aria-label": "back", onClick: () => (location.hash = "#/") }, "←"),
      h("h1", {}, "Admin Dashboard"),
      h("span")
    )
  );

  // 1. ADD TRACK FORM
  const form = h("form", { class: "admin-form", onSubmit: handleAddSubmit, style: { marginBottom: "48px" } },
    h("h2", { style: { fontSize: "18px", marginBottom: "16px" } }, "Add New Track"),
    field("Song Title", h("input", { name: "title", required: true, class: "claim-input" })),
    field("Artist Name", h("input", { name: "artistName", required: true, class: "claim-input" })),
    field("Album Name (Optional)", h("input", { name: "albumName", class: "claim-input" })),
    field("YouTube Link or ID", h("input", { name: "youtubeVideoId", required: true, class: "claim-input" })),
    field("Genre", 
      h("select", { name: "genre", required: true, class: "claim-input" },
        h("option", { value: "afro-pop" }, "Afro-Pop"),
        h("option", { value: "hip-hop" }, "Hip-Hop"),
        h("option", { value: "gengetone" }, "Gengetone"),
        h("option", { value: "rnb" }, "R&B"),
        h("option", { value: "gospel" }, "Gospel"),
        h("option", { value: "benga" }, "Benga")
      )
    ),
    field("Artwork URL (Optional)", h("input", { name: "artworkUrl", class: "claim-input" })),
    h("button", { type: "submit", class: "claim-primary", style: { marginTop: "24px" } }, "Publish Track")
  );
  el.appendChild(form);

  // 2. PENDING CLAIMS
  const claimsWrap = h("div", { style: { marginTop: "48px" } });
  el.appendChild(claimsWrap);

  // 3. MANAGE TRACKS (With Search)
  const trackListWrap = h("div", { style: { marginTop: "48px" } });
  el.appendChild(trackListWrap);

  // Search Input
  const searchInput = h("input", {
    type: "text",
    class: "claim-input",
    placeholder: "Search tracks by title or artist...",
    style: { marginBottom: "16px" },
    onInput: (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderTrackList();
    }
  });

  // 4. DANGER ZONE
  el.appendChild(
    h("div", { style: { marginTop: "64px", padding: "24px", border: "1px solid var(--danger)", borderRadius: "12px", background: "rgba(255, 92, 108, 0.05)" } },
      h("h3", { style: { color: "var(--danger)", marginTop: "0", marginBottom: "8px" } }, "⚠️ Danger Zone"),
      h("p", { class: "muted", style: { fontSize: "14px", marginBottom: "16px" } }, "Ending the week will freeze the current leaderboard, reset all votes, and start a new week."),
      h("button", { class: "claim-primary", style: { background: "var(--danger)", color: "#fff", marginTop: "0" }, onClick: handleResetCycle }, "End Week & Reset Votes")
    )
  );

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
    trackListWrap.appendChild(h("h2", { style: { fontSize: "18px", marginBottom: "16px" } }, "Manage Tracks"));
    trackListWrap.appendChild(searchInput);

    if (isLoadingTracks) {
      trackListWrap.appendChild(h("p", { class: "muted" }, "Loading tracks..."));
      return;
    }

    const filtered = allTracks.filter(t => 
      t.title.toLowerCase().includes(searchQuery) || 
      (t.artistId && t.artistId.name.toLowerCase().includes(searchQuery))
    );

    if (filtered.length === 0) {
      trackListWrap.appendChild(h("p", { class: "muted" }, "No tracks found."));
      return;
    }

    const list = h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto", paddingRight: "8px" } });

    filtered.forEach((track) => {
      list.appendChild(h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "8px", gap: "12px" } },
        h("div", { style: { flex: 1, overflow: "hidden" } },
          h("div", { style: { fontWeight: "600", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, track.title),
          h("div", { style: { fontSize: "12px", color: "var(--text-muted)" } }, track.artistId ? track.artistId.name : "Unknown Artist")
        ),
        h("div", { style: { display: "flex", gap: "8px" } },
          h("button", { style: { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }, onClick: () => openEditModal(track) }, "Edit"),
          h("button", { style: { background: "rgba(255,92,108,0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }, onClick: () => handleDelete(track) }, "Delete")
        )
      ));
    });
    trackListWrap.appendChild(list);
  }

  // --- EDIT MODAL ---
  function openEditModal(track) {
    const backdrop = h("div", { class: "sheet-backdrop", style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 100 } });
    const closeModal = () => backdrop.remove();
    
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });

    const form = h("form", { class: "sheet", style: { background: "var(--bg-elev)", borderRadius: "20px", padding: "24px", maxWidth: "400px", width: "100%" }, onSubmit: async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = "Saving..."; btn.disabled = true;
      try {
        await api.updateTrack(track._id, {
          title: form.title.value,
          artistName: form.artistName.value,
          genre: form.genre.value,
          youtubeVideoId: form.youtubeVideoId.value,
          artworkUrl: form.artworkUrl.value
        });
        showToast("Track updated!");
        await syncCatalog();
        closeModal();
        loadTracks();
      } catch (err) { showToast("Failed to update track"); btn.textContent = "Save Changes"; btn.disabled = false; }
    } },
      h("h2", { style: { margin: "0 0 16px" } }, "Edit Track"),
      field("Title", h("input", { name: "title", value: track.title, required: true, class: "claim-input" })),
      field("Artist Name", h("input", { name: "artistName", value: track.artistId ? track.artistId.name : "", required: true, class: "claim-input" })),
      field("Genre", 
        h("select", { name: "genre", class: "claim-input" },
          ["afro-pop", "hip-hop", "gengetone", "rnb", "gospel", "benga"].map(g => 
            h("option", { value: g, selected: track.genre === g }, g.toUpperCase())
          )
        )
      ),
      field("YouTube ID", h("input", { name: "youtubeVideoId", value: track.youtubeVideoId || "", class: "claim-input" })),
      field("Artwork URL", h("input", { name: "artworkUrl", value: track.artworkUrl || "", class: "claim-input" })),
      h("div", { style: { display: "flex", gap: "8px", marginTop: "16px" } },
        h("button", { type: "button", class: "claim-secondary", onClick: closeModal, style: { marginTop: 0, flex: 1 } }, "Cancel"),
        h("button", { type: "submit", class: "claim-primary", style: { marginTop: 0, flex: 1 } }, "Save Changes")
      )
    );
    backdrop.appendChild(form);
    document.body.appendChild(backdrop);
  }

  // --- ADD & DELETE & RESET LOGIC ---
  async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Publishing..."; btn.disabled = true;
    let rawYt = form.youtubeVideoId.value.trim();
    let ytId = rawYt.includes("v=") ? rawYt.split("v=")[1].split("&")[0] : rawYt.split("youtu.be/")[1]?.split("?")[0] || rawYt;
    
    try {
      await api.addTrack({
        title: form.title.value, artistName: form.artistName.value,
        albumName: form.albumName.value, youtubeVideoId: ytId,
        genre: form.genre.value, artworkUrl: form.artworkUrl.value,
      });
      showToast("Track published!"); form.reset(); await syncCatalog(); loadTracks();
    } catch (err) { showToast("Failed to publish track"); } 
    finally { btn.textContent = "Publish Track"; btn.disabled = false; }
  }

  async function handleDelete(track) {
    if (!confirm(`Delete "${track.title}"?`)) return;
    try { await api.deleteTrack(track._id); showToast("Deleted"); await syncCatalog(); loadTracks(); } catch (err) { showToast("Failed to delete"); }
  }

  async function handleResetCycle(e) {
    if (!confirm("Are you sure? This ends the week and resets votes.")) return;
    const btn = e.target; btn.textContent = "Resetting..."; btn.disabled = true;
    try { const res = await api.resetCycle(); showToast(res.message); window.location.reload(); } catch (err) { showToast("Failed to reset"); btn.textContent = "End Week & Reset Votes"; btn.disabled = false; }
  }

  function field(label, input) {
    return h("label", { class: "claim-field", style: { marginBottom: "12px" } }, h("span", { class: "claim-field-label" }, label), input);
  }

  // Initial Load
  loadTracks();

  return { el, destroy: () => {} };
}