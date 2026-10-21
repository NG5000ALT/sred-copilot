import { Builder, type CompanyFixture } from "./builder";
import { addNoise } from "./noise";

// Bayfront Biologics Inc. — fictional. Enzyme reagents for diagnostic labs, Hamilton ON.
const people: CompanyFixture["people"] = [
  { external_id: "helen.a", name: "Helen Arsenault", title: "CEO", salary: 160000, employment_type: "employee", arm_length: false, specified_employee: true },
  { external_id: "marc.d", name: "Marc Desrosiers", title: "CSO", salary: 158000, employment_type: "employee", arm_length: false, specified_employee: true },
  { external_id: "aisha.b", name: "Aisha Bello", title: "Senior Formulation Scientist", salary: 112000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "tran.q", name: "Quang Tran", title: "Research Associate", salary: 72000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "sofia.r", name: "Sofia Romano", title: "Assay Development Scientist", salary: 98000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "eli.m", name: "Eli Murphy", title: "Lab Technician", salary: 58000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "grace.o", name: "Grace Okafor", title: "QC Analyst", salary: 66000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "paul.n", name: "Paul Nguyen", title: "QA Manager", salary: 92000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "ines.c", name: "Ines Costa", title: "IT and Systems Coordinator", salary: 70000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "derek.w", name: "Derek Wong", title: "Business Development", salary: 88000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "lena.k", name: "Lena Kowalski", title: "Operations Manager", salary: 76000, employment_type: "employee", arm_length: true, specified_employee: false },
  { external_id: "omid.f", name: "Omid Farahani", title: "Lyophilization Consultant", salary: 45000, employment_type: "contractor", arm_length: true, specified_employee: false },
].map((p) => ({ ...p, jira: p.external_id, slack: p.external_id }));

const channels = { general: "C11", formulation: "C12", assay: "C13", lab: "C14", sales: "C15", hiring: "C16", it: "C17", qc: "C18" };

function build() {
  const b = new Builder("bayfront-bio.example", channels);

  // ---------- B1: room-temperature stable lyophilized enzyme ----------
  b.epic("BB-5", "Room-temperature stable lyophilized BRT-7 formulation", "aisha.b", "2026-01-14 10:00",
    "Goal: a freeze-dried formulation of our BRT-7 reverse transcriptase that keeps at least 90% activity after 12 months at 25 C, so kits can ship without cold chain. Uncertainty: no published excipient system we know of keeps this enzyme class above 90% at 25 C; trehalose alone is the textbook answer and our early tests suggest it is not enough. Accelerated model: 8 weeks at 37 C as a predictor of 12 months at 25 C.");
  b.issue("BB-6", "BB-5", "Stability run 1: trehalose 5% baseline", "tran.q", "2026-01-26 09:00",
    "Hypothesis: 5% trehalose alone keeps activity above 90% after 8 weeks at 37 C.");
  b.comment("BB-6", "tran.q", "2026-03-24 16:00", "8 week result at 37 C: 72% residual activity (n=3). Hypothesis rejected.");
  b.issue("BB-8", "BB-5", "Stability run 2: sucrose + dextran matrix", "aisha.b", "2026-02-09 09:00",
    "Hypothesis: a sucrose and dextran 40 matrix with a higher glass transition protects the enzyme better than trehalose.");
  b.comment("BB-8", "aisha.b", "2026-04-07 15:30", "8 week result: 81% residual activity. Better, still below target. Moisture content 2.8%, which may be too high.");
  b.issue("BB-11", "BB-5", "Freeze-drying cycle: cake collapse investigation", "omid.f", "2026-04-13 10:00",
    "Run 3 cakes collapsed during primary drying at -25 C shelf temperature. Determine collapse temperature of the new matrix.");
  b.comment("BB-11", "omid.f", "2026-04-22 14:00", "Freeze-dry microscopy: collapse at -29 C. Lowered primary drying shelf temperature to -32 C. Cakes are now elegant, residual moisture 1.1%.");
  b.issue("BB-12", "BB-5", "Stability run 3: trehalose + arginine + pullulan", "aisha.b", "2026-04-27 09:00",
    "Hypothesis: adding 50 mM arginine to suppress aggregation and 2% pullulan as a glass former keeps activity above 90%, using the corrected -32 C cycle.");
  b.comment("BB-12", "aisha.b", "2026-06-23 17:00", "8 week result at 37 C: 94% residual activity (n=3, range 92 to 95%). Meets the accelerated target. Real-time 25 C study started, 12 month read-out due April 2027.");
  b.comment("BB-12", "marc.d", "2026-06-24 09:30", "Good. Note that the 8 week / 37 C model is our own assumption; we should confirm against the real-time data at 3 and 6 months.");
  b.issue("BB-14", "BB-5", "Real-time stability: 3 month read-out", "tran.q", "2026-09-28 09:00",
    "Measure activity after 3 months at 25 C for run 3 formulation.", "task");
  b.comment("BB-14", "tran.q", "2026-09-30 15:00", "3 month at 25 C: 97% residual activity. Consistent with the accelerated prediction so far.");
  b.doc("nb-b1-run1", "Lab notebook: BRT-7 stability run 1", "tran.q", "2026-03-24 17:00",
    "Notebook entry, BRT-7 lyophilization, run 1.\nFormulation: 5% trehalose, 20 mM Tris pH 8.0.\nCycle: freeze -45 C, primary drying -25 C shelf, secondary 25 C.\nResult after 8 weeks at 37 C: 72% residual activity (n=3: 70%, 72%, 74%).\nConclusion: trehalose alone is insufficient. Next: test higher-Tg matrix.");
  b.doc("nb-b1-run2", "Lab notebook: BRT-7 stability run 2", "aisha.b", "2026-04-07 16:00",
    "Notebook entry, run 2.\nFormulation: 4% sucrose, 3% dextran 40.\nResult after 8 weeks at 37 C: 81% residual activity. Residual moisture 2.8%.\nObservation: partial cake collapse in 2 of 6 vials. Suspect cycle runs above collapse temperature.");
  b.doc("nb-b1-run3", "Lab notebook: BRT-7 stability run 3", "aisha.b", "2026-06-23 18:00",
    "Notebook entry, run 3.\nFormulation: 5% trehalose, 50 mM arginine, 2% pullulan.\nCycle: primary drying at -32 C shelf after collapse measured at -29 C.\nResidual moisture 1.1%.\nResult after 8 weeks at 37 C: 94% residual activity (n=3: 92%, 94%, 95%).\nOpen question: does the 37 C model predict 25 C real-time behaviour for this matrix?");
  const t1 = b.msg("formulation", "tran.q", "2026-03-24 16:10", "Run 1 is in: 72% after 8 weeks at 37 C. Trehalose alone isn't going to get us there.");
  b.msg("formulation", "aisha.b", "2026-03-24 16:30", "Expected. The sucrose/dextran run reads out in two weeks. If that fails too I want to try an aggregation suppressor.", t1);
  b.msg("formulation", "omid.f", "2026-04-22 14:20", "Collapse temp for the new matrix is -29 C, we were drying at -25 C. Moved primary drying to -32 C.");
  b.msg("formulation", "aisha.b", "2026-06-23 17:10", "Run 3: 94% at 8 weeks / 37 C. First formulation over 90%.");
  b.msg("formulation", "marc.d", "2026-06-23 17:40", "Great result. Let's not oversell it until the real-time data agrees.");

  // ---------- B2: 96-well to 384-well assay (borderline to eligible, partial records) ----------
  b.epic("BB-20", "Miniaturize BRT-7 activity assay from 96-well to 384-well", "sofia.r", "2026-05-04 10:00",
    "Customers want to run more samples per plate. Uncertainty: whether the fluorescence signal-to-noise holds at 10 uL volumes, where evaporation and meniscus effects are larger.");
  b.issue("BB-21", "BB-20", "Pilot: 384-well at 10 uL", "sofia.r", "2026-05-11 10:00", "Hypothesis: straight scale-down keeps Z' above 0.5.");
  b.comment("BB-21", "sofia.r", "2026-06-05 16:00", "Z' fell from 0.78 in 96-well to 0.41 at 10 uL. Strong edge effects in the outer wells.");
  b.issue("BB-22", "BB-20", "Edge effect mitigation", "eli.m", "2026-06-15 10:00", "Try foil seal and 12 uL volume with higher substrate concentration.");
  b.comment("BB-22", "sofia.r", "2026-07-17 15:00", "With foil seal and 12 uL: Z' 0.62. Usable, not yet validated across lots.");
  b.msg("assay", "sofia.r", "2026-06-05 16:10", "384-well pilot: Z' 0.41, edge wells are a mess. Need to fix evaporation before this is usable.");
  b.msg("assay", "eli.m", "2026-07-17 15:20", "Seal + 12 uL got us to Z' 0.62.");

  // ---------- B3: LIMS migration (routine IT) ----------
  b.epic("BB-30", "Move lab records into new LIMS", "ines.c", "2026-02-16 10:00",
    "Replace spreadsheets with a commercial LIMS. Configure sample types, import historical records, train staff.");
  b.issue("BB-31", "BB-30", "Configure sample types and storage locations", "ines.c", "2026-02-20 10:00", "Vendor configuration per their onboarding guide.", "task");
  b.issue("BB-32", "BB-30", "Import 2024-2025 spreadsheet records", "ines.c", "2026-03-10 10:00", "CSV import using the vendor template.", "task");
  b.comment("BB-32", "ines.c", "2026-03-27 11:00", "Import done, 3,400 records. 12 rows needed manual fixes.");
  b.issue("BB-33", "BB-30", "Staff training sessions", "lena.k", "2026-04-06 10:00", "Two training sessions with the vendor.", "task");
  b.msg("it", "ines.c", "2026-03-27 11:10", "LIMS import finished. Training sessions next week.");

  // ---------- B4: routine QC batch release (excluded) ----------
  b.epic("BB-40", "Routine QC batch release testing", "grace.o", "2026-01-05 10:00",
    "Release testing for each production lot of BRT-7 kits per SOP-021: activity, purity, contamination.");
  b.issue("BB-41", "BB-40", "Release testing lot 2611", "grace.o", "2026-03-02 10:00", "Standard release panel. All specs met.", "task");
  b.issue("BB-42", "BB-40", "Release testing lot 2614", "grace.o", "2026-05-11 10:00", "Standard release panel. All specs met.", "task");
  b.issue("BB-43", "BB-40", "Release testing lot 2619", "grace.o", "2026-08-10 10:00", "Activity 2% below spec on first run; retest passed per SOP.", "task");
  b.msg("qc", "grace.o", "2026-08-12 10:00", "Lot 2619 released after retest. CoA uploaded.");
  b.msg("qc", "paul.n", "2026-08-12 10:30", "Thanks. Routine OOS investigation closed, no CAPA needed.");

  addNoise(b, "BB", 200, {
    support: ["lena.k", "derek.w"], sales: ["derek.w", "helen.a"], general: ["lena.k", "helen.a"], hiring: ["lena.k", "marc.d"],
    engineers: ["eli.m", "grace.o", "paul.n", "ines.c"], rd: ["aisha.b", "tran.q", "sofia.r"],
  }, 2026, 11, "biotech", 40);
  return b;
}

export const bayfront: CompanyFixture = {
  slug: "bayfront-bio",
  company: {
    name: "Bayfront Biologics Inc.", industry: "Biotech: enzyme reagents for diagnostic labs", city: "Hamilton, ON", size: 12,
    fiscal_year_end: "12-31", description: "Enzyme reagents for diagnostic labs. Synthetic demo company.",
  },
  people,
  build,
};
