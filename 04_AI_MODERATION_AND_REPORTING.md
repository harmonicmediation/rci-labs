# AI Moderation and Mentor Reporting

## Objective
Use AI as a live observer and post-session evaluator against explicit RCI rubrics. It should surface evidence and patterns, not act as an opaque authority.

## V1 moderation pipeline
1. Practice room opens.
2. Observer orchestrator starts one observer process for that room.
3. Observer joins Daily room as non-speaking/non-video participant.
4. Daily realtime transcription is started for the room.
5. Observer receives `on_transcription_message` events with text, participant ID and timestamps.
6. Participant IDs are mapped to RCI member/role IDs.
7. Final transcript segments are persisted/buffered.
8. Every configurable interval (for example 45–90 seconds or enough tokens), moderation service evaluates only the newest window plus compact state from earlier windows.
9. AI returns strict JSON matching a schema.
10. Rules engine combines AI signal with deterministic signals such as missing participant, explicit help request and observer failure.
11. Alert state is updated only when threshold/cooldown rules permit.

## Recommended V1 AI output schema
```json
{
  "room_state": "normal|watch|mentor_suggested|urgent",
  "confidence": 0.0,
  "signals": [
    {
      "code": "repeated_advice_giving",
      "severity": "watch",
      "summary": "Coach gave direct advice twice during an exercise focused on reflection.",
      "evidence": [
        {"speaker":"coach","timestamp_ms":123000,"quote":"..."}
      ]
    }
  ],
  "rubric_observations": [
    {"metric_code":"avoid_advice","direction":"negative","strength":0.72}
  ]
}
```

Do not request or store chain-of-thought. Ask the model for classifications, scores, concise rationales and direct transcript evidence only.

## Realtime model strategy
V1 should use text transcription as the primary signal because it is cheaper, inspectable and easier to validate. Add audio/prosody analysis only after proving a use case that text cannot measure.

Use two AI paths:
- fast/cheap rolling evaluator for live alerts;
- higher-quality post-session evaluator for final report.

## Safety moderation
Run explicit harmful-content checks separately from coaching-quality scoring. A harmful-language flag should not be conflated with poor coaching technique.

## Rubric design
Every metric must define:
- code/name;
- observable behavior;
- scale and anchors;
- weight;
- expected score at current level;
- evidence requirements;
- confidence rules;
- alert thresholds if relevant.

Example metric:
```text
Code: avoid_advice
Scale: 1–5
1 = repeatedly prescribes solutions without eliciting client perspective
3 = mostly avoids advice but occasionally slips into suggestion
5 = consistently supports client discovery without directing outcome
Evidence required: at least two transcript examples for score <=2 or >=5 when available
```

## Mentor report generation
At end of round/session:
1. Load rubric version used by the room.
2. Load transcript segments and relevant live observations.
3. Chunk/summarize if necessary, preserving evidence references.
4. Generate metric scores.
5. Validate score schema and clamp ranges.
6. Compute weighted overall score in deterministic application code, not by trusting the model's arithmetic.
7. Derive readiness threshold in deterministic code.
8. Ask AI for concise strengths and habits-to-work-on grounded in scored evidence.
9. Save as draft.
10. Mentor reviews/edits/approves.

## Report fields
For each metric:
- AI score;
- optional mentor override score;
- confidence;
- 1–3 evidence references;
- concise note.

Overall:
- weighted score;
- expected score / level;
- strengths;
- recurring habits to work on;
- readiness status;
- extra coaching recommendation;
- mentor comments;
- model/rubric version for auditability.

## Habit tracking
V1 can generate habits from one report, but data model should support longitudinal patterns. Later versions should aggregate metrics and repeated qualitative tags across sessions, e.g.:
- gives advice when uncomfortable with silence;
- moves to solution before sufficient understanding;
- excellent at reflecting emotion;
- asks multiple questions at once.

## Alert fatigue controls
- minimum confidence threshold;
- per-category cooldown;
- require repeated signal for non-urgent alerts;
- collapse similar alerts;
- explicit help request always takes precedence;
- show one short explanation, not a stream of AI commentary.

## AI failure mode
If observer or AI fails:
- room continues normally;
- mentor dashboard shows `AI unavailable` rather than blocking session;
- transcript/recording should continue if provider allows;
- report can be generated later from stored transcript.

## Future AI practice partner
Do not couple V1 evaluator to human-only assumptions. Represent every participant as an actor with `actor_type = human | ai`. Later Pipecat can run an AI client actor in the same Daily room, receiving curriculum/scenario state and speaking naturally.

## V1 observer hosting decision
Default to the open-source Pipecat framework running on RCI-managed container infrastructure rather than Pipecat Cloud. Pipecat Cloud is acceptable for an initial spike or fallback, but its smallest active profile currently adds $0.01 per observer minute. A silent transcript/event observer does not justify that managed-agent surcharge until operational evidence says otherwise.

The observer implementation must therefore be stateless/restartable and launched with a compact job payload: `practiceRoomId`, Daily room URL/token, Convex deployment/observer credential, rubric version, and evaluator configuration. Persist all authoritative room/evaluation state in Convex, not inside the worker.
