# Feature Specification: PSP Course Platform

**Feature Branch**: `001-psp-course-platform`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "I want to build a Personal Strategic Planning Course website to help the facilitator guide the user through it. Auth is required with access to the course provided by an account in the admin side. An the Admin website provides access and shows stats of completion and such. Similarly facilitator site also shows the statistics of their specific session. All data is stored for future access."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Participant Course Journey (Priority: P1)

A participant logs in and works through the Personal Strategic Planning™ course at their own pace.
They navigate the five PSP filters (Personality, Attitudes, Values, Roles & Their Demands,
Transferable Skills) and the Goal Setting section, completing interactive exercises and reflection
prompts along the way. Their progress and all responses are saved automatically so they can close
the browser and resume exactly where they left off.

**Why this priority**: This is the core value delivered by the platform. Without a working
participant journey, nothing else has purpose. Completing this story alone constitutes a
shippable MVP that can be demonstrated to facilitators.

**Independent Test**: A newly enrolled participant can log in, complete at least one section's
exercises, log out, log back in, and find all responses intact and progress accurately reflected.

**Acceptance Scenarios**:

1. **Given** a participant account with active enrollment, **When** they log in, **Then** they see
   a course dashboard showing their progress across all six course sections with a clear visual
   indicator of where they left off.
2. **Given** a participant viewing a section, **When** they complete an interactive exercise
   (checkbox, fill-in, ranking, or table), **Then** their response is saved automatically without
   any manual save action and persists across browser sessions.
3. **Given** a participant who closed the browser mid-section, **When** they return and log in,
   **Then** they are returned to exactly the content position they left, with all prior responses
   intact.
4. **Given** a participant who has completed all exercises in a section, **When** they view that
   section, **Then** it is marked complete and they can navigate forward or review previous
   responses.

---

### User Story 2 - Admin Platform Management (Priority: P2)

An admin logs into a management portal where they can create and manage all user accounts
(facilitators and participants), create workshop sessions, assign facilitators, grant and revoke
participant access, and view aggregate completion statistics across all sessions.

**Why this priority**: Admins control access and visibility into platform health. Without
this, facilitators cannot be set up and participants cannot be enrolled.

**Independent Test**: An admin can create a facilitator account, create a session, enroll a
participant, and view that participant's progress percentage on the stats dashboard — all within
a single sitting.

**Acceptance Scenarios**:

1. **Given** an admin user, **When** they create a facilitator account with an email address,
   **Then** the facilitator receives a credential and can log in with their assigned role.
2. **Given** an admin user, **When** they create a session and assign a facilitator, **Then** that
   facilitator can see the session in their portal.
3. **Given** an admin user, **When** they revoke a participant's course access, **Then** the
   participant loses access immediately on their next page load.
4. **Given** an admin viewing the stats dashboard, **When** sessions are in progress, **Then** they
   see completion percentages, section-by-section breakdowns, and participant counts per session.

---

### User Story 3 - Facilitator Session Oversight (Priority: P3)

A facilitator logs into their portal, views the sessions assigned to them, and monitors each
participant's real-time progress within their sessions. During a live workshop, the facilitator
can see which section each participant is on and how many exercises they have completed.

**Why this priority**: Real-time oversight is what differentiates a guided workshop from
self-paced e-learning. Facilitators need live visibility to pace their in-room or virtual
facilitation.

**Independent Test**: With two browser windows open (one as facilitator, one as a participant
in their session), when the participant completes an exercise the facilitator's dashboard
reflects the update within five seconds without a page refresh.

**Acceptance Scenarios**:

1. **Given** a facilitator logged in, **When** they view a session, **Then** they see each
   enrolled participant's name, current section, and overall completion percentage.
2. **Given** a facilitator's active session, **When** a participant completes an exercise,
   **Then** the facilitator's dashboard reflects the updated progress within five seconds.
3. **Given** a facilitator viewing session statistics, **When** the session has ended, **Then**
   they see a historical summary of completion rates and section-by-section breakdowns.

---

### User Story 4 - Persistent Data Access (Priority: P4)

All exercise responses, progress records, and completion data are stored permanently. Both
participants and facilitators can review past responses. Admins can access historical session data.

**Why this priority**: The PSP framework's value compounds over time — participants revisit
their goals and self-assessments. Data permanence is a core product promise.

**Independent Test**: A participant who completed a session three months ago can log in and
read all their exercise responses exactly as entered.

**Acceptance Scenarios**:

1. **Given** a completed session, **When** any participant views their course history, **Then**
   all responses from that session are displayed in read-only form.
2. **Given** a facilitator reviewing a past session, **When** they view the session detail page,
   **Then** they see final completion stats and can identify which participants finished.

---

### Edge Cases

- What happens when a participant's enrollment is revoked mid-session? They should lose access on
  their next navigation event without losing already-submitted responses.
- What happens when a facilitator's session assignment is removed? They lose visibility into that
  session's participants but the session data is preserved.
- What happens if two browser tabs are open for the same participant? The latest save wins;
  both tabs reflect the same persisted state.
- What happens when a participant opens the course on mobile? All content and exercises MUST be
  usable on screens ≥ 375 px wide.
- What happens if the platform is accessed after a session's end date? Participants retain
  read-only access to their completed responses; new responses cannot be submitted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce role-based access for three roles: Admin, Facilitator, and
  Participant — each with distinct, non-overlapping capabilities.
- **FR-002**: System MUST authenticate all users via email and password; no anonymous access
  is permitted.
- **FR-003**: Admin MUST be able to create, edit, and deactivate user accounts for facilitators
  and participants.
- **FR-004**: Admin MUST be able to create workshop sessions, set titles and dates, and assign
  exactly one facilitator per session.
- **FR-005**: Admin MUST be able to enroll and unenroll participants in sessions.
- **FR-006**: Admin MUST be able to grant and revoke a participant's course access independently
  of session enrollment.
- **FR-007**: Admin MUST be able to view aggregate completion statistics: sessions count,
  participant count, overall and per-section completion rates.
- **FR-008**: System MUST track each participant's progress at the exercise level within each
  section, storing completion state and the response content.
- **FR-009**: System MUST auto-save all participant responses immediately upon interaction —
  no manual save action required.
- **FR-010**: Participant MUST be able to resume their course from their last position on login.
- **FR-011**: System MUST render all PSP™ course content across all six sections in an
  interactive format, preserving all attribution and trademark language from the source document.
- **FR-012**: System MUST support four exercise interaction types: checkbox selection, free-text
  reflection, ranked ordering, and table completion (fill-in grids).
- **FR-013**: Facilitator MUST be able to view real-time per-participant progress within their
  assigned sessions.
- **FR-014**: Facilitator MUST be able to view completion statistics for their sessions,
  historically and in real-time.
- **FR-015**: All data MUST be retained permanently (no automatic expiry); deactivated accounts
  retain their historical response data.

### Key Entities

- **User/Profile**: A platform identity with a role (admin, facilitator, or participant), display
  name, email, active status, and access grant state.
- **Session**: A workshop run with a title, assigned facilitator, start and end dates, and a list
  of enrolled participants.
- **Enrollment**: The relationship between a participant and a session, including enrollment date
  and active status.
- **Section**: One of the six course segments (Personality, Attitudes, Values, Roles & Their
  Demands, Transferable Skills, Goal Setting), each containing ordered exercises.
- **Exercise**: An individual interactive element within a section: type (checkbox, text, table,
  ranking), prompt content, and ordering.
- **Response**: A participant's saved answer to a specific exercise, stored as structured content,
  with creation and last-updated timestamps.
- **Progress**: A per-participant, per-section record tracking how many exercises have been
  completed and whether the section is marked done.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A participant reaches their current course position within 10 seconds of logging in.
- **SC-002**: All exercise responses are saved without any explicit participant action and persist
  across browser sessions with 100% fidelity.
- **SC-003**: An admin can create a facilitator account, create a session, and enroll a
  participant in under three minutes.
- **SC-004**: A facilitator's dashboard reflects a participant's exercise completion within five
  seconds of the participant submitting a response.
- **SC-005**: A participant who closed the browser resumes at their exact prior position with all
  previous responses visible.
- **SC-006**: All six PSP course sections are fully navigable and all exercise types are
  interactable on screens from 375 px to 2560 px wide.

*Performance baselines (per Constitution v1.0.0):*

- **SC-PERF-1**: Page/view initial load p95 ≤ 2 000 ms (4G simulated)
- **SC-PERF-2**: Time to Interactive p95 ≤ 3 500 ms
- **SC-PERF-3**: API read responses p99 ≤ 500 ms under expected load

## Assumptions

- Workshop sessions are run alongside live facilitation (in-person or video call); the platform
  supplements but does not replace the facilitator's live guidance.
- Participant accounts are created by admins or facilitators — participants do not self-register.
- A single organization operates the platform: Bijo Abraham / Select HR Solutions
  (`share@risewithpsp.com`); no multi-tenancy is required in v1.
- Email-based password reset is handled by the authentication provider's built-in flow.
- No payment processing is included in v1; course access is manually granted by admins.
- Mobile devices are supported (tablets and phones used during workshops); offline mode is out
  of scope for v1.
- The course content is the text of `psp_content.md`; it is structured and stored in the
  database as seeded data, not as uploaded files.
- Expected concurrent users per session: 5–30 participants; expected total platform users: < 500
  in v1.
- Export of participant data (PDF reports) is out of scope for v1 but the data model must not
  preclude it.
