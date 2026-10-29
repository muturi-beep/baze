import { h } from "../dom.js";
import { loginUser, getState } from "../store.js";
import { showToast } from "../components.js";
import { api } from "../api.js";

export function LoginView() {
  const el = h("main", { class: "screen login-screen" });
  let step = "email"; // "email" | "otp"
  let identifier = "";
  let channel = "email";
  let loading = false;

  function render() {
    const s = getState();
    if (s.user.verified) {
      location.hash = "#/"; // Already logged in, go home
      return;
    }

    el.innerHTML = "";

    el.appendChild(
      h(
        "header",
        { class: "topbar" },
        h(
          "button",
          { "aria-label": "back", onClick: () => history.back() },
          "←",
        ),
        h("span"),
        h("span"),
      ),
    );

    el.appendChild(
      h(
        "div",
        { class: "login-hero" },
        h("h1", { class: "brand-large" }, "BAZE"),
        h(
          "p",
          { class: "muted" },
          step === "email"
            ? "Vote for the bangers. One fan, one vote."
            : "Enter the 6-digit code sent to " + identifier,
        ),
      ),
    );

    if (step === "email") {
      renderEmailStep();
    } else {
      renderOtpStep();
    }
  }

  function renderEmailStep() {
    const input = h("input", {
      type: "email",
      class: "login-input",
      placeholder: "Email address",
      autocomplete: "email",
    });

    const submit = async () => {
      const val = input.value.trim();
      if (!val || !val.includes("@")) return showToast("Enter a valid email");

      loading = true;
      submitBtn.textContent = "Sending...";
      try {
        identifier = val;
        channel = "email";

        await api.requestOtp(identifier, channel);

        // Production message
        showToast("Check your email for the code!");

        step = "otp";
        render();
      } catch (err) {
        showToast(err.message || "Failed to send code");
        loading = false;
        submitBtn.textContent = "Continue with Email";
      }
    };

    const submitBtn = h(
      "button",
      {
        class: "claim-primary",
        type: "button",
        onClick: submit,
      },
      "Continue with Email",
    );

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    el.appendChild(
      h(
        "div",
        { class: "login-form" },
        input,
        submitBtn,
        h(
          "p",
          { class: "legal" },
          "By continuing, you agree to the rules: 1 fan = 1 vote.",
        ),
      ),
    );
  }

  function renderOtpStep() {
    const input = h("input", {
      type: "text",
      class: "login-input code-input",
      placeholder: "000000",
      maxLength: 6,
      autocomplete: "one-time-code",
    });

    const submit = async () => {
      const val = input.value.trim();
      if (val.length !== 6) return showToast("Enter the 6-digit code");

      loading = true;
      submitBtn.textContent = "Verifying...";
      try {
        await loginUser(identifier, val, channel);
        showToast("Welcome to Baze!");
        location.hash = "#/"; // Redirect home
      } catch (err) {
        showToast(err.message || "Invalid code");
        loading = false;
        submitBtn.textContent = "Verify Code";
        input.value = "";
        input.focus();
      }
    };

    const submitBtn = h(
      "button",
      {
        class: "claim-primary",
        type: "button",
        onClick: submit,
      },
      "Verify Code",
    );

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    setTimeout(() => input.focus(), 100); // Auto-focus

    el.appendChild(
      h(
        "div",
        { class: "login-form" },
        input,
        submitBtn,
        h(
          "button",
          {
            class: "claim-secondary",
            type: "button",
            onClick: () => {
              step = "email";
              render();
            },
          },
          "Use a different email",
        ),
      ),
    );
  }

  render();
  return { el, destroy: () => {} };
}
