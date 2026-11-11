import { h } from "../dom.js";
import { subscribe, getState, searchArtists } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function ClaimView() {
  var el = h("main", { class: "screen claim-screen" });
  var step = 1;
  var query = "";
  var selectedId = null;
  var contactInfo = "";
  var isSubmitted = false;

  function render() {
    el.innerHTML = "";
    el.appendChild(backBar(!isSubmitted));

    if (isSubmitted) {
      el.appendChild(
        h(
          "div",
          { class: "claim-step-body claim-success" },
          h(
            "div",
            {
              class: "claim-success-icon",
              style: {
                background: "rgba(255, 138, 61, 0.15)",
                color: "var(--accent)",
              },
            },
            "⏳",
          ),
          h("h2", {}, "Claim Pending"),
          h(
            "p",
            { class: "muted" },
            "Your request has been sent to the Baze team for verification.",
          ),
          h(
            "p",
            { class: "muted" },
            "We will review your social media and approve your profile shortly.",
          ),
          h("a", { class: "claim-primary", href: "#/" }, "Back to Home"),
        ),
      );
      return;
    }

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
      return !a.claimedBy;
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
                selectedId = a._id;
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

    var input = h("input", {
      type: "search",
      class: "claim-search",
      placeholder: "Search artist name",
      value: query,
    });
    input.addEventListener("input", function (e) {
      query = e.target.value.trim();
      render();
      el.querySelector(".claim-search").focus();
    });

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "Find your artist name. We will verify your identity before giving you access.",
        ),
        input,
        list,
      ),
    );
  }

  function renderStep2() {
    var artist = selectedId
      ? searchArtists("").find(function (a) {
          return a._id === selectedId;
        })
      : null;

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "How will you verify your identity? We will check this manually.",
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
              step = 3;
              render();
            },
          },
          h("span", { class: "claim-option-icon" }, "📸"),
          h(
            "div",
            { class: "claim-option-text" },
            h("span", { class: "claim-option-title" }, "Instagram / Twitter"),
            h(
              "span",
              { class: "claim-option-sub" },
              "We will ask for your handle",
            ),
          ),
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-option",
            onClick: function () {
              step = 3;
              render();
            },
          },
          h("span", { class: "claim-option-icon" }, "✉️"),
          h(
            "div",
            { class: "claim-option-text" },
            h("span", { class: "claim-option-title" }, "Official Email"),
            h(
              "span",
              { class: "claim-option-sub" },
              "Send from your label email",
            ),
          ),
        ),
      ),
    );
  }

  function renderStep3() {
    var input = h("input", {
      type: "text",
      class: "claim-input",
      placeholder: "@yourhandle or email@domain.com",
      value: contactInfo,
    });

    el.appendChild(
      h(
        "div",
        { class: "claim-step-body" },
        h(
          "p",
          { class: "claim-intro" },
          "Enter your contact info so we can verify you.",
        ),
        h(
          "label",
          { class: "claim-field" },
          h("span", { class: "claim-field-label" }, "Verification Contact"),
          input,
        ),
        h(
          "button",
          {
            type: "button",
            class: "claim-primary",
            onClick: async function () {
              if (!input.value.trim())
                return showToast("Please enter your contact info");

              try {
                const artist = searchArtists("").find(function (a) {
                  return a._id === selectedId;
                });
                await api.requestClaim({
                  artistId: selectedId,
                  artistName: artist.name,
                  contactInfo: input.value.trim(),
                });
                isSubmitted = true;
                render();
              } catch (err) {
                showToast(err.message || "Failed to submit claim");
              }
            },
          },
          "Submit for Review",
        ),
      ),
    );
  }

  render();
  return { el: el, destroy: () => {} };
}
