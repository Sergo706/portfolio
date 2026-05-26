---
title: Protecting Your API Endpoints with Bot Detector
description: A practical, in-depth guide to protecting API endpoints using Bot Detector's layered pipeline, session binding, and custom checkers.
tags:
  - Security
  - Bot Detection
  - API
image: /articles/api.jpg
author: Sergio
date: 2026-04-16
readingTime: "20 min read"
---


APIs receive a wide range of automated traffic. Some of that traffic is useful and intentional. Other traffic probes for credentials, scrapes content at scale, or tries to find weaknesses.

![preview](/articles/api.jpg)

Protecting an endpoint requires combining multiple independent signals. A single rule rarely stops a determined attacker. [Bot Detector](https://docs.riavzon.com/docs/bot-detection) brings together reputation, fingerprinting, and behavioral analysis in a single pipeline.


Each signal has limits. IP reputation flags known bad ranges but attackers rotate addresses. User agent checks catch simple tools but not sophisticated ones. Timing and session signals reveal scripted behavior that other checks miss.

By combining signals you make evasion costly. An attacker must spoof multiple unrelated properties at once to avoid detection. That increases complexity and reduces the attack surface.

## How it fits

Bot Detector is an Express middleware that runs a two phase pipeline of [checkers](https://docs.riavzon.com/docs/bot-detection/checkers). The cheap phase runs synchronous, in-memory checks first and stops early when the score crosses the ban threshold. The heavy phase runs async checks only when needed.

The detector loads binary databases compiled by [Shield Base](https://docs.riavzon.com/docs/shield-base) at startup. Those files provide fast IP, ASN, Tor, proxy, and user-agent pattern lookups. A canary cookie ties each browser or client session to a persistent server record used by behavioral checks.

## Integrate quickly with Express

Mount the middleware early in the request chain so it can short-circuit abusive requests before they reach business logic. The example below shows a minimal Express setup and a protected login route.

Initialize the detector once at startup, then mount the middleware and protect sensitive routes.

```ts [server.ts]
import express from 'express';
import cookieParser from 'cookie-parser';
import { defineConfiguration, detectBots } from '@riavzon/bot-detector';

const app = express();
app.use(cookieParser());

await defineConfiguration({
  store: { main: { driver: 'sqlite', name: './bot-detector.db' } },
  banScore: 100,
  checkers: {
    enableBehaviorRateCheck: { enable: true },
    enableUaAndHeaderChecks: { enable: true }
  }
});

app.use(detectBots());

app.post('/auth/login', detectBots(), async (req, res) => {
  if (req.botDetection?.banned) return res.status(403).json({ ok: false, reason: 'BOT_DETECTED' });
  // continue with normal login flow
  res.json({ ok: true });
});
```

## Selective enforcement

Protect only the endpoints that matter. Use `detectBots()` as a route-level middleware for high value paths. This keeps false positive surface small and preserves throughput for public endpoints.

### Tuning for API traffic

APIs often serve legitimate automated clients. That fact changes how you tune the detector. The two common approaches are explicit client identification and adaptive penalties.

Use API keys or client certificates to identify trusted automation. When a request carries a valid API key, mark it as a trusted client in the [custom context](https://docs.riavzon.com/docs/bot-detection/guides/custom) and either lower penalties or skip specific checks. When you cannot trust the client, apply the full pipeline.

Explanation: build a small custom context that flags API clients based on the presence of a known key.

```ts [server.ts]
app.use(
  detectBots<{ isApiClient?: boolean }>((req) => ({
    isApiClient: Boolean(req.get('x-api-key'))
  }))
);
```

Then implement a cheap-phase checker that treats flagged clients differently.

```ts [checkers/api-client-checker.ts]
import { CheckerRegistry } from '@riavzon/bot-detector';
import type { IBotChecker, ValidationContext } from '@riavzon/bot-detector';

class ApiClientChecker implements IBotChecker<'API_CLIENT'> {
  name = 'api-client-checker';
  phase = 'cheap' as const;
  isEnabled() { return true; }

  run(ctx: ValidationContext) {
    if (ctx.custom?.isApiClient) return { score: 0, reasons: [] };
    return { score: 0, reasons: [] };
  }
}

CheckerRegistry.register(new ApiClientChecker());
```

This pattern keeps the pipeline flexible. Trusted clients retain their throughput while unknown clients face the full set of checks.

## Custom checkers for business signals

Custom checkers let you encode domain knowledge into the same scoring pipeline. Examples include plan tier limits, internal IP bypasses, or stricter rules for account creation endpoints.

Explanation: a checker inspects [`ctx.custom`](https://docs.riavzon.com/docs/bot-detection/guides/custom) and returns a score and reason codes. Register it at startup and the pipeline picks it up automatically.

```ts [checkers/plan-abuse-checker.ts]
import { CheckerRegistry } from '@riavzon/bot-detector';
import type { IBotChecker, ValidationContext } from '@riavzon/bot-detector';

class PlanAbuseChecker implements IBotChecker<'PLAN_ABUSE'> {
  name = 'plan-abuse';
  phase = 'cheap' as const;
  isEnabled() { return true; }

  run(ctx: ValidationContext<{ plan?: string }>) {
    if (ctx.custom?.plan === 'free' && ctx.geoData?.proxy) {
      return { score: 20, reasons: ['PLAN_ABUSE'] };
    }
    return { score: 0, reasons: [] };
  }
}

CheckerRegistry.register(new PlanAbuseChecker());
```

## Testing and validation

Test in three layers: unit test checkers, integration test the middleware, and run traffic simulations that mirror expected attacks. Start conservative and raise penalties after you observe real traffic.

a simple script can generate repeated login attempts to validate that cheap-phase short-circuits obvious attacks.

```bash [Terminal]
# 50 quick login attempts
for i in {1..50}; do
  curl -s -X POST https://api.example.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
```

Observe the detector logs and metrics during the run. Confirm that banned requests return 403 and that the application handlers never execute for those requests.

## Observability and metrics

Track these signals per endpoint and per reason code. They guide safe tuning and reveal blind spots.

- **Ban rate**: count of banned requests by endpoint.
- **Decision score distribution**: histogram of scores at decision time.
- **Cheap vs heavy phase time**: time spent in each phase.
- **Generation counts**: entries written to `banned.mmdb` and `highRisk.mmdb`.

Use your existing monitoring stack to alert on sudden increases in banned counts or generation volume. Those are reliable indicators of an active campaign.

## Operations and generation

Periodically run [generation](https://docs.riavzon.com/docs/bot-detection/guides/generate) to compile `banned.mmdb` and `highRisk.mmdb` from recent history. The detector hot reloads updated files automatically.

```bash [Terminal]
npx @riavzon/bot-detector generate
```

Start with nightly generation for moderate traffic. Move to hourly generation only if you see frequent repeat offenders that need immediate blocking.

## Progressive enforcement policy

Roll out enforcement in three steps. Detect, observe, then apply mitigation. Begin by logging decisions without blocking. Next, add `highRisk` compilations to bias the cheap phase. Finally, enforce bans for repeat offenders.

::note
Start conservative when you deploy detection to avoid impacting legitimate users. Use metrics to move from observation to enforcement.
::

## Summary

Protecting API endpoints requires signals that are hard to spoof together. Bot Detector combines compiled reputation data, fingerprint checks, and behavioral analytics into a two phase pipeline. Use API keys and custom checkers to handle legitimate automation. Tune by observing live traffic and increase enforcement in measured steps.

Learn more about the module in its [docs](https://docs.riavzon.com/docs/bot-detection).


