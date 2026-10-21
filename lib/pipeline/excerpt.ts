// An excerpt is kept only if it is an exact substring of the source body (PLAN 8.2).
// This is what stops the model from inventing quotes.
export function validExcerpt(excerpt: string | undefined | null, body: string): string | null {
  if (!excerpt) return null;
  const e = excerpt.slice(0, 500);
  return e.trim().length > 0 && body.includes(e) ? e : null;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;

// Data minimization before anything reaches the model.
export const stripPii = (s: string) => s.replace(EMAIL, "[email]").replace(PHONE, "[phone]");
