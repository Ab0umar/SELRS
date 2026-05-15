# Shape: Quick Patient Entry

This document outlines a revised UX for the "Quick Patient Entry" feature to create a more streamlined and coherent user experience.

## 1. Problem

The current implementation is fragmented:
- `QuickPatientEntryDialog.tsx` is intended to be the entry point for this feature.
- However, it incorrectly uses a component for editing patient information (`ExaminationPatientQuickDialogContent.tsx`) instead of the actual form for creating a quick examination.
- `QuickPatientEntryForm.tsx`, the correct form, is not used within the dialog.

This `shape` proposes to unify these components into a single, logical workflow.

## 2. Proposed User Experience

The user should be able to quickly create a new patient examination from a single dialog.

### User Flow
1.  **Trigger**: The user clicks a "Quick Exam" button, likely on the main dashboard.
2.  **Dialog**: The `QuickPatientEntryDialog` opens.
3.  **Form**: The dialog's content will be the `QuickPatientEntryForm`.
4.  **Fill & Save**: The user fills out the examination details in the form. The "Save" button is inside the form, and upon clicking, the data is saved.
5.  **Close**: Upon successful save, the dialog automatically closes, and a success toast/notification appears.

## 3. Component Architecture

### `QuickPatientEntryDialog.tsx`
-   This component will be responsible for rendering the `Dialog` container.
-   It will directly render the `QuickPatientEntryForm` component in its content area.
-   It will pass a `onSave` callback to the form, which will close the dialog.

### `QuickPatientEntryForm.tsx`
-   The form will be modified to be more self-contained.
-   It will accept an `onSave` and `onCancel` callback from the parent dialog.
-   The "Save" and "Cancel" buttons will be part of the form's footer.

### `ExaminationPatientQuickDialogContent.tsx`
-   This component will no longer be used by `QuickPatientEntryDialog.tsx`. It appears to be for a different purpose (editing patient master data) and should be used in a different context.

## 4. Rationale

-   **Coherent UX**: This design creates a single, focused workflow for the user.
-   **Code Simplification**: It simplifies the component architecture by removing the unnecessary intermediate component.
-   **Follows Intent**: It aligns the implementation with the clear intent of the feature's name: a "Quick Patient Entry" for examinations.

This `shape` provides a clear path forward to refactor the feature into a more usable and maintainable state.
