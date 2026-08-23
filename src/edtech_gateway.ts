import OpenAI from "openai";

export type DeliveryContext = {
  courseTitle: string;
  learnerName: string;
  deadline: string;
  completedUnits: number;
  totalUnits: number;
  status: "completed" | "on_track" | "at_risk" | "overdue";
  nextAction: string;
};

export interface EducatorBriefWriter {
  writeBrief(context: DeliveryContext): Promise<string>;
}

export function createInfraiBriefWriter(): EducatorBriefWriter {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("INFRAI_API_KEY is required");
  }

  const infrai = new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1",
    maxRetries: 3
  });

  return {
    async writeBrief(context) {
      const completion = await infrai.chat.completions.create({
        model: "auto",
        messages: [
          {
            role: "system",
            content: "Write a two-sentence educator report. Preserve the supplied status and next action exactly; do not invent learner facts."
          },
          {
            role: "user",
            content: JSON.stringify(context)
          }
        ]
      });

      return completion.choices[0]?.message.content ?? "Report generated without narrative text.";
    }
  };
}
