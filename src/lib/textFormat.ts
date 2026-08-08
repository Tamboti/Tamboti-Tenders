// Some scraped sources leave literal HTML entities in the text (&quot;,
// &#39;, ...) instead of the actual characters — decode via a detached
// textarea rather than a hand-rolled entity table, since it handles named,
// decimal, and hex entities alike. Never re-inserted as HTML anywhere, only
// read back as plain text.
const decodeHtmlEntities = (text: string): string => {
  if (typeof document === "undefined") return text;
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
};

// Scraped tender descriptions often arrive as one giant run-on block with no
// line breaks at all (typical of raw PDF text extraction) — this restores
// rough paragraph structure so it's actually readable instead of a wall of
// text, in both the quick view and the tender detail page.
export const splitIntoParagraphs = (text: string): string[] => {
  const trimmed = decodeHtmlEntities(text).trim();
  if (!trimmed) return [];

  // Respect real paragraph breaks if the source actually has them.
  const existing = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (existing.length > 1) return existing;

  // No real breaks — group sentences into paragraphs instead. Naive on
  // purpose (splitting on ". "/"? "/"! " before a capital/digit is wrong for
  // abbreviations and decimals often enough to be visible), but still reads
  // far better than one unbroken block.
  const sentences = trimmed
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 3) return [trimmed];

  const perParagraph = 3;
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    paragraphs.push(sentences.slice(i, i + perParagraph).join(" "));
  }
  return paragraphs;
};
