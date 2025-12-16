---
description: Strict Spec-Driven Development Workflow (Required for all tasks)
---

# Spec Mode Workflow

**CRITICAL RULE**: You must follow this process for EVERY feature request or complex task. Do not skip steps. Do not start coding until Phase 3.

## Phase 1: Requirements & Spec
1.  Analyze the user request.
2.  Create/Update `implementation_plan.md` with:
    *   **Goal Description**
    *   **Requirements Specification**: Detailed breakdown of what is needed.
    *   **Invariants/Properties**: Logic rules that must hold true (for `fast-check` testing).
    *   **Proposed Changes**: High-level architectural changes.
3.  **STOP**. Call `notify_user` to request approval for the Requirements/Spec.
4.  *Do not proceed until the user says "Approve".*

## Phase 2: Task Planning
1.  Once requirements are approved, create/update `task.md` with a granular checklist (15-20 items if needed).
    *   Include **Property-Based Tests** steps.
    *   Include **Regression Tests** steps.
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
    *   Once implementation is complete, you MUST build/run Property Tests (`fast-check`) to verify invariants if not already done.
    *   **Change Rule**: Any subsequent changes to the feature REQUIRE a new set of property tests or updates to existing ones to verify the new behavior.
4.  Final Verification & Notification.
