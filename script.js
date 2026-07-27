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
