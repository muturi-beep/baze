import { h } from "../dom.js";
import { getState, syncCatalog } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function AdminView() {
  const el = h("main", { class: "screen admin-screen" });
  const s = getState();
  
  let allTracks = [];
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

  // 1. ADD TRACK FORM (Collapsible)
  const addFormDetails = h("details", { style: { background: "var(--bg-elev)", padding: "16px", borderRadius: "12px", marginBottom: "32px", border: "1px solid var(--border)" } },
    h("summary", { style: { fontSize: "16px", fontWeight: "600", cursor: "pointer", outline: "none" } }, "➕ Add New Track"),
    h("form", { class: "admin-form", onSubmit: handleAddSubmit, style: { marginTop: "16px" } },
      field("Song Title", h("input", { name: "title", required: true, class: "claim-input" })),
      field("Artist Name", h("input", { name: "artistName", required: true, class: "claim-input" })),
      field("Album Name (Optional)", h("input", { name: "albumName", class: "claim-input" })),
      field("YouTube Link or ID", h("input", { name: "youtubeVideoId", required: true, class: "claim-input" })),
      field("Genre", 
        h("select", { name: "genre", required: true, class: "claim-input" },
          ["afro-pop", "hip-hop", "gengetone", "rnb", "gospel", "benga"].map(g => h("option", { value: g }, g.toUpperCase()))
        )
      ),
      field("Artwork URL (Optional)", h("input", { name: "artworkUrl", class: "claim-input" })),
      h("button", { type: "submit", class: "claim-primary", style: { marginTop: "16px" } }, "Publish Track")
    )
  );
  el.appendChild(addFormDetails);

  // 2. MANAGE TRACKS SECTION
  const searchInput = h("input", {
    type: "text",
    class: "claim-input",
    placeholder: "🔍 Search tracks by title or artist...",
    style: { marginBottom: "16px" }
  });
  
    searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase(); // Added .trim()
    renderTrackList();
  });

  const trackListWrap = h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });

  const manageSection = h("div", {},
    h("h2", { style: { fontSize: "18px", marginBottom: "16px" } }, "Manage Tracks"),
    searchInput,
    trackListWrap
  );
  el.appendChild(manageSection);

  // 3. DANGER ZONE
  el.appendChild(
    h("div", { style: { marginTop: "48px", padding: "24px", border: "1px solid var(--danger)", borderRadius: "12px", background: "rgba(255, 92, 108, 0.05)" } },
      h("h3", { style: { color: "var(--danger)", marginTop: "0", marginBottom: "8px" } }, "⚠️ Danger Zone"),
      h("p", { class: "muted", style: { fontSize: "14px", marginBottom: "16px" } }, "Ending the week will freeze the current leaderboard, reset all votes, and start a new week."),
      h("button", { class: "claim-primary", style: { background: "var(--danger)", color: "#fff", marginTop: "0" }, onClick: handleResetCycle }, "End Week & Reset Votes")
    )
  );

  // --- LOGIC ---
      async function loadTracks() {
    try {
      const data = await api.getAdminTracks();
      allTracks = data.tracks || [];
      isLoadingTracks = false;
      renderTrackList();
    } catch (err) {
      console.error("Admin track load failed:", err);
      isLoadingTracks = false;
      // 🚨 Show the EXACT error message from the backend
      trackListWrap.innerHTML = `<p class="muted" style="color: var(--danger); padding: 16px; border: 1px solid var(--danger); border-radius: 8px;">❌ ${err.message}</p>`;
    }
  }

    function renderTrackList() {
    trackListWrap.innerHTML = "";

    if (isLoadingTracks) {
      trackListWrap.appendChild(h("p", { class: "muted" }, "Loading your tracks..."));
      return;
    }

    // 🚨 FIXED SEARCH LOGIC
    const searchTerm = searchQuery.trim().toLowerCase();
    
    const filtered = allTracks.filter(t => {
      if (!searchTerm) return true; // If search is empty, show all
      
      // Safely extract strings (fallback to empty string if missing)
      const title = (t.title || "").toLowerCase();
      const artist = (t.artistId && t.artistId.name) ? t.artistId.name.toLowerCase() : "";
      
      return title.includes(searchTerm) || artist.includes(searchTerm);
    });

    if (filtered.length === 0) {
      trackListWrap.appendChild(h("p", { class: "muted" }, "No tracks found matching your search."));
      return;
    }

    // Build the list
    filtered.forEach((track) => {
      const fallbackImg = "https://picsum.photos/seed/" + track._id + "/100";
      const artistName = (track.artistId && track.artistId.name) ? track.artistId.name : "Unknown Artist";

      trackListWrap.appendChild(
        h("div", { class: "admin-track-item" },
          h("img", { src: track.artworkUrl || fallbackImg, alt: "", onError: (e) => e.target.src = fallbackImg }),
          h("div", { class: "admin-track-info" },
            h("div", { class: "title" }, track.title),
            h("div", { class: "artist" }, artistName)
          ),
          h("div", { class: "admin-track-actions" },
            h("button", { class: "admin-btn-small admin-btn-edit", onClick: () => openEditModal(track) }, "Edit"),
            h("button", { class: "admin-btn-small admin-btn-delete", onClick: () => handleDelete(track) }, "Delete")
          )
        )
      );
    });
  }

  // --- EDIT MODAL ---
  function openEditModal(track) {
    const backdrop = h("div", { class: "sheet-backdrop", style: { display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 100 } });
    const closeModal = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });

    const artistName = track.artistId ? track.artistId.name : "";

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
      } catch (err) { showToast("Failed to update track"); } 
      finally { btn.textContent = "Save Changes"; btn.disabled = false; }
    } },
      h("h2", { style: { margin: "0 0 16px" } }, "Edit Track"),
      field("Title", h("input", { name: "title", value: track.title, required: true, class: "claim-input" })),
      field("Artist Name", h("input", { name: "artistName", value: artistName, required: true, class: "claim-input" })),
      field("Genre", 
        h("select", { name: "genre", class: "claim-input" },
          ["afro-pop", "hip-hop", "gengetone", "rnb", "gospel", "benga"].map(g => 
            h("option", { value: g, selected: track.genre === g }, g.toUpperCase())
          )
        )
      ),
      field("YouTube ID", h("input", { name: "youtubeVideoId", value: track.youtubeVideoId || "", class: "claim-input" })),
      field("Artwork URL", h("input", { name: "artworkUrl", value: track.artworkUrl || "", class: "claim-input" })),
      h("div", { style: { display: "flex", gap: "8px", marginTop: "24px" } },
        h("button", { type: "button", class: "claim-secondary", onClick: closeModal, style: { marginTop: 0, flex: 1 } }, "Cancel"),
        h("button", { type: "submit", class: "claim-primary", style: { marginTop: 0, flex: 1 } }, "Save")
      )
    );
    backdrop.appendChild(form);
    document.body.appendChild(backdrop);
  }

  // --- ADD & DELETE & RESET LOGIC ---
  async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = addFormDetails.querySelector('button[type="submit"]');
    btn.textContent = "Publishing..."; btn.disabled = true;
    let rawYt = e.target.youtubeVideoId.value.trim();
    let ytId = rawYt.includes("v=") ? rawYt.split("v=")[1].split("&")[0] : rawYt.split("youtu.be/")[1]?.split("?")[0] || rawYt;
    
    try {
      await api.addTrack({
        title: e.target.title.value, artistName: e.target.artistName.value,
        albumName: e.target.albumName.value, youtubeVideoId: ytId,
        genre: e.target.genre.value, artworkUrl: e.target.artworkUrl.value,
      });
      showToast("Track published!"); e.target.reset(); await syncCatalog(); loadTracks();
    } catch (err) { showToast("Failed to publish track"); } 
    finally { btn.textContent = "Publish Track"; btn.disabled = false; }
  }

  async function handleDelete(track) {
    if (!confirm(`Delete "${track.title}" permanently?`)) return;
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