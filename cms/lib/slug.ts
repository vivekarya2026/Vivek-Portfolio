export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Given a desired base slug and a list of taken slugs, return a unique slug by
 * appending -2, -3, ... as needed. Optionally ignore a slug (e.g. the item's own
 * current slug when editing).
 */
export function uniqueSlug(
  base: string,
  taken: string[],
  ignore?: string,
): string {
  const takenSet = new Set(taken.filter((s) => s !== ignore));
  const candidate = base || "item";
  if (!takenSet.has(candidate)) return candidate;
  let n = 2;
  while (takenSet.has(`${candidate}-${n}`)) n++;
  return `${candidate}-${n}`;
}
