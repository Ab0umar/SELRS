# Shape: Doctors Management (إدارة الأطباء)

This document outlines the design and UX strategy for the Doctors Management module within the Admin Hub.

## 1. Purpose & Core Job

- **Job**: To maintain an accurate registry of surgeons and consultants, linking them to clinical services and appointment scheduling.
- **Context**: Administered by medical directors or operations managers to ensure the center's staff roster is up-to-date and correctly categorized.

## 2. Existing UI Analysis

The current page (`AdminDoctors.tsx`) uses a **Grid of Cards** layout.
- **Pros**: Good visual recognition through avatars.
- **Cons**: High vertical waste, poor scannability for long lists, inconsistent editing experience (expanding cards shift layout).

## 3. Proposed UX Improvements

### Improvement 1: Shift to "Admin Standard" Table
Align with the rest of the Admin Hub by replacing the grid with a dense data table.
- **Columns**:
    - **Doctor (Avatar + Name)**: Primary identifier.
    - **Code**: System identifier (Mono font).
    - **Type**: Badge-based (Consultant, Specialist, External).
    - **Location**: Status indicator (Center vs. External).
    - **Status**: Toggle for Active/Inactive.
    - **Actions**: Edit (Inline/Panel), Delete.

### Improvement 2: Refined Header & Sync Flow
- Consolidate the "Sync", "Add Doctor", and "Import CSV" actions into a cleaner primary action group.
- Use a "Last Synced" timestamp near the Refresh button to give users confidence in the data state.

### Improvement 3: Inline Table Editing
- instead of expanding cards, use an **Inline Row Edit** or a **Side Panel** for updating doctor details. This maintains the user's scroll position and context.

### Improvement 4: Visual Polish
- Standardize the "Initials Avatar" style to match the `AdminUsers` module for a unified center-wide identity.
- Use the established Blue (`#2563EB`) for Center doctors and a neutral/muted style for External doctors.

## 4. Rationale

- **Consistency**: Moving from a grid to a table ensures that all admin modules (Users, Services, Doctors) behave predictably.
- **Efficiency**: Tables allow for faster scanning and multi-select operations (e.g., bulk deactivation).
- **Professionalism**: A data-dense table feels more like a "Command Center" tool compared to a card grid.

---

This shape refines the Doctors module into a high-utility management tool that fits seamlessly into the new Admin Hub design language.
