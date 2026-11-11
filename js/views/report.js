import { h } from "../dom.js";
import { getTrack } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function ReportView(params) {
  const trackId = params.trackId;
  const el = h("main", { class: "screen" });
  const track = getTrack(trackId);

  el.appendChild(
    h(
      "header",
      { class: "topbar" },
      h("button", { "aria-label": "back", onClick: () => history.back() }, "←"),
      h("h1", {}, "Report Issue"),
      h("span"),
    ),
  );

  if (!track) {
    el.appendChild(h("div", { class: "empty" }, "Track not found."));
    return { el, destroy: () => {} };
  }

  const form = h(
    "form",
    { class: "admin-form", onSubmit: handleSubmit },
    h(
      "p",
      { class: "muted", style: { marginBottom: "24px" } },
      "Reporting: ",
      h("strong", { style: { color: "var(--text)" } }, track.title),
    ),

    field(
      "What is wrong?",
      h(
        "select",
        { name: "reason", required: true, class: "claim-input" },
        h(
          "option",
          { value: "broken_video" },
          "The YouTube video doesn't work or is wrong",
        ),
        h(
          "option",
          { value: "wrong_info" },
          "The song title or artist name is wrong",
        ),
        h("option", { value: "duplicate" }, "This is a duplicate track"),
        h("option", { value: "fake_artist" }, "This artist or track is fake"),
        h("option", { value: "other" }, "Other issue"),
      ),
    ),

    field(
      "Additional details (Optional)",
      h("textarea", {
        name: "details",
        class: "claim-input",
        rows: 4,
        placeholder: "Tell us more about the issue...",
      }),
    ),

    h(
      "button",
      { type: "submit", class: "claim-primary", style: { marginTop: "24px" } },
      "Submit Report",
    ),
  );

  el.appendChild(form);

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = "Submitting...";
    btn.disabled = true;

    try {
      await api.submitReport({
        trackId: trackId,
        reason: form.reason.value,
        details: form.details.value,
      });
      showToast("Report submitted. Thank you!");
      history.back(); // Send them back to the track
    } catch (err) {
      showToast(err.message || "Failed to submit report");
      btn.textContent = "Submit Report";
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
