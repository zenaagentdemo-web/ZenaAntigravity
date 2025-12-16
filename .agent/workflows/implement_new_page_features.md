---
description: Implement Batch Mode and Compose Button features
---

# Implement New Page Features

// turbo-all

1.  **Add Select Button to Header**
    -   Edit `packages/frontend/src/components/NewPageHeader/NewPageHeader.tsx` to add "Select" button and prop.
    -   Edit `packages/frontend/src/components/NewPageHeader/NewPageHeader.css` to style it.

2.  **Wire up Batch Action Bar**
    -   Edit `packages/frontend/src/pages/NewPage/NewPage.tsx` to:
        -   Pass toggle handler to Header.
        -   Render `BatchActionBar` conditional on selection logic.

3.  **Create Floating Compose Button**
    -   Create `packages/frontend/src/components/FloatingComposeButton/FloatingComposeButton.tsx`.
    -   Create `packages/frontend/src/components/FloatingComposeButton/FloatingComposeButton.css`.

4.  **Create Compose Modal**
    -   Create `packages/frontend/src/components/ComposeModal/ComposeModal.tsx` (adapted from ReplyComposer).
    -   Create `packages/frontend/src/components/ComposeModal/ComposeModal.css`.

5.  **Integrate Compose into New Page**
    -   Edit `packages/frontend/src/pages/NewPage/NewPage.tsx` to add the FAB and Modal logic.

6.  **Verify**
    -   Run `npm run lint`.
    -   Take screenshots of the new UI.
