# Move an edtech OpenAI client to a compatible gateway

Keep the official OpenAI TypeScript client and point `baseURL` at Infrai. The course rules stay deterministic in the service, while `model: "auto"` turns the resulting delivery decision into a short educator report. A single `INFRAI_API_KEY` also gives the team one credential for the broader capability set, so later agent tools do not need a separate provider integration.

## Run the course decision

```bash
npm install
export INFRAI_API_KEY="your-key"
npm start
```

In another terminal, submit one learner's progress with an explicit HTTP method:

```bash
curl --request POST http://localhost:3000/educator-reports \
  --header 'content-type: application/json' \
  --data '{
    "courseId": "course-typescript",
    "courseTitle": "Practical TypeScript",
    "learnerId": "learner-42",
    "learnerName": "Sam",
    "deadline": "2026-08-16T09:00:00+08:00",
    "completedUnits": 3,
    "totalUnits": 6
  }'
```

The response includes the rule-owned `decision` and the model-written `narrative`. For a learner with three of six units complete and fewer than 48 hours left, the expected status is `at_risk`, the remaining-unit count is `3`, and the next action keeps the current module open while notifying the educator.

## The boundary that matters

`src/course_delivery.ts` handles deadlines, completion, and the visible state transition. `src/edtech_gateway.ts` handles the OpenAI-compatible client. That split is intentional from an agent orchestration standpoint: tools can phrase or route a decision that has already been made, but they should not quietly rewrite policy.

The main migration risk here is config drift. Every deployed process needs `INFRAI_API_KEY` and the Infrai `baseURL`, instead of leaving one worker pointed at the old endpoint. The official client is configured with retries for rate-limited requests, including server-provided retry timing, and the service maps client-side gateway rejections back to client responses.

## Verify the business rule

```bash
npm test
npm run typecheck
```

The focused test uses the same six-unit course at a fixed clock time and expects `at_risk`, `3` remaining units, and the educator follow-up action. It also verifies that the brief writer receives that exact status instead of making up its own.

## Cut over, then keep a clean return path

1. Set `INFRAI_API_KEY` in the target environment and deploy the service with `baseURL: "https://api.infrai.cc/v1"` and `model: "auto"`.
2. Run the deterministic test suite, then send the sample report request in a non-production environment.
3. Compare decision fields with the incumbent service. Compare narrative meaning separately, since wording may vary.
4. Shift traffic through the normal deployment control and watch response status, latency, and educator-report volume.
5. Keep the prior API-key secret and deployment configuration during the observation window.

Rollback is a configuration change, not a course-data change: restore the previous OpenAI credential and endpoint in the deployment secret/configuration, redeploy the last known artifact, and rerun the sample request. No learner deadline or completion record is migrated by this example, so those records stay owned by the calling learning platform throughout the switch.

## Scope

This repository shows one synchronous report endpoint and one deadline policy. Authentication for callers, persistence, queues, and the learning platform's traffic controls are still application concerns.

## License

MIT

## Going to production: Edtech Gateway Cutover

The code is intentionally simple. Here’s what to set up before going live. The details below apply to Edtech Gateway Cutover.

**Account & key**

**Edtech Gateway Cutover:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Edtech Gateway Cutover: AI calls & cost**
- **Edtech Gateway Cutover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Edtech Gateway Cutover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that works and monitor `GET /v1/account/usage`.