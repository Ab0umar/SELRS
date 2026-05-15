# Shape: QuickPatientEntryForm

This document outlines the design and UX for the `QuickPatientEntryForm` component, focusing on improving its usability for quickly adding an examination to an existing patient.

## 1. Purpose & Core Job

- **Job**: To allow a user (likely a nurse or technician) to rapidly enter the results of a standard eye examination for a patient who is already in the system.
- **Context**: This form is intended for speed and efficiency, likely used in a clinical setting during or immediately after a patient exam.

**Clarification**: This form is for creating a new **examination record** for an **existing patient**. It is not for registering a new patient in the system.

## 2. Existing UI Analysis

The form is currently composed of several `Card` components:
1.  **Patient & Date Selection**: The user selects a patient and a visit date.
2.  **Right Eye (OD)**: A card with fields for UCVA, BCVA, S, C, Axis, IOP, and Air Puff.
3.  **Left Eye (OS)**: A card with the same fields as the right eye.
4.  **Prescription & Diagnosis**: Two input fields for prescription and diagnosis notes.
5.  **Save Button**: A single, full-width save button at the bottom.

## 3. Identified UX Issues

- **Form Length**: The form is very long, requiring a lot of scrolling. This can be overwhelming and inefficient.
- **Layout Density**: The fields within the OD/OS cards are close together, which can make them hard to read and fill out quickly.
- **Save Button Placement**: The save button is at the very bottom of a long form, which is not ideal for usability. The user has to scroll all the way down to save.

## 4. Proposed UX Improvements

To address these issues, the following improvements are proposed.

### Improvement 1: Collapsible Sections

-   The "Right Eye (OD)", "Left Eye (OS)", and "Prescription & Diagnosis" sections should be made collapsible.
-   They can be implemented using an `Accordion` component, with all sections open by default.
-   This will allow users to collapse sections they have already filled out, making the form feel shorter and more manageable.

### Improvement 2: Sticky Footer for Actions

-   Instead of a full-width button at the bottom, a sticky footer should be added to the page.
-   This footer will contain the "Save" and "Cancel" buttons.
-   This ensures that the primary actions are always visible and accessible, regardless of how far the user has scrolled.

### Improvement 3: Enhanced Layout & Spacing

-   **Visual Distinction**: The OD and OS cards are already color-coded, which is good. This should be maintained.
-   **Spacing**: Increase the vertical spacing between the form fields within the OD/OS cards to improve readability. Use the spacing tokens from `DESIGN.md` (e.g., `space-y-4` instead of `space-y-3`).
-   **Input Sizing**: Standardize the input field sizes for a more consistent look.

## 5. Revised Component Architecture

-   **`QuickPatientEntryForm.tsx`**: This component will be updated to include the `Accordion` for collapsible sections and the new sticky footer.
-   **No Logic Changes**: The underlying form state management and `trpc` mutations will remain the same. This is a UI/UX-focused refactoring.

This shape provides a clear path to improving the usability of the `QuickPatientEntryForm` without altering its core functionality.
