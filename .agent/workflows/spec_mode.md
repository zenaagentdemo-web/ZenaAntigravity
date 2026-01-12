---
description: Strict Spec-Driven Development Workflow (Required for all tasks)
---

# Spec Mode Workflow

**CRITICAL RULE**: You must follow this process for EVERY feature request or complex task. Do not skip steps. Do not start coding until Phase 3.

## Phase 1: Requirements & Spec
1.  Analyze the user request.
2.  Create/Update `implementation_plan.md` with:
    *   **Goal Description**
    *   **Feature Wiring & Logic Mapping**:
        *   **UI > Backend Mapping**: For every button/input, explicitly state which backend service/endpoint it triggers.
        *   **2nd/3rd Order Effects**: List side effects (e.g., Notifications, Calendar sync, database updates).
        *   **Connectivity Check**: Ask "What happens when I click this? Is it fully wired?".
    *   **Requirements Specification**: Detailed breakdown of what is needed.
    *   **Invariants/Properties**: Logic rules that must hold true (for `fast-check` testing).
    *   **Proposed Changes**: High-level architectural changes.
3.  **STOP**. Call `notify_user` to request approval for the Requirements/Spec.
4.  *Do not proceed until the user says "Approve".*

## Phase 2: Task Planning
1.  Once requirements are approved, create/update `task.md` with a granular checklist (15-20 items if needed).
    *   Include **Property-Based Tests** steps (Required).
    *   Include **Wiring Tasks**: Explicit steps to connect UI components to Backend logic.
    *   Include **Regression Tests**: Verify the *connection* works.
    *   Include **Implementation** steps.
2.  **STOP**. Call `notify_user` to request approval for the Task Plan.
3.  *Do not proceed until the user says "Approve".*

## Phase 3: Turbo Execution
1.  Only AFTER Plan Approval, switch to `// turbo-all` mode (mentally).
2.  Execute the tasks:
    *   Implement tests first (TDD).
    *   Implement code.
    *   Verify locally.
3.  **Mandatory Property Testing**:
    *   **Strict Enforcement**: You MUST build and run Property Tests (`fast-check`) to verify invariants.
    *   **Show Proof**: You must show the output of the passing property tests.
    *   **Change Rule**: Any feature update REQUIRES new or updated property tests.
4.  **Final Connectivity Verification**:
    *   Verify that buttons actually trigger the intended backend logic (Integration/E2E check).
5.  Final Verification & Notification.
