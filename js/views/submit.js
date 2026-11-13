import { h } from "../dom.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function SubmitView() {
  const el = h("main", { class: "screen" });
  let submitted = false;

  function render() {
    el.innerHTML = "";
    
    el.appendChild(
      h("header", { class: "topbar" },
        h("button", { "aria-label": "back", onClick: () => history.back() }, "←"),
        h("h1", {}, "Submit Music"),
        h("span")
      )
    );

    if (submitted) {
      el.appendChild(
        h("div", { class: "empty" },
          h("h2", { style: { color: "var(--success)", marginBottom: "16px" } }, "✅ Submission Received"),
          h("p", { class: "muted", style: { marginBottom: "24px" } }, "Thank you! Our team will review your track and add it to the chart if it meets our guidelines."),
          h("a", { class: "cta", href: "#/" }, "Back to Home")
        )
      );
      return;
    }

    const form = h("form", { class: "admin-form", onSubmit: handleSubmit },
      h("p", { class: "muted", style: { marginBottom: "24px", lineHeight: "1.5" } }, 
        "Are you an upcoming artist? Submit your track to Baze. If approved, your song will be added to the weekly chart for fans to vote on."
      ),
      
      field("Artist Name", h("input", { name: "artistName", required: true, class: "claim-input" })),
      field("Track Title", h("input", { name: "trackTitle", required: true, class: "claim-input" })),
      field("YouTube Link or ID", 
        h("input", { name: "youtubeVideoId", required: true, class: "claim-input", placeholder: "Paste full link or ID" }),
        h("span", { class: "claim-field-hint" }, "We use YouTube for playback.")
      ),
      field("Your Email", h("input", { type: "email", name: "contactEmail", required: true, class: "claim-input", placeholder: "So we can contact you" })),
      
      h("button", { type: "submit", class: "claim-primary", style: { marginTop: "24px" } }, "Submit Track for Review")
    );

    el.appendChild(form);

    async function handleSubmit(e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = "Submitting...";
      btn.disabled = true;

      let rawYt = form.youtubeVideoId.value.trim();
      let ytId = rawYt;
      if (rawYt.includes("v=")) ytId = rawYt.split("v=")[1].split("&")[0];
      else if (rawYt.includes("youtu.be/")) ytId = rawYt.split("youtu.be/")[1].split("?")[0];

      try {
        await api.submitTrack({
          artistName: form.artistName.value,
          trackTitle: form.trackTitle.value,
          youtubeVideoId: ytId,
          contactEmail: form.contactEmail.value,
        });
        submitted = true;
        render();
      } catch (err) {
        showToast(err.message || "Failed to submit track");
        btn.textContent = "Submit Track for Review";
        btn.disabled = false;
      }
    }
  }

  function field(label, input, hint) {
    return h("label", { class: "claim-field" },
      h("span", { class: "claim-field-label" }, label),
      input,
      hint || null
    );
  }

  render();
  return { el, destroy: () => {} };
}