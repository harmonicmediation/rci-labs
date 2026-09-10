# Provider Cost Recheck: Daily + Pipecat vs LiveKit

## Decision for V1
Keep **Daily** as the media provider for the first build, but do **not** make Pipecat Cloud mandatory. Run the open-source Pipecat observer on RCI-managed container infrastructure by default.

This removes Pipecat Cloud's $0.01/active-agent-minute hosting surcharge while preserving Daily's strongest fit for the custom lab UI and room orchestration already specified.

## Why this changed
Pipecat itself is open source (BSD-2-Clause) and its official deployment guide explicitly supports self-managed deployment to Fly.io, AWS, Google Cloud Run and custom infrastructure:
- https://docs.pipecat.ai/pipecat/deployment/overview
- https://github.com/pipecat-ai/pipecat

Pipecat Cloud is therefore a convenience product, not a requirement for using Pipecat with Daily.

## LiveKit comparison
LiveKit is the strongest alternative and should remain behind the media/observer adapter boundary.

LiveKit has its own open-source Agents framework and supports self-hosting agent workers. Its managed Cloud agent hosting currently charges $0.01 per agent session minute after plan allowances — the same headline active-minute rate as Pipecat Cloud's smallest managed profile. Therefore LiveKit does **not** provide a dramatically cheaper managed-agent rate by itself.

However, its plan allowances are materially different:
- Build: $0/month; 1,000 managed agent minutes; 5,000 WebRTC participant minutes.
- Ship: $50/month; 5,000 managed agent minutes; 150,000 WebRTC participant minutes, then $0.0005/min.
- Scale: $500/month; 50,000 managed agent minutes; 1.5M WebRTC participant minutes, then $0.0004/min.

Sources:
- https://livekit.io/pricing
- https://docs.livekit.io/agents/
- https://docs.livekit.io/deploy/custom/deployments/

LiveKit Cloud also bills downstream data transfer after plan allowances, so participant-minute prices are not a complete all-in comparison with Daily.

## Current RCI-scale example
Assumption: 30 active students, 2 hours/week, 4.33 weeks/month, rooms of 3.

Human participant minutes:
30 * 120 * 4.33 = 15,588 participant-minutes/month.

Room/observer minutes, if every room has one observer:
15,588 / 3 = 5,196 observer-minutes/month.

### Daily + Pipecat Cloud
Pipecat Cloud managed observer hosting alone would be approximately:
5,196 * $0.01 = $51.96/month
before model/transcription/transport costs and any included/free allowances.

### Daily + self-managed Pipecat
There is no Pipecat Cloud per-minute hosting fee. RCI pays container compute plus Daily/transcription/model usage. This is the preferred V1 architecture. Measure real worker CPU/memory before committing to a hosting provider or reserved capacity.

### LiveKit Ship + managed agent
The $50 Ship plan includes 5,000 managed agent minutes, so this example would exceed the allowance by only about 196 agent minutes (~$1.96 at $0.01/min). It also includes far more human WebRTC minutes than this scenario uses. STT/inference and any bandwidth overage remain separate.

This means LiveKit can be economically attractive, but the saving is not because its managed agent minute is cheaper; it is because the paid plan bundles substantial allowances.

## Recommendation
1. Build V1 against a `MediaProvider` interface and an `ObserverProvider` interface.
2. Implement Daily first because the product design has already been validated against Daily's room/transcription/event model.
3. Self-host Pipecat observer workers from the start unless the managed service saves enough engineering time to justify its surcharge.
4. Before public launch, run the exact V1 vertical slice on LiveKit as a cost/complexity benchmark. If LiveKit proves equally easy, its bundled minutes and integrated agent tooling may justify switching before scale.
5. Do not couple rubrics, timers, member data, reports, mentor dashboards or room assignment logic to either Daily or LiveKit.
