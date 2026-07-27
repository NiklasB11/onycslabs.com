#!/usr/bin/env node

import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const MAGIC = Buffer.from("ONYCSP01", "ascii");
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;

function usage() {
  console.error(
    "Usage: ONYCS_PRODUCT_PASSWORD=… node scripts/encrypt-product.mjs <input.html> <output.bin>",
  );
}

const [, , inputPath, outputPath] = process.argv;
const password = process.env.ONYCS_PRODUCT_PASSWORD;

if (!inputPath || !outputPath || !password) {
  usage();
  process.exit(1);
}

if (password.normalize("NFKC").length < 12) {
  console.error("The encryption password must contain at least 12 characters.");
  process.exit(1);
}

const plaintext = await readFile(inputPath);
const salt = randomBytes(SALT_BYTES);
const iv = randomBytes(IV_BYTES);
const key = pbkdf2Sync(
  Buffer.from(password.normalize("NFKC"), "utf8"),
  salt,
  ITERATIONS,
  KEY_BYTES,
  "sha256",
);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();
const iterationBytes = Buffer.alloc(4);
iterationBytes.writeUInt32BE(ITERATIONS);
const payload = Buffer.concat([
  MAGIC,
  iterationBytes,
  salt,
  iv,
  ciphertext,
  tag,
]);

await writeFile(outputPath, payload);

const decipher = createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(payload.subarray(payload.length - TAG_BYTES));
const verified = Buffer.concat([
  decipher.update(payload.subarray(40, payload.length - TAG_BYTES)),
  decipher.final(),
]);

if (
  verified.length !== plaintext.length ||
  !timingSafeEqual(verified, plaintext)
) {
  throw new Error("Encryption verification failed");
}

console.log(
  `Encrypted ${plaintext.length.toLocaleString()} bytes into ${payload.length.toLocaleString()} bytes and verified the round trip.`,
);
