import { h } from "../dom.js";
import {
  subscribe,
  getState,
  searchArtists,
  claimArtist,
  getClaimedArtist,
} from "../store.js";
import { showToast } from "../components.js";

export function ClaimView() {
  var el = h("main", { class: "screen claim-screen" });
  var step = 1;
  var query = "";
  var selectedId = null;
  var draft = { bio: "", instagram: "", youtube: "", photoUrl: "" };

  function render() {
    var s = getState();

    if (s.claimedArtistId) {
      el.innerHTML = "";
      el.appendChild(backBar(false));
      el.appendChild(successScreen());
      return;
    }

    el.innerHTML = "";
    el.appendChild(backBar(true));
    el.appendChild(stepIndicator(step));

    if (step === 1) renderStep1();
    else if (step === 2) renderStep2();
    else if (step === 3) renderStep3();
  }

  function backBar(showBack) {
    return h(
      "header",
      { class: "topbar" },
      showBack
        ? h(
            "button",
            {
              "aria-label": "back",
              onClick: function () {
                if (step > 1) {
                  step--;
                  render();
                } else history.back();
              },
            },
            "←",
          )
        : h("span"),
      h("h1", {}, "Claim your profile"),
      h("span"),
    );
  }

  function stepIndicator(n) {
    return h(
      "div",
      { class: "claim-steps" },
      [1, 2, 3].map(function (i) {
        return h(
          "span",
          {
            class:
              "claim-step" + (i === n ? " active" : i < n ? " complete" : ""),
          },
          String(i),
        );
      }),
    );
  }

  function renderStep1() {
    var all = searchArtists("");
    var unclaimed = all.filter(function (a) {
      return !a.claimed;
    });
    var claimed = all.filter(function (a) {
      return a.claimed;
    });
    var filtered = query
      ? all.filter(function (a) {
          return a.name.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        })
      : unclaimed;

    var list = h("ul", { class: "claim-list" });
    filtered.forEach(function (a) {
      list.appendChild(
        h(
          "li",
          {},
          h(
            "button",
            {
              type: "button",
              class: "claim-row",
              onClick: function () {
                selectedId = a.id;
                step = 2;
                render();
              },
            },
            h(
              "div",
              { class: "claim-row-meta" },
              h("span", { class: "claim-name" }, a.name),
              h("span", { class: "claim-sub" }, "Tap to claim"),
            ),
            h("span", { class: "claim-arrow" }, "→"),
          ),
        ),
      );
    });

    if (filtered.length === 0) {
      list.appendChild(
        h(
          "li",
          { class: "claim-empty" },
          query
            ? 'No artists match "' + query + '"'
            : "All artists in this cycle have been claimed",
        ),
      );
    }

    var input = h("input", {
      type: "search",
      class: "claim-search",
      placeholder: "Search artist name",
      autocomplete: "off",
      value: query,
    });
    input.addEventListener("input", function (e) {
      query = e.target.value.trim();
      var cursorPos = e.target.selectionStart;
      render();
      var newInput = el.querySelector(".claim-search");
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(cursorPos, cursorPos);
      }
    });

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "Find your artist name. If your profile is already live, claim it to control how it looks and to be notified of votes.",
        ),
        input,
        list,
        h(
          "div",
          { class: "claim-hint" },
          h("p", { class: "muted" }, "Can't find yourself?"),
          h(
            "button",
            {
              type: "button",
              class: "claim-secondary",
              onClick: function () {
                showToast("Profile request coming soon");
              },
            },
            "Request a new profile",
          ),
        ),
      ),
    );
  }

  function renderStep2() {
    var artist = selectedId
      ? searchArtists("").find(function (a) {
          return a.id === selectedId;
        })
      : null;
    if (!artist) {
      step = 1;
      render();
      return;
    }

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "Verify you own this profile. Pick one method:",
        ),
        h(
          "div",
          { class: "claim-artist-preview" },
          h("span", { class: "claim-preview-label" }, "Claiming"),
          h("span", { class: "claim-preview-name" }, artist.name),
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-option",
            onClick: function () {
              verify();
            },
          },
          h("span", { class: "claim-option-icon" }, "📸"),
          h(
            "div",
            { class: "claim-option-text" },
            h("span", { class: "claim-option-title" }, "Post on Instagram"),
            h(
              "span",
              { class: "claim-option-sub" },
              "Share a link to Baze from your story",
            ),
          ),
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-option",
            onClick: function () {
              verify();
            },
          },
          h("span", { class: "claim-option-icon" }, "✉️"),
          h(
            "div",
            { class: "claim-option-text" },
            h("span", { class: "claim-option-title" }, "Email from label"),
            h(
              "span",
              { class: "claim-option-sub" },
              "Send from your label email to verify@baze.fm",
            ),
          ),
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-option",
            onClick: function () {
              verify();
            },
          },
          h("span", { class: "claim-option-icon" }, "🔍"),
          h(
            "div",
            { class: "claim-option-text" },
            h("span", { class: "claim-option-title" }, "Manual review"),
            h(
              "span",
              { class: "claim-option-sub" },
              "We'll review within 48 hours",
            ),
          ),
        ),
        h(
          "p",
          { class: "claim-disclaimer" },
          "This is a demo. Verification is simulated for now — real verification ships with the backend.",
        ),
      ),
    );
  }

  function verify() {
    showToast("Verification simulated");
    step = 3;
    render();
  }

  function renderStep3() {
    var artist = selectedId
      ? searchArtists("").find(function (a) {
          return a.id === selectedId;
        })
      : null;
    if (!artist) {
      step = 1;
      render();
      return;
    }

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "Make your profile yours. You can edit these later.",
        ),
        field(
          "Artist name",
          h("input", {
            type: "text",
            value: artist.name,
            disabled: true,
            class: "claim-input",
          }),
          "Verified from your catalog — contact us to change",
        ),
        field(
          "Bio",
          h("textarea", {
            rows: 3,
            class: "claim-input",
            placeholder: "One line about your music",
            value: draft.bio,
            onInput: function (e) {
              draft.bio = e.target.value;
            },
          }),
        ),
        field(
          "Instagram",
          h("input", {
            type: "text",
            class: "claim-input",
            placeholder: "@handle",
            value: draft.instagram,
            onInput: function (e) {
              draft.instagram = e.target.value;
            },
          }),
        ),
        field(
          "YouTube",
          h("input", {
            type: "text",
            class: "claim-input",
            placeholder: "Channel URL",
            value: draft.youtube,
            onInput: function (e) {
              draft.youtube = e.target.value;
            },
          }),
        ),
        field(
          "Profile photo URL",
          h("input", {
            type: "url",
            class: "claim-input",
            placeholder: "https://...",
            value: draft.photoUrl,
            onInput: function (e) {
              draft.photoUrl = e.target.value;
            },
          }),
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-primary",
            onClick: function () {
              claimArtist(selectedId, {
                bio: draft.bio,
                photoUrl: draft.photoUrl,
                links: { instagram: draft.instagram, youtube: draft.youtube },
              });
              showToast("Profile claimed");
              render();
            },
          },
          "Save & claim",
        ),
      ),
    );
  }

  function successScreen() {
    var artist = getClaimedArtist();
    return h(
      "div",
      { class: "claim-step-body claim-success" },
      h("div", { class: "claim-success-icon" }, "✓"),
      h("h2", {}, "You're verified"),
      h("p", { class: "muted" }, "You now control"),
      h("p", { class: "claim-artist-name" }, artist ? artist.name : ""),
      h(
        "p",
        { class: "muted" },
        "Share your artist page to bring your fans here. Every fan vote counts.",
      ),
      h(
        "a",
        {
          class: "claim-primary",
          href: artist ? "#/artist/" + artist.id : "#/",
        },
        "View my artist page",
      ),
      h(
        "a",
        { class: "claim-secondary", href: "#/explore" },
        "Back to explore",
      ),
    );
  }

  function field(label, input, hint) {
    return h(
      "label",
      { class: "claim-field" },
      h("span", { class: "claim-field-label" }, label),
      input,
      hint ? h("span", { class: "claim-field-hint" }, hint) : null,
    );
  }

  var unsub = subscribe(function () {
    if (getState().claimedArtistId) render();
  });
  render();
  return { el: el, destroy: unsub };
}
