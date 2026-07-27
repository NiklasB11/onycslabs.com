const MAGIC = "ONYCSP01";
const HEADER_BYTES = 40;

const form = document.querySelector("#unlock-form");
const passwordInput = document.querySelector("#password");
const unlockButton = document.querySelector("#unlock-button");
const toggleButton = document.querySelector("#toggle-password");
const status = document.querySelector("#status");

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function setBusy(busy) {
  form.classList.toggle("is-busy", busy);
  passwordInput.disabled = busy;
  unlockButton.disabled = busy;
  toggleButton.disabled = busy;
  form.setAttribute("aria-busy", String(busy));
}

function readHeader(payload) {
  if (payload.byteLength <= HEADER_BYTES) {
    throw new Error("Invalid encrypted payload");
  }

  const bytes = new Uint8Array(payload);
  const magic = decoder.decode(bytes.subarray(0, 8));

  if (magic !== MAGIC) {
    throw new Error("Unsupported encrypted payload");
  }

  const view = new DataView(payload);
  const iterations = view.getUint32(8, false);

  return {
    iterations,
    salt: bytes.slice(12, 28),
    iv: bytes.slice(28, 40),
    ciphertext: bytes.slice(40),
  };
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"],
  );
}

async function decryptPage(password) {
  let response;

  try {
    response = await fetch("payload.bin", {
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new Error("preview-unavailable");
  }

  if (!response.ok) {
    throw new Error("preview-unavailable");
  }

  const payload = await response.arrayBuffer();
  const { iterations, salt, iv, ciphertext } = readHeader(payload);
  const key = await deriveKey(password, salt, iterations);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext,
  );
  const html = decoder.decode(plaintext);

  if (!html.trimStart().toLowerCase().startsWith("<!doctype html>")) {
    throw new Error("Decrypted page is invalid");
  }

  return html;
}

function revealPage(html) {
  try {
    localStorage.setItem("onycs-paper-unlocked", "1");
  } catch {
    // The bundled page can still load if storage is unavailable.
  }

  document.open();
  document.write(html);
  document.close();
}

toggleButton.addEventListener("click", () => {
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  toggleButton.textContent = isVisible ? "Show" : "Hide";
  toggleButton.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  toggleButton.setAttribute("aria-pressed", String(!isVisible));
  passwordInput.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = passwordInput.value;
  if (!password) {
    status.textContent = "Enter the password to continue.";
    passwordInput.focus();
    return;
  }

  setBusy(true);
  status.textContent = "Decrypting private page…";

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const html = await decryptPage(password);
    status.textContent = "Opening…";
    revealPage(html);
  } catch (error) {
    setBusy(false);
    if (error.message === "preview-unavailable") {
      status.textContent = "The local preview is unavailable. Refresh and try again.";
    } else {
      passwordInput.select();
      status.textContent = "That password isn’t right. Try again.";
    }
  }
});
