# Feature Specification: Week Swipe Gesture

**Feature Branch**: `003-week-swipe-gesture`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Your job is to specify the feature researched in @docs/research/week-swipe-gesture.md"

Domain terms in **bold** are defined in [GLOSSARY.md](../../GLOSSARY.md). The product contract is [docs/SPEC.md](../../docs/SPEC.md) (Tydzień, "Planned (later)"). The options and the recommended approach are in [docs/research/week-swipe-gesture.md](../../docs/research/week-swipe-gesture.md). This feature builds on [feature 002](../002-week-planning/spec.md). It replaces the release-only swipe from 002's FR-005 with a gesture where the content follows the finger. Everything else on the Week page stays as it is.

## Background

Today the user swipes the Week card on a phone and nothing moves until they lift the finger. Then the Week changes and the new one slides in briefly. Changing the **Week** is the app's primary interaction, so it should feel physical. While dragging, the user should see the Week they're pulling in. When they let go, it should settle into place quickly, or spring back if they changed their mind.

Words used in this spec (UI terms, not domain terms):

- **Week card**: the card at the top of the Tydzień tab. It holds the month label, the day strip, the selected day's totals and "Skopiuj do następnego tygodnia".
- **Week face**: the part of the Week card that moves with the finger. It's the month label ("Listopad 2026") and the day strip (seven days with their Planned kcal). Nothing else moves.
- **Viewed Week**: the Week the page is showing. **Neighbour Weeks**: the Week before it and the Week after it.
- **Settle**: the short animation after release that brings a neighbour Week into the centre. **Spring back**: the short animation that returns the viewed Week to the centre.

## Clarifications

### Session 2026-11-05

- Q: When the drag is released and the Week changes, should the new Week slide the rest of the way into place, or fade? → A: Slide into place, continuing the finger's motion. Neighbour Weeks are slightly dimmed and reach full strength in the centre. No fade-out and fade-in.
- Q: If the user touches the Week card again while it is still settling after a swipe, what should happen? → A: The card can be grabbed mid-settle. It stops where it is and follows the finger from there, so two quick flicks move two Weeks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag to the next or previous Week (Priority: P1)

On a phone, the user puts a finger on the Week card and drags left. The Week face follows the finger, and the next Week's month label and day strip slide in from the right, with real Planned kcal for each day. When the user lets go past about a third of the card width, or flicks quickly, the next Week settles into the centre in about 200 ms. The selected day's heading, totals and Slots below then show the same weekday in the new Week. Dragging right does the same with the previous Week.

**Why this priority**: This is the feature. Finger-follow, neighbour peeking and settling are what the user asked for. The other stories protect it or extend it.

**Independent Test**: On an iPhone, open Tydzień on a Week where both neighbour Weeks have Meals. Drag slowly left and confirm the next Week's month label and kcal are visible beside the current one. Release past a third of the width and confirm the next Week is in the centre with the same weekday selected. Repeat to the right.

**Acceptance Scenarios**:

1. **Given** the viewed Week is 2–8 Nov 2026 with Wednesday 4 selected, **When** the user drags the Week card 60 px to the left and holds, **Then** the Week face has moved 60 px left with the finger, and the left edge of the Week of 9–15 Nov (its month label and day strip, with each day's Planned kcal) is visible on the right.
2. **Given** the same Week, **When** the user drags right and holds, **Then** the Week of 26 Oct – 1 Nov is visible on the left with its own month label ("Październik – listopad 2026").
3. **Given** the user is dragging left past about a third of the card width, **When** they release, **Then** the next Week settles into the centre in about 150–250 ms, continuing the motion. After that, Wednesday 11 is selected, and the heading below reads "Środa, 11 lis" and shows that day's totals and Slots.
4. **Given** the user drags left only a short distance, slowly, **When** they release, **Then** the Week face springs back to the centre in about 150–250 ms, and the viewed Week and selected day don't change.
5. **Given** the user flicks left quickly, a short distance, **When** they release, **Then** the next Week settles in, exactly as in scenario 3.
6. **Given** a drag is in progress, **When** the user changes direction before releasing, **Then** the Week face follows the finger the other way, and the release decision uses the final position and motion.

---

### User Story 2 - The gesture doesn't fight scrolling, taps or the system (Priority: P1)

The user scrolls the Week page up and down with a finger that starts on the Week card, taps days in the strip, and swipes back from the screen edge in the installed app. None of these accidentally move the Week face or change the Week.

**Why this priority**: The Week card is at the top of the most-used screen, so a gesture that steals scrolls or taps would make the whole app worse. It ships together with US1.

**Independent Test**: On an iPhone, with the installed app and with a Safari tab, start 20 vertical and diagonal scrolls on the Week card, tap each day in the strip, and swipe from the left screen edge. Confirm the Week never changes and taps always select the day.

**Acceptance Scenarios**:

1. **Given** the Week page, **When** the user starts a mostly vertical movement on the Week card, **Then** the page scrolls and the Week face doesn't move.
2. **Given** a horizontal drag has started, **When** the finger drifts up or down, **Then** the page doesn't scroll until the finger is lifted.
3. **Given** the Week page, **When** the user taps Thursday in the strip, **Then** Thursday becomes the selected day, as before.
4. **Given** the user starts a drag on a day in the strip, **When** they drag and release, **Then** that day isn't selected by the drag. The Week settles or springs back as in US1.
5. **Given** the installed app on iPhone, **When** the user swipes in from the left screen edge, **Then** the Week face doesn't move along with the system gesture.

---

### User Story 3 - Buttons, reduced motion and screen readers (Priority: P2)

On a desktop, the user clicks ← or → and the Week face slides to the neighbour Week with the same short animation as a swipe. A user with Reduce Motion turned on still sees the Week face follow the finger, but the Week changes instantly on release. A VoiceOver user hears only the viewed Week, not the neighbour Weeks, and can change the Week with the ← / → buttons.

**Why this priority**: These keep the existing desktop and accessibility behaviour intact under the new design. They matter, but the feature delivers its main value without them.

**Independent Test**: At ≥ 1024 px, click → and ←. With Reduce Motion on, swipe on a phone. With VoiceOver on, move through the Week card and use the buttons.

**Acceptance Scenarios**:

1. **Given** a screen ≥ 1024 px wide, **When** the user clicks →, **Then** the next Week slides in with the same animation as a swipe, and the same weekday stays selected.
2. **Given** Reduce Motion is on, **When** the user drags and releases past the commit point, **Then** the drag followed the finger, and the new Week appears without a settle animation. A spring-back is also instant.
3. **Given** VoiceOver is on, **When** the user moves through the Week card, **Then** only the viewed Week's month label and days are read, and none of the neighbour Weeks' content is reachable by screen reader or keyboard.
4. **Given** a phone with VoiceOver, **When** the user activates the screen-reader-only ← / → buttons, **Then** the Week changes, as in feature 002.

### Edge Cases

- **Quick repeated swipes**: two or more flicks within a fraction of a second. Each finished swipe moves by exactly one Week, the face always ends centred on one Week, and there's no visible jump or flash of the wrong Week when the next swipe starts.
- **Grabbing during a settle**: the user touches the card while it's still settling. The card stops where it is and follows the finger from there (FR-017). It must not freeze between two Weeks or skip a Week.
- **Multi-touch**: a second finger lands during a drag. The gesture keeps following one finger, or springs back. It never jumps.
- **Interrupted drag**: an incoming call, the app being backgrounded, or the system taking over the touch mid-drag. The face springs back to the viewed Week.
- **Week spanning two months or years**: neighbour Weeks show their own label ("Grudzień 2026 – styczeń 2027"), exactly as they will once viewed.
- **Today in a neighbour Week**: today's mark shows in the neighbour's strip, so nothing changes visually when that Week settles in.
- **Selected weekday in a neighbour Week**: a neighbour shows no selected day while it peeks in. The selection (the same weekday) appears only once the Week has changed, so holding a drag never looks like a choice already made. *Changed after the first device run (2026-11-15): the earlier rule showed the selection in the neighbour, and it read as selected too early.*
- **Neighbour Week with no Meals**: its days show no kcal, as in a viewed empty Week.
- **Neighbour Meals still loading**: right after a settle, the new neighbour Week (off-screen) may briefly show no kcal. The Weeks on screen must not flash blank.
- **Resize or rotation**, and switching tabs and coming back: the face is centred on the viewed Week, and the neighbours are sized correctly.
- **Far past or far future**: there's no first or last Week. The gesture works the same everywhere.
- **"Skopiuj do następnego tygodnia" during a drag**: the action stays fixed and applies to the viewed Week. A drag that is still in progress doesn't change which Week that is.

## Requirements *(mandatory)*

### Functional Requirements

**Follow and peek**

- **FR-001**: On phones, a horizontal drag on the Week card MUST move the Week face with the finger, one-to-one, from the moment the gesture is recognised as horizontal, with no visible lag. This holds for up to one Week of travel. Beyond that, the face resists and moves less than the finger (FR-009).
- **FR-002**: While dragging, the neighbour Weeks MUST sit beside the viewed Week, with a small gap between them: the next Week on the right, the previous one on the left. Each MUST show its own month label and day strip, with every day's Planned kcal, today's mark and the selected-weekday highlight.
- **FR-003**: Only the Week face MUST move. The selected day's totals, "Skopiuj do następnego tygodnia", and the heading and Slots below the card MUST stay in place during the drag and while settling. They change to the new Week once it has settled.
- **FR-004**: Neighbour Weeks MUST look slightly dimmed compared with the viewed Week, so it's clear which Week is current. A neighbour reaches full strength when it settles in the centre.

**Release**

- **FR-005**: On release, the Week MUST change to the neighbour in the drag direction when the drag passed about one third of the card width, or when the release was a quick flick in that direction. Otherwise the face MUST spring back. A tiny accidental movement on a tap MUST NOT change the Week.
- **FR-006**: The settle MUST continue the finger's motion into place as a slide, without fading the Week out and in. Settle and spring-back MUST each take about 150–250 ms.
- **FR-007**: After a settle, the viewed Week MUST be 7 days later (dragged left) or 7 days earlier (dragged right), and the selected day MUST be the same weekday in the new Week. These are the same results as the ← / → buttons.
- **FR-008**: After a settle, the face MUST be ready for the next swipe straight away, with new neighbours on both sides and no visible jump or flash. Weeks are unbounded in both directions.
- **FR-009**: Every finished swipe MUST move by at most one Week, counted from the Week that was settling or centred when the finger touched down. When the gesture ends for any reason other than a release (interrupted by the system, app backgrounded, a second finger), the face MUST end centred on exactly one Week.
- **FR-017**: A touch on the Week card while it is still settling or springing back MUST stop the animation where the face is, and the face MUST follow the finger from that position. Two quick flicks in the same direction MUST therefore move two Weeks. A settle interrupted this way counts as finished at that moment: the Week it was heading to becomes the viewed Week (FR-003, FR-007), and the new drag is measured from it (FR-009).

**Coexistence**

- **FR-010**: A movement that starts mostly vertically MUST scroll the page and MUST NOT move the Week face. Once a horizontal drag is recognised, the page MUST NOT scroll until the finger is lifted.
- **FR-011**: A drag that starts in the system's edge-swipe area at either screen edge MUST NOT move the Week face, so the system back gesture of the installed app works without the Week card moving with it.
- **FR-012**: Tapping a day in the strip MUST keep selecting it. A drag that starts on a day MUST NOT select that day.

**Desktop, motion and accessibility**

- **FR-013**: On screens about 1024 px wide or wider, the ← / → buttons MUST change the Week with the same slide animation and the same result as a swipe. Dragging with a mouse isn't required.
- **FR-014**: When the user's system asks for reduced motion, settle and spring-back MUST be instant. During a drag, the face still follows the finger.
- **FR-015**: Neighbour Weeks MUST NOT be reachable by keyboard or exposed to screen readers. Only the viewed Week's Week face is. The ← / → buttons MUST stay operable by keyboard and screen readers on every screen size (on phones, for screen readers only, as in feature 002).
- **FR-016**: The gesture MUST work offline, like the rest of the app, and MUST NOT need anything downloaded at run time.

### Key Entities *(include if feature involves data)*

No stored data changes. The feature reads what already exists:

- **Week**: the viewed Week and its two neighbours, each Monday to Sunday. The neighbours' Planned kcal per day comes from their **Meals**, exactly as the viewed Week's does.
- **Selected day**: page state, as in feature 002. A Week change moves it by 7 days, so it keeps its weekday.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On an iPhone, 10 quick swipes in a row, alternating and in one direction (including swipes started while the previous one is still settling), each end on the correct Week, with no visible jump, flash or blank strip on screen.
- **SC-002**: Settle and spring-back each feel like about 200 ms and never take longer than 250 ms, including on 120 Hz displays.
- **SC-003**: Of 20 vertical and diagonal scrolls started on the Week card, none moves the Week face or changes the Week.
- **SC-004**: Of 10 system back swipes from the left screen edge in the installed app, none also drags the Week face.
- **SC-005**: Of 20 taps on days in the strip, all select the tapped day, and none changes the Week.
- **SC-006**: During a slow drag, the neighbour Week's month label and each day's kcal can be read before release.
- **SC-007**: With VoiceOver on, nothing from a neighbour Week is read or focusable, and the ← / → buttons change the Week.
- **SC-008**: With Reduce Motion on, the Week changes the moment the finger is lifted, with no animation.

## Assumptions

- **Phones and iPhone first.** The gesture is checked on a real iPhone, both as the installed app and in a Safari tab. The Android check stays deferred, as in feature 001.
- **Slide, not fade.** docs/SPEC.md says the content should "fade or slide away and the new Week fade gently in". With neighbours already visible beside the viewed Week, a fade would make the Week being pulled in disappear and reappear. So the settle is a slide that continues the finger's motion, and the fade survives only as the neighbours' dimming (FR-004). This follows the research (§2, "What changed with the peek requirement"), and the user confirmed it on 2026-11-05 (see Clarifications). docs/SPEC.md's wording should be updated to match when the feature is built.
- **What moves.** Only the month label and the day strip swipe. The totals row and "Skopiuj do następnego tygodnia" stay fixed under them (decided by the user on 2026-11-05, recorded in the research §6).
- **Neighbours show no totals.** Neighbour Weeks show only their Week face: month label, and day strip with kcal. The fixed totals row always belongs to the viewed Week's selected day.
- **Commit rule numbers are starting points.** "About one third of the width" and "a quick flick" are defaults. The plan sets the values, and they're tuned on a device against SC-001 to SC-005.
- **Gap and dimming** are small and subtle: about a 12 px gap and noticeably lighter neighbours. The exact values are a visual detail for the plan.
- **No mouse drag on desktop.** The ← / → buttons are the desktop way to change the Week (R6 in the research).
- **No new stack element.** The research recommends a component the app already ships with, so no ADR is expected. If the plan picks something else, the constitution's ADR rule applies.
- **Everything else on the Week page is unchanged**: day selection, Slots, the Dish picker, the Meal sheet, copying to the next Week and the desktop layout all behave as in feature 002.
