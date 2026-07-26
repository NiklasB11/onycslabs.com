const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

function closeMenu() {
  body.classList.remove("menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open navigation");
}

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

const revealItems = document.querySelectorAll(".reveal");
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

const waitlistForms = document.querySelectorAll("[data-waitlist-form]");

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

      waitlistForms.forEach((otherForm) => {
        const otherStatus = otherForm.querySelector("[data-form-status]");
        const otherInput = otherForm.querySelector('input[type="email"]');
        otherInput.value = email;
        otherInput.disabled = true;
        otherForm.querySelector('button[type="submit"]').disabled = true;
        otherStatus.classList.remove("is-error");
        otherStatus.textContent =
          "You’re on the list. We’ll write when ONYCS is ready.";
      });
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
if (savedEmail) {
  waitlistForms.forEach((form) => {
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-form-status]");
    input.value = savedEmail;
    input.disabled = true;
    button.disabled = true;
    status.textContent =
      "You’re on the list. We’ll write when ONYCS is ready.";
  });
}

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
