# UI/UX and Room Behavior

## Design reference
See `mentor_dashboard_mockup.png`. It is a concept reference, not an exact implementation spec.

## Mentor live-lab screen — primary V1 surface
The mentor needs only information useful in the moment.

### Persistent top moderator area
- Live video tiles for currently connected mentors.
- Clear `Moderator Room` label.
- audio mute/unmute;
- video on/off;
- moderator chat;
- count of mentors online;
- indicator showing which mentor is currently inside which practice room.

When a mentor enters a practice room, the moderator collaboration remains conceptually persistent. Preferred UX:
- moderator room collapses to a small dock;
- moderator audio is automatically muted while mentor is actively talking/listening in practice room, unless technically safe to permit both;
- one-click return/restore;
- moderator team sees `John → Room 12`.

### Room grid/list
Each card shows only:
- room number;
- participants + roles;
- time remaining / elapsed;
- status;
- current lab/rubric label;
- open attention reason if any;
- `Join` button;
- overflow actions.

Status filters:
- all;
- needs attention;
- mentor requested;
- waiting/incomplete;
- on track;
- completed.

Room status must not depend only on color; include text/icon.

### Selected room detail
- participant videos when mentor joins;
- room timer;
- current roles;
- concise AI insights;
- room alerts;
- mentor notes;
- live transcript tab if allowed;
- actions: message room, move participant, add/replace participant, pause/resume/reset timer, adjust time, end round.

### Team coordination
- live moderator chat;
- claim/assign room;
- visible `claimed by` state;
- simple room note shared among mentors;
- ability to release a room;
- mentors should not duplicate interventions accidentally.

## Student room V1
Keep it much simpler than Zoom.
- primary video tiles;
- mute;
- camera;
- leave;
- optional chat if RCI wants it;
- `Request Mentor` prominent but not alarming;
- visible role (Coach / Client / Observer);
- visible timer;
- current exercise/lab title generic in V1;
- round status.

No unnecessary Zoom-like controls unless required.


## V2 event-mode participant controls
Breakout participation must be obvious and fast to change from the main event view. Use a compact control such as:
- `Breakouts: Participating`
- `Breakouts: Observer only`
- `Breakouts: Not participating`

Changing the setting takes one or two taps/clicks and immediately updates moderator state. During an active breakout exercise, clearly explain whether the change applies immediately or at the next regroup; moderators can apply it immediately when safe.

If `no_breakouts`, event policy decides whether the participant remains in the main room or is routed to the non-participating room. Show the participant where they will remain; do not make them look disconnected or forgotten.

### Pair-again controls inside breakout rooms
Participants can privately mark each other from the participant menu:
- `Prefer to practice together again`
- `Don't pair us again`
- `Clear preference`

Avoid wording that implies a social rating. This is a scheduling/matching preference, not feedback shown to the other person. Confirmation should be lightweight; avoid requires a simple confirmation to prevent accidental taps.

## V2 moderator event controls
The room grid becomes a live assignment board. In addition to V1 controls:
- create random groups of X;
- set observer slots;
- keep opt-outs in main or send to non-participating room;
- filter/search by participation mode;
- see unassigned/waiting counts;
- move one participant with `Move to...`;
- multi-select and bulk move;
- swap two participants;
- move to main/non-participating;
- regroup all;
- rebalance;
- merge/dissolve rooms;
- lock participant to current room;
- moderator can set/clear participant breakout mode and pairing preferences.

Desktop may support drag/drop, but every drag action must also have a button/menu equivalent. Before a moderator move violates an `avoid_again`, observer-only rule, role requirement or explicit lock, show a concise warning and require an intentional override.

Pairing preferences themselves are not displayed socially. Moderator UI can show matching constraints such as `avoid conflict` or `preferred pairing available` only where needed to make an assignment decision.

## Timer behavior
- Timer belongs to round and is authoritative on server.
- All participants see same value.
- Pause freezes countdown for everyone.
- Resume continues from saved remaining time.
- Reset opens confirmation modal: `Reset this round to 15:00?` with Cancel / Reset.
- Mentor can optionally change duration through a separate action.

## Queue/lobby
Student sees:
- joined lab successfully;
- matching state;
- estimated/actual queue status where possible;
- assigned room transition;
- no exposed Daily room URL.

Mentor sees waiting members and can manually assign if necessary.

## Admin V1
### Members
Table/search/detail editor:
- name;
- email;
- status;
- roles;
- entitlements;
- external IDs;
- lab participation summary.

### Mentors
- active/inactive;
- account/member linkage;
- specialties metadata;
- permissions.

### Rubrics
Simple usable editor:
- rubric version;
- metrics;
- weights;
- scoring anchors/instructions;
- readiness threshold;
- live alert rules.

### Labs
- create/open/close lab;
- default room size;
- default timer;
- recording/transcription settings;
- select rubric.
