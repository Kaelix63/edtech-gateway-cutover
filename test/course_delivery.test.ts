import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery, prepareEducatorReport } from "../src/course_delivery.js";
import type { EducatorBriefWriter } from "../src/edtech_gateway.js";

const progress = {
  courseId: "course-typescript",
  courseTitle: "Practical TypeScript",
  learnerId: "learner-42",
  learnerName: "Sam",
  deadline: "2026-08-16T09:00:00+08:00",
  completedUnits: 3,
  totalUnits: 6
};

test("marks unfinished work inside 48 hours as at risk", () => {
  const decision = decideDelivery(progress, new Date("2026-08-15T09:30:00+08:00"));

  assert.equal(decision.status, "at_risk");
  assert.equal(decision.remainingUnits, 3);
  assert.equal(decision.nextAction, "Keep the current module open and notify the educator for follow-up.");
});

test("passes the deterministic decision to the educator brief writer", async () => {
  let observedStatus = "";
  const writer: EducatorBriefWriter = {
    async writeBrief(context) {
      observedStatus = context.status;
      return `${context.learnerName}: ${context.status}`;
    }
  };

  const report = await prepareEducatorReport(
    progress,
    writer,
    new Date("2026-08-15T09:30:00+08:00")
  );

  assert.equal(observedStatus, "at_risk");
  assert.equal(report.narrative, "Sam: at_risk");
});
