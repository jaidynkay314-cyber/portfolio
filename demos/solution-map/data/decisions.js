// Demo decision records (generic).
window.DECISIONS = { schemaVersion: 1, items: [
  { id: "F-01", system: "fs", date: "2026-09", status: "decided", title: "Escalate the audience, not the frequency", decision: "Daily digests go to the coordinator, then the manager, then sales.", why: "More emails to the same person get ignored.", nodes: ["fs-digest"] },
  { id: "F-02", system: "fs", date: "2026-09", status: "decided", title: "Analytics stay out of daily use", decision: "Metrics live in a separate dashboard.", why: "Visible metrics read as surveillance and hurt adoption.", nodes: ["fs-metrics"] },
  { id: "F-03", system: "fs", date: "2026-10", status: "open", title: "Planned with no crew yet", decision: "Proposed: firm date is the hard gate, crew is soft, with an amber flag on the board.", why: "Crew allocation is still settling.", nodes: ["fs-app", "fs-board"] },
  { id: "Q-01", system: "quote", date: "2026-07", status: "decided", title: "Inform, never block", decision: "Totals and number mismatches show as warnings; the button stays enabled.", why: "Hard lockouts over typos made the old system hated.", nodes: ["f-parse"] },
  { id: "Q-02", system: "quote", date: "2026-07", status: "decided", title: "Gate and poll every consequential hand-off", decision: "Lock the screen and poll until the action is confirmed.", why: "No silent failures.", nodes: ["q-app"] }
] };
