import type { DeliveryContext, EducatorBriefWriter } from "./edtech_gateway.js";

export type CourseProgress = {
  courseId: string;
  courseTitle: string;
  learnerId: string;
  learnerName: string;
  deadline: string;
  completedUnits: number;
  totalUnits: number;
};

export type DeliveryDecision = DeliveryContext & {
  courseId: string;
  learnerId: string;
  remainingUnits: number;
};

export function decideDelivery(progress: CourseProgress, now: Date): DeliveryDecision {
  const remainingUnits = progress.totalUnits - progress.completedUnits;
  const deadline = new Date(progress.deadline);
  const hoursRemaining = (deadline.getTime() - now.getTime()) / 3_600_000;

  let status: DeliveryDecision["status"];
  let nextAction: string;

  if (remainingUnits === 0) {
    status = "completed";
    nextAction = "Record completion and release the course certificate.";
  } else if (hoursRemaining <= 0) {
    status = "overdue";
    nextAction = "Pause the next module and ask the educator to revise the deadline.";
  } else if (hoursRemaining <= 48 && remainingUnits > 1) {
    status = "at_risk";
    nextAction = "Keep the current module open and notify the educator for follow-up.";
  } else {
    status = "on_track";
    nextAction = "Deliver the next incomplete module.";
  }

  return {
    ...progress,
    remainingUnits,
    status,
    nextAction
  };
}

export async function prepareEducatorReport(
  progress: CourseProgress,
  writer: EducatorBriefWriter,
  now: Date = new Date()
) {
  const decision = decideDelivery(progress, now);
  const narrative = await writer.writeBrief(decision);
  return { decision, narrative };
}
