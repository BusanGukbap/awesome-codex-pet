import assert from "node:assert/strict";
import test from "node:test";
import { toCatalogItem } from "../generate-request-catalog.mjs";

function item(reference) {
  return toCatalogItem({
    number: 296,
    title: "[Request]: Example",
    body: `### Character or concept\n\n**Example**\n\n### Reference image\n\n${reference}\n\n### Visual and animation direction\n\n_Keep it cute._`,
    labels: [],
    state: "open",
  });
}

test("preserves underscores in reference paths, query keys, values, and fragments", () => {
  for (const url of [
    "https://static.wikia.nocookie.net/villains/images/c/cb/Kamen_Rider_Zein.jpg/revision/latest?cb=20240429162814",
    "https://www.google.com/search?sca_esv=a_b&fbs=Ha_h6_JJS_Cdt&q=pet_one#pose_two",
  ]) {
    const result = item(url);
    assert.equal(result.references, url);
    assert.deepEqual(result.referenceUrls, [url]);
  }
});

test("preserves linked, inline-code, and autolink URLs while cleaning surrounding prose", () => {
  const url = "https://example.com/pet_one.png?frame_id=left_eye#pose_two";
  for (const reference of [`[Reference](${url})`, `\`${url}\``, `<${url}>`]) {
    const result = item(reference);
    assert.deepEqual(result.referenceUrls, [url]);
    assert.ok(result.references.includes(url));
    assert.equal(result.characterDetails, "Example");
    assert.equal(result.visualDirection, "Keep it cute.");
  }
});

test("preserves image sources and deduplicates repeated reference links", () => {
  const url = "https://example.com/pet_one.png?frame_id=left_eye";
  const result = item(`![Reference](${url})\n\n${url}\n${url}`);
  assert.deepEqual(result.referenceUrls, [url]);
  assert.deepEqual(result.referenceImages, [url]);
});

test("keeps no-response and HTML cleanup behavior", () => {
  assert.equal(item("_No response_").references, "");
  assert.equal(item('<img src="https://example.com/a_b.png">').references, "");
  assert.deepEqual(item('<img src="https://example.com/a_b.png">').referenceImages, ["https://example.com/a_b.png"]);
});

test("extracts raw destinations before Markdown display cleanup", () => {
  const url = "https://example.com/pet_(one).png?frame_id=left_eye";
  for (const reference of [
    `[Reference](${url} "A title")`,
    `![Reference](${url} "A title")`,
    `<img src="${url}">`,
    `[Reference](<${url}>)`,
    `![Reference][ref]\n\n[ref]: ${url}`,
    `**${url}**`,
    `_${url}_`,
  ]) {
    assert.deepEqual(item(reference).referenceUrls, [url], reference);
  }
});

test("does not collect URLs from unrelated issue sections", () => {
  const result = item("https://example.com/reference_one.png\n\n### Similar pets checked\n\nhttps://example.com/not_a_reference");
  assert.deepEqual(result.referenceUrls, ["https://example.com/reference_one.png"]);
});

test("does not expose hidden comment URLs or strip literal URL punctuation", () => {
  const url = "https://example.com/pet_one_?pattern=a*b#pose_two_";
  assert.deepEqual(item(`<!-- https://example.com/hidden_one -->\n${url}`).referenceUrls, [url]);
});
