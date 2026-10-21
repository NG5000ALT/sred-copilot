import type { Builder } from "./builder";

// Unrelated business chatter (~40% of items) so the pipeline has to separate R&D from noise.
// Deterministic: a seeded PRNG picks templates, people and dates.

type Roles = { support: string[]; sales: string[]; general: string[]; hiring: string[]; engineers: string[]; rd: string[] };

const T = {
  software: {
    supportTickets: [
      ["Camera feed drops on line 3 at {c}", "Operator reports the camera disconnects every few hours. Asked them to replace the USB cable."],
      ["Login loop for {c} admin user", "Password reset email not arriving. Resent from admin console."],
      ["{c} wants CSV export of last month's rejects", "Sent them the export from the reports page."],
      ["Wrong timezone on reports for {c}", "Report timestamps in UTC; changed account timezone setting."],
      ["{c} asks how to add a new inspection station", "Walked them through the station setup guide."],
    ],
    routineTasks: [
      ["Upgrade Node runtime to 22 LTS", "Bump base images and fix two deprecation warnings."],
      ["Fix flaky end-to-end test in CI", "Retry logic on the upload test; root cause was a missing await."],
      ["Rotate cloud access keys", "Quarterly key rotation per security checklist."],
      ["Add pagination to parts list API", "Cursor pagination, same pattern as the inspections endpoint."],
      ["SOC 2 evidence collection for Q{q}", "Export access reviews and change logs for the auditor."],
      ["Update dependencies with security advisories", "Patch release bumps; no breaking changes."],
    ],
    sales: [
      "Demo with {c} went well, they want a quote for 3 stations.",
      "{c} is comparing us with a bigger vendor, price is the main question.",
      "Signed {c} for a 6 month pilot!",
      "Trade show booth confirmed for the Toronto manufacturing expo.",
      "Can someone send me the latest case study PDF for {c}?",
    ],
    general: [
      "Office is closed Monday for the holiday.",
      "Reminder: expense reports due Friday.",
      "Welcome to our new team member, say hi in the thread!",
      "Lunch and learn on Thursday: how our support queue works.",
      "Benefits enrollment closes at the end of the month.",
    ],
    hiring: [
      "Two strong candidates for the backend role, scheduling onsites.",
      "Posted the QA engineer role on the job boards.",
      "Can someone do a technical interview Wednesday at 2?",
      "Offer accepted for the support role, starts in two weeks.",
    ],
    rdChatter: [
      "Doing code review for the API changes this afternoon.",
      "I'll be at the meetup tonight if anyone wants to come.",
      "Out tomorrow morning for an appointment.",
      "Can someone look at my PR for the config refactor?",
      "Interview notes for the backend candidate are in the doc.",
    ],
  },
  biotech: {
    supportTickets: [
      ["{c} asks for certificate of analysis for lot {n}", "Sent the CoA from the document system."],
      ["Shipment to {c} delayed at customs", "Contacted the courier, new ETA Thursday."],
      ["{c} reports lower signal with kit lot {n}", "Asked for their protocol; they used an expired buffer."],
      ["Quote request from {c} for 50 kits", "Forwarded to sales with volume pricing."],
    ],
    routineTasks: [
      ["Calibrate pipettes for Q{q}", "Quarterly calibration per SOP-014."],
      ["Order consumables for next month", "Plates, tips, buffer components."],
      ["Freezer temperature alarm review", "Reviewed alarm log, no excursions."],
      ["Update SDS binder", "Added two new chemical safety data sheets."],
      ["Biosafety cabinet certification", "Annual certification scheduled with the vendor."],
    ],
    sales: [
      "Call with {c} lab manager, they want samples of the RT kit.",
      "{c} is renewing their annual order.",
      "Booth at the diagnostics conference is confirmed.",
      "Distributor in Quebec wants a price list.",
    ],
    general: [
      "Lab is closed Friday afternoon for the fire drill.",
      "Reminder: lab coat laundry pickup is Tuesday.",
      "Welcome to our new lab tech!",
      "Team lunch on Thursday.",
    ],
    hiring: [
      "Posted the QC analyst role.",
      "Scheduling interviews for the lab technician role.",
      "Offer out for the formulation scientist position.",
    ],
    rdChatter: [
      "Booked the plate reader for tomorrow morning.",
      "I'll be at the seminar this afternoon.",
      "Reviewing the SOP updates today.",
      "Can someone cover the autoclave run at 3?",
    ],
  },
};

const CUSTOMERS = ["Northgate Plastics", "Hamilton Castings", "Erie Fasteners", "Maple Components", "Kingsway Labs", "Guelph Diagnostics", "Oakridge Clinical", "Bayview Metals"];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function addNoise(b: Builder, prefix: string, firstKey: number, roles: Roles, year: number, seed: number, flavor: "software" | "biotech" = "software", count = 60) {
  const r = rng(seed);
  const pick = <X>(xs: X[]) => xs[Math.floor(r() * xs.length)];
  const t = T[flavor];
  const date = () => {
    const m = 1 + Math.floor(r() * 9);
    const d = 1 + Math.floor(r() * 27);
    const h = 9 + Math.floor(r() * 8);
    return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}`;
  };
  const fill = (s: string) => s.replace("{c}", pick(CUSTOMERS)).replace("{n}", String(1000 + Math.floor(r() * 9000))).replace("{q}", String(1 + Math.floor(r() * 3)));
  let key = firstKey;
  for (let i = 0; i < count; i++) {
    const kind = r();
    if (kind < 0.2) {
      const [title, body] = pick(t.supportTickets);
      const k = `${prefix}-${key++}`;
      b.issue(k, null, fill(title), pick(roles.support), date(), fill(body), "bug");
      if (r() < 0.5) b.comment(k, pick(roles.support), date(), "Customer confirmed it is resolved. Closing.");
    } else if (kind < 0.42) {
      const [title, body] = pick(t.routineTasks);
      b.issue(`${prefix}-${key++}`, null, fill(title), pick(r() < 0.75 ? roles.engineers : roles.rd), date(), fill(body), "task");
    } else if (kind < 0.6) b.msg("sales", pick(roles.sales), date(), fill(pick(t.sales)));
    else if (kind < 0.75) b.msg("general", pick(roles.general), date(), fill(pick(t.general)));
    else if (kind < 0.85) b.msg("hiring", pick(roles.hiring), date(), fill(pick(t.hiring)));
    else b.msg("general", pick(roles.rd), date(), fill(pick(t.rdChatter)));
  }
}
