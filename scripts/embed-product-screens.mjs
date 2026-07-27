#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [, , inputPath, screensPath, outputPath] = process.argv;

if (!inputPath || !screensPath || !outputPath) {
  console.error(
    "Usage: node scripts/embed-product-screens.mjs <bundled-product.html> <screens-directory> <output.html>",
  );
  process.exit(1);
}

const screenSpecs = [
  { title: "Profile", file: "01-welcome-profile.png", group: "first" },
  { title: "Routine capture", file: "02-add-products.png", group: "first" },
  {
    title: "Environment & consent",
    file: "03-environment-consent.png",
    group: "first",
  },
  { title: "Skin plan", file: "04-skin-plan.png", group: "first" },
  { title: "Today", file: "05-today.png", group: "daily" },
  { title: "Routine", file: "06-routine.png", group: "daily" },
  { title: "Progress", file: "07-progress.png", group: "daily" },
  { title: "Ask", file: "08-ask.png", group: "daily" },
];

function safeScriptJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003C")
    .replaceAll(">", "\\u003E")
    .replaceAll("&", "\\u0026");
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOnce(source, pattern, replacement, label) {
  if (typeof pattern === "string") {
    const count = source.split(pattern).length - 1;
    if (count !== 1) {
      throw new Error(`Expected exactly one ${label} match, found ${count}`);
    }
    return source.replace(pattern, replacement);
  }

  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${label} match, found ${matches?.length ?? 0}`,
    );
  }
  return source.replace(pattern, replacement);
}

let bundle = await readFile(inputPath, "utf8");
const manifestPattern =
  /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/;
const templatePattern =
  /<script type="__bundler\/template">([\s\S]*?)<\/script>/;
const manifestMatch = bundle.match(manifestPattern);
const templateMatch = bundle.match(templatePattern);

if (!manifestMatch || !templateMatch) {
  throw new Error("The bundled product page is missing its manifest or template");
}

const manifest = JSON.parse(manifestMatch[1]);
let template = JSON.parse(templateMatch[1]);
const inserted = [];

for (const screen of screenSpecs) {
  const bytes = await readFile(path.join(screensPath, screen.file));
  const id = randomUUID();

  manifest[id] = {
    mime: "image/png",
    compressed: false,
    data: bytes.toString("base64"),
  };

  if (screen.group === "first") {
    const pattern = new RegExp(
      `(\\{ title: "${escapePattern(screen.title)}", caption: "[^"]*")\\s*\\}`,
      "g",
    );
    template = replaceOnce(
      template,
      pattern,
      `$1, src: "${id}" }`,
      `${screen.title} first-run screen`,
    );
  } else {
    const pattern = new RegExp(
      `(\\{ title: "${escapePattern(screen.title)}", caption: "[^"]*", grow: [^,}\\n]+)(?:, src: [^}\\n]+)?\\s*\\}`,
      "g",
    );
    template = replaceOnce(
      template,
      pattern,
      `$1, src: "${id}" }`,
      `${screen.title} daily screen`,
    );
  }

  inserted.push({ ...screen, id, bytes: bytes.length });
}

const oldPhone =
  '<div style="position: relative; width: 100%; aspect-ratio: 643 / 1398; filter: drop-shadow(0 14px 20px rgba(46,46,43,0.16)) drop-shadow(0 2px 3px rgba(46,46,43,0.10));">\n' +
  '                    <div style="position: absolute; left: 6.998%; top: 2.217%; width: 86.159%; height: 95.708%; border-radius: 9% / 4%; background: #FFFFFF; overflow: hidden;">{{ p.screenEl }}</div>\n' +
  '                    <img src="5b7e5682-1e90-476b-9783-30f18c8f27d1" alt="" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;">\n' +
  "                  </div>";
const newPhone =
  '<div style="position: relative; width: 100%; aspect-ratio: 836 / 1780; filter: drop-shadow(0 14px 18px rgba(46,46,43,0.14)) drop-shadow(0 2px 3px rgba(46,46,43,0.12));">\n' +
  '                    <div style="position: absolute; inset: 0; box-sizing: border-box; padding: 1.914%; border: 1px solid #5D5C59; border-radius: 13% / 6.15%; background: linear-gradient(120deg, #8A8986 0%, #242321 12%, #080808 32%, #171717 72%, #969592 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.38), inset 0 0 0 5px #090909;">\n' +
  '                      <div style="position: relative; width: 100%; height: 100%; border-radius: 11.55% / 5.32%; background: #050505; overflow: hidden;">{{ p.screenEl }}</div>\n' +
  "                    </div>\n" +
  '                    <span aria-hidden="true" style="position: absolute; top: 14.2%; left: -0.7%; width: 1.1%; height: 3.8%; border-radius: 3px 0 0 3px; background: #343330;"></span>\n' +
  '                    <span aria-hidden="true" style="position: absolute; top: 20.2%; left: -0.8%; width: 1.2%; height: 6.9%; border-radius: 3px 0 0 3px; background: #343330;"></span>\n' +
  '                    <span aria-hidden="true" style="position: absolute; top: 28.8%; left: -0.8%; width: 1.2%; height: 6.9%; border-radius: 3px 0 0 3px; background: #343330;"></span>\n' +
  '                    <span aria-hidden="true" style="position: absolute; top: 23.3%; right: -0.8%; width: 1.2%; height: 11.2%; border-radius: 0 3px 3px 0; background: #343330;"></span>\n' +
  "                  </div>";
const phoneCount = template.split(oldPhone).length - 1;

if (phoneCount !== 2) {
  throw new Error(`Expected two original framed-phone components, found ${phoneCount}`);
}

template = template.replaceAll(oldPhone, newPhone);

const objectFitCount = template.split('objectFit: "cover"').length - 1;
if (objectFitCount !== 2) {
  throw new Error(`Expected two phone object-fit rules, found ${objectFitCount}`);
}
template = template.replaceAll('objectFit: "cover"', 'objectFit: "contain"');

const arrowWidthPattern =
  'width: 26px; opacity: {{ p.arrowOpacity }}; display: flex;';
const arrowWidthCount = template.split(arrowWidthPattern).length - 1;
if (arrowWidthCount !== 2) {
  throw new Error(`Expected two walkthrough arrow width rules, found ${arrowWidthCount}`);
}
template = template.replaceAll(
  arrowWidthPattern,
  'width: {{ arrowWidth }}; opacity: {{ p.arrowOpacity }}; display: flex;',
);

const firstRunColumns =
  'firstRunCols: mode === "row" ? "1fr 1fr 1fr 1.09fr" : mode === "grid" ? "1fr 1.09fr" : "1fr"';
const dailyColumns =
  'dailyCols: mode === "row" ? "1.13fr 1fr 1.07fr 1.07fr" : mode === "grid" ? "1.13fr 1fr" : "1fr"';

template = replaceOnce(
  template,
  firstRunColumns,
  'firstRunCols: mode === "row" ? "repeat(4, minmax(0, 1fr))" : mode === "grid" ? "repeat(2, minmax(0, 1fr))" : "1fr"',
  "first-run column sizing",
);
template = replaceOnce(
  template,
  dailyColumns,
  'dailyCols: mode === "row" ? "repeat(4, minmax(0, 1fr))" : mode === "grid" ? "repeat(2, minmax(0, 1fr))" : "1fr"',
  "daily column sizing",
);

template = template
  .replace('grow: 1.13', "grow: 1")
  .replaceAll('grow: 1.07', "grow: 1");

template = replaceOnce(
  template,
  'gapHalf: mode === "row" ? "7px" : "20px",\n      phoneGap: mode === "row" ? "14px" : mode === "grid" ? "40px" : "0",',
  'gapHalf: mode === "row" ? "18px" : "26px",\n      phoneGap: mode === "row" ? "36px" : mode === "grid" ? "52px" : "0",\n      arrowWidth: mode === "row" ? "24px" : mode === "grid" ? "40px" : "0",',
  "walkthrough spacing",
);

bundle = bundle.replace(
  manifestPattern,
  () =>
    `<script type="__bundler/manifest">${JSON.stringify(manifest)}</script>`,
);
bundle = bundle.replace(
  templatePattern,
  () => `<script type="__bundler/template">${safeScriptJson(template)}</script>`,
);

await writeFile(outputPath, bundle);

const totalBytes = inserted.reduce((sum, screen) => sum + screen.bytes, 0);
console.log(
  `Embedded ${inserted.length} original screenshots (${totalBytes.toLocaleString()} bytes) inside deterministic CSS phone frames.`,
);
for (const screen of inserted) {
  console.log(`${screen.title}: ${screen.file}`);
}
