const body = document.body;
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

function updateHeader() {
  header?.classList.toggle("is-solid", window.scrollY > 480);
}

function closeMenu() {
  body.classList.remove("menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation");
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation" : "Open navigation",
  );
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

const readingCard = document.querySelector(".reading-card");
const readingSummary = readingCard?.querySelector(".reading-summary");

function setReadingExpanded(expanded) {
  readingCard?.classList.toggle("is-expanded", expanded);
  readingSummary?.setAttribute("aria-expanded", String(expanded));
}

readingSummary?.addEventListener("click", () => {
  const willExpand = !readingCard.classList.contains("is-expanded");
  setReadingExpanded(willExpand);
  if (!willExpand) readingSummary.blur();
});

document.addEventListener("click", (event) => {
  if (readingCard?.contains(event.target)) return;
  setReadingExpanded(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !readingCard?.classList.contains("is-expanded")) {
    return;
  }
  setReadingExpanded(false);
  readingSummary?.blur();
});

const waitlistForms = document.querySelectorAll("[data-waitlist-form]");

function setJoined(email) {
  waitlistForms.forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-form-status]");
    input.value = email;
    input.disabled = true;
    button.disabled = true;
    status.classList.remove("is-error");
    status.textContent =
      "You’re on the list. We’ll write when your device is ready.";
  });
}

waitlistForms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-form-status]");
    const email = input.value.trim();

    if (!email || !input.checkValidity()) {
      input.reportValidity();
      return;
    }

    button.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "Adding you to the list…";

    try {
      const response = await fetch("https://api.onycslabs.com/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error("Request failed");

      setJoined(email);
      window.localStorage.setItem("onycs-waitlist-email", email);
    } catch {
      status.classList.add("is-error");
      status.textContent =
        "We couldn’t add you just now. Please try again in a moment.";
      button.disabled = false;
    }
  });
});

const savedEmail = window.localStorage.getItem("onycs-waitlist-email");
if (savedEmail) setJoined(savedEmail);

document.querySelectorAll("[data-dialog-open]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.dialogOpen)?.showModal();
  });
});

document.querySelectorAll("[data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest("dialog")?.close();
  });
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const revealTargets = document.querySelectorAll(
  [
    ".section-heading",
    ".feedback-heading",
    ".process-panel",
    ".feedback-phone",
    ".solution-figure",
    ".value-images",
    ".advisor-copy",
    ".advisor-phone",
    ".science-card",
    ".founder-note blockquote",
    ".final-cta h2",
    ".final-cta > p",
    ".final-cta form",
  ].join(","),
);

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  document.documentElement.classList.add("motion-ready");

  revealTargets.forEach((target) => {
    target.classList.add("scroll-reveal");

    if (target.matches(".science-card")) {
      const siblingIndex = Array.from(target.parentElement.children).indexOf(
        target,
      );
      target.style.setProperty(
        "--reveal-delay",
        `${Math.min(siblingIndex, 2) * 90}ms`,
      );
    }
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}
