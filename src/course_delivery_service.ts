import { createServer } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import { prepareEducatorReport } from "./course_delivery.js";
import type { CourseProgress } from "./course_delivery.js";
import { createInfraiBriefWriter } from "./edtech_gateway.js";

const reportRequest = z.object({
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  learnerId: z.string().min(1),
  learnerName: z.string().min(1),
  deadline: z.string().datetime({ offset: true }),
  completedUnits: z.number().int().nonnegative(),
  totalUnits: z.number().int().positive()
}).refine((value) => value.completedUnits <= value.totalUnits, {
  message: "completedUnits cannot exceed totalUnits",
  path: ["completedUnits"]
});

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const writer = createInfraiBriefWriter();

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/educator-reports") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = reportRequest.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) {
      sendJson(response, 400, { error: "Invalid course progress", details: parsed.error.flatten() });
      return;
    }

    const progress = parsed.data as CourseProgress;
    const report = await prepareEducatorReport(progress, writer);
    sendJson(response, 200, report);
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Request body must be valid JSON" });
      return;
    }
    if (error instanceof OpenAI.APIError && error.status && error.status < 500) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error("Educator report request failed", error);
    sendJson(response, 502, { error: "Educator report could not be generated" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Course delivery service listening on http://localhost:${port}`);
});
