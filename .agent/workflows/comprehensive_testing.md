---
description: Standard Operating Procedure for Property, Unit, and API Testing
---

# Comprehensive Testing Workflow

This workflow mandates the creation of robust verification layers for all new features. Follow this guide to ensure rock-solid stability.

> [!IMPORTANT]
> **Zero Regression Policy**: Every bug fix MUST have a reproduction test case. Every new feature MUST have property tests.

## Phase 1: Property Testing (The Invariants)
**Goal**: Verify logic holds true for *any* valid input, not just the happy path.

1.  **Identify Invariants**:
    *   Ask: "What should *always* be true regardless of input?"
    *   *Example*: "Sorting a list never changes the number of items."
    *   *Example*: "A task created via API must be retrievable via `getTasks`."

2.  **Scaffold the Test File**:
    *   Location: Next to the file being tested (e.g., `TaskService.ts` -> `TaskService.property.test.ts`).
    *   Imports:
        ```typescript
        import { describe, it, expect } from 'vitest';
        import * as fc from 'fast-check';
        ```

3.  **Define Arbitraries (Generators)**:
    *   Model your data shape using `fc.record`, `fc.string`, `fc.uuid`, etc.
    *   *Tip*: Use `fc.option()` for optional fields to test `undefined` handling.

4.  **Write the assertion**:
    ```typescript
    it('should maintain invariant X', async () => {
        await fc.assert(
            fc.asyncProperty(fc.record({ ... }), async (input) => {
                // Act
                const result = await fn(input);
                // Assert Invariant
                expect(result).isValid();
            })
        );
    });
    ```
5.  **Run Locally**: `npx vitest <filename>`

## Phase 2: Unit Testing (The Logic)
**Goal**: Verify specific business logic in isolation.

1.  **Isolate**:
    *   Mock ALL external dependencies (Database, APIs, other services).
    *   Use `vi.mock()` for module mocks.

2.  **Scaffold**:
    *   **Frontend Logic**: `src/pages/[Page]/[Page].logic.test.ts`. Isolate purely logical helpers (dates, calculations, formatters) from React components.
    *   **Backend Logic**: `[filename].test.ts` alongside source files.

3.  **Cover Branches**:
    *   Ensure `if/else` paths are covered.
    *   Test edge cases: empty arrays, 0, negative numbers, nulls.
    *   **Frontend Property Tests**: Apply `fast-check` to frontend helpers (e.g., ensure date formatters never crash on valid dates).

## Phase 3: Integration Testing (The Interactions)
**Goal**: Verify components work together and user flows complete successfully.

1.  **Frontend Integration**:
    *   Location: `src/pages/[Page]/[Page].comprehensive.test.tsx`
    *   Use `@testing-library/react`.
    *   **Mock Network, Not Logic**: Mock the API client (`src/utils/apiClient`) but allow component logic to run.
    *   **Test Critical User Flows**:
        *   Opening/Closing Modals.
        *   Form submissions (verify mock API calls).
        *   Filtering/Sorting interactions.

2.  **Backend Integration**:
    *   Often covered by API Tests (Phase 4).

## Phase 4: API Endpoint Testing (The Wiring)
**Goal**: Verify the HTTP contract and database integration.

1.  **Setup**:
    *   Use a fresh test database context (handled by existing `setup-test-db.sh` or `beforeAll` hooks).

2.  **Test**:
    *   Use `supertest` (or `vitest` fetch) to hit the local API.
    *   Verify:
        *   **200 OK**: Happy path returns correct JSON structure.
        *   **400 Bad Request**: Invalid inputs return helpful errors.
        *   **401 Unauthorized**: Protected routes block access.

3.  **Verify Side Effects**:
    *   Check the database to ensure records were actually created/modified.

## Checklist for Review
Before submitting your PR or marking the task done:
- [ ] **Property Tests**: Do they run at least 100 iterations? (Default `numRuns` is usually sufficient).
- [ ] **Unit Tests**: Are mocks clean and necessary?
- [ ] **API Tests**: Do they clean up their data?
- [ ] **No Flakiness**: Run the suite 3 times. It must pass 3 times.
