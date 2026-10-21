// Evidence as shown to the model. `id` is the source item's external id (e.g. "LV-118#c1"),
// which is also the citation id the drafts must use.
export type EvidenceForPrompt = { id: string; kind: string; date: string; author: string | null; tags: string[]; excerpt: string; title?: string };
