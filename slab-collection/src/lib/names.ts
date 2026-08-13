export function lastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}

export function primarySubjectName(
  subjects?: { name: string }[] | string[] | null,
): string {
  if (!subjects?.length) return "Unknown";
  const first = subjects[0];
  return typeof first === "string" ? first : first.name;
}

export function compareLastName(a: string, b: string): number {
  const lastA = lastName(a);
  const lastB = lastName(b);
  const cmp = lastA.localeCompare(lastB, undefined, { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Natural sort for checklist numbers like 63, 201, YG-201. */
export function compareCardNumbers(
  a?: string | null,
  b?: string | null,
): number {
  const left = a ?? "";
  const right = b ?? "";
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
