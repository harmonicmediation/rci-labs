# RCI Labs V1 — Product Specification

## V1 goal
Replace the current Zoom lab workflow with an RCI-owned experience that is simpler for students and far better for mentors. V1 should support real current cohorts without requiring the rest of RCI's future platform to exist.

## User roles
### Student / practice participant
- Authenticated RCI member.
- Can join a scheduled/open lab lobby.
- Is automatically assigned to an appropriate practice room.
- Uses camera/microphone, sees assigned role, timer and room status.
- Can request mentor help.
- Can receive private system/AI instructions if acting as a role-play client later; V1 only needs generic room messages and mentor messages.

### Mentor
- Authenticated account with mentor role.
- Enters a persistent moderator room with other mentors using live audio/video.
- Sees all active practice rooms and live status.
- Can claim/assign rooms, message rooms, enter practice rooms, return attention to moderator collaboration, move/reassign members, adjust timers, end rounds and view AI alerts.
- Can review AI-generated mentor reports and amend/approve them.

### Admin
- Full admin dashboard.
- CRUD mentors.
- CRUD members/clients.
- Activate/deactivate accounts.
- Assign roles and permissions.
- View active sessions and audit history.
- Configure global lab defaults and AI scoring rubrics for V1.

## V1 live-lab workflow
1. Admin/mentor creates or opens a lab session.
2. One Daily room is created for moderators.
3. Mentors join the moderator room and stay connected to each other.
4. Members enter the lab lobby.
5. Matching service places members into practice rooms according to configured room size (default 3).
6. Daily rooms and meeting tokens are created server-side.
7. Each practice room begins with a configurable round timer.
8. AI observer joins/monitors each active practice room, consumes transcript events and updates room risk/status.
9. Mentor dashboard displays normal, waiting, requested-help and AI-needs-attention rooms.
10. Mentor can enter a practice room while the app preserves the moderator context. Preferred UX: practice room opens in the main work area while moderator-room audio/video remains available in a compact dock and can be muted automatically while mentor is speaking in the practice room.
11. At round end, V1 may rotate generic roles Coach / Client / Observer if configured.
12. When the lab/session ends, AI produces a mentor report for each coach based on the configured V1 rubric and available transcript evidence.
13. Mentor reviews and can edit/approve the report.

## Matching requirements
V1 matching should be intentionally simple but extensible.
- Default group size: 3.
- Configurable group size per lab.
- First-in queue with basic avoidance of duplicate active-room assignment.
- Handle an incomplete final group by keeping people waiting until a mentor manually assigns/starts or until configurable timeout logic triggers.
- Handle disconnects and rejoin.
- Mentor can manually move a person between rooms.
- Data model must support future matching constraints: program, lesson, skill, prior partner history, homework readiness and cohort.

## Timer requirements
Every practice room has a server-authoritative timer.
- Configurable duration per room/session/round.
- Start, pause, resume.
- Reset requires confirmation.
- Optional mentor-only add/subtract time.
- Synced display for all participants.
- Survives page refresh/reconnect.
- Round state: pending, running, paused, complete, cancelled.
- Optional warning events at configurable remaining times.
- Timer changes create audit records.

## AI moderation requirements
Realtime AI should not attempt full grading every second. It should:
- Consume rolling transcript windows.
- Use the configured rubric for the current lab.
- Detect configured attention signals.
- Produce low-frequency structured events such as `normal`, `watch`, `mentor_suggested`, `mentor_requested`.
- Provide short reasons with transcript evidence/timestamps.
- Never expose private AI reasoning/chain-of-thought; output only concise evidence and classifications.
- Avoid flooding mentors with alerts; deduplicate and cool down repeated alerts.

Default V1 attention signals:
- participant explicitly requests help;
- repeated advice-giving when rubric says avoid advice;
- extended silence/no participation beyond configurable threshold;
- one participant dominating conversation if measurable from turns;
- escalating hostile/unsafe language using moderation checks;
- room missing a participant;
- transcript/AI observer failure;
- connection problem severe enough to disrupt practice.

## Mentor report requirements
A report is generated per coach after the relevant practice round/session.

Each report contains:
- overall score;
- score by configured metric;
- expected proficiency for the coach's current configured level;
- strengths / things they appear to be excelling at;
- habits/patterns to work on;
- transcript evidence with timestamps for material claims;
- confidence per metric;
- readiness status: `on_track`, `watch`, `extra_coaching_recommended`;
- optional mentor comments;
- approval/edit history.

V1 thresholds are configurable by admin. If a coach falls below threshold, flag for mentor review and possible extra coaching before progression. V1 does not automatically lock curriculum progression unless an admin explicitly enables that behavior later.

## Recording/transcript requirements
- Configurable per lab: recording on/off, transcription on/off.
- Explicit participant notice/consent appropriate to RCI policy before joining recorded/transcribed sessions.
- Store Daily recording/transcript identifiers in RCI DB.
- Do not expose vendor API keys to clients.
- Support retention policy and deletion later.

## Member/client CRUD in V1
For this project, `member` is the generic account/person record. A member may be a student, consumer coaching participant, mentor or admin.

Admin must be able to:
- create member;
- read/search/list member;
- update name/email/status/roles/basic profile;
- deactivate/reactivate member;
- soft-delete where legally/operationally appropriate;
- create/update mentor-specific metadata;
- create/update client/member status;
- see lab participation summary.

Do not hard-code `student` as the only member type. The future $29/month consumer program must use the same identity/member model.

## V1 exclusions
- No MemberClicks lesson-content synchronization required.
- No fictional persistent practice clients required.
- No client notes system required.
- No lesson-aware automatic role briefs required.
- No rewind/do-over scenario branching required.
- No AI voice practice partner required.
- No mobile-native app required; responsive web first, with architecture compatible with future mobile clients.
- No automated certification pass/fail.

## V1 acceptance criteria
- 50 simultaneous practice rooms can exist in test/staging without state collisions.
- Multiple mentors can remain in moderator collaboration while entering/leaving practice rooms.
- Participant presence updates appear on mentor dashboard within a few seconds.
- Timer state stays consistent across all clients and reconnects.
- AI observer can process a live room and raise a structured alert visible to mentors.
- End-of-session mentor report is generated, persisted, editable and attributable to source transcript segments.
- Admin can CRUD mentors and members.
- External test client can create/update/deactivate a member using the versioned API with proper authentication.
- All Daily/OpenAI secrets remain server-side.
