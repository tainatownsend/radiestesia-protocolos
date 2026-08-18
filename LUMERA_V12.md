# Lumera — V1.2

Lumera is the product identity for the radiesthesia session workspace previously presented as “Protocolos”.

## Session workspace

The home experience now includes a therapist-oriented workspace with:

1. Preparation
2. Initial Assessment
3. Investigation
4. Treatment
5. Reassessment
6. Report
7. Closing

The dashboard reads the existing local session stores and summarizes the current session without replacing the existing controller.

## Therapist preparation

The preparation flow is intentionally optional and mobile/iPad-first. It covers presence, personal preparation, boundaries/protection within the practitioner’s own practice, pendulum readiness, environment, session intention, emotional/ethical readiness and final readiness.

## Therapist closing

The closing flow is available from the workspace and after reports. It covers treatment validation, formal closing, practitioner/space reset, record completion and post-session pause.

Preparation and closing records are stored locally under `lumera_practitioner_flows_v1`.

## Visual identity

The Lumera identity uses a warm ivory base, graphite-plum typography, muted champagne/gold details and a deep plum primary action color. Chakra-specific colors remain contextual rather than defining the entire interface.

`lumera-workspace.css` is an override layer so the consolidated V1.1/V1.2 functionality can keep using the existing controller and component styles.

## Architecture

`lumera-workspace.js` does not introduce a second protocol controller. It adds workspace, preparation/closing and reporting affordances around the existing application. It reads:

- `rt_assessments_v1`
- `rt_active_assessment_v1`
- `rt_sessions_v4`
- `rt_divorce_sessions_v1`

The workspace module is loaded dynamically by `initial-assessment-details.js`, after the existing application layers.

## Framing

Lumera is a workflow/documentation tool for a radiesthetic/spiritual practice. Energetic or spiritual constructs are presented within the user’s practice or belief system, not as objectively verified facts. Health-related records remain non-diagnostic and do not replace appropriate healthcare.
