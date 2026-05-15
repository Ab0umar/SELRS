# Shape: Admin Hub Phase 2 Refinements

This document outlines the final push to standardize all remaining pages within the Admin Hub, ensuring a unified "Command Center" aesthetic using high-density cards and professional tables.

## 1. Goal

To eliminate all remaining visual debt in the Admin Hub by applying the established design patterns (Compact Cards for configuration and "Admin Standard" Tables for data) to the secondary modules.

## 2. Standardized Patterns

### Pattern A: Configuration & Tool Cards
For pages like **API Tools**, **Card Visibility**, and **Notification Settings**.
- **Layout**: Grid-based or vertical stack of `Card` components.
- **Header**: Compact `CardHeader` with a tinted background (`bg-muted/10`) and a professional icon.
- **Content**: Grouped controls with consistent vertical spacing (`space-y-4`).
- **Interactive**: Hover states for fully clickable cards; subtle switches and buttons.

### Pattern B: The "Admin Standard" Table
For pages like **Pentacam Failed Log**, **Data Audit**, and **Sheet Lists**.
- **Header**: Sticky, sky-blue tinted (`bg-sky-50/90`) with backdrop-blur.
- **Rows**: Alternating background colors (`bg-white` / `bg-muted/10`).
- **Typography**: Mono font for technical identifiers; bold headers.
- **Density**: Small paddings (`py-3`) and condensed font sizes (`text-xs` / `text-[11px]`).

## 3. Page-Specific Refinement Goals

### API & Connectivity Tools (`AdminApiTools.tsx`)
- **Current**: A fragmented list of technical triggers.
- **Proposed**: Categorized cards for "MSSQL Sync", "Database Maintenance", and "Cache Management". Use Emerald for "Success" tools and Amber for "Maintenance".

### Visibility & Notifications (`AdminCardVisibility.tsx`, `AdminNotificationSettings.tsx`)
- **Current**: Plain lists of switches.
- **Proposed**: Polished "Setting Cards". Each toggle should have a bold label, a clear description, and be contained within a card that matches the `AdminSettings` look.

### Technical Logs (`AdminPentacamFailed.tsx`, `AdminDataSourceAudit.tsx`)
- **Current**: Large, unformatted tables.
- **Proposed**: High-density tables with sticky headers. Add "Quick Action" buttons for re-syncing or resolving log entries directly from the row.

### Clinical Configuration (`AdminSheets.tsx`, `AdminFormsHub.tsx`)
- **Current**: Simple navigation links.
- **Proposed**: Visual "Module Hub". Transform `AdminFormsHub` into a grid of interactive cards with icons representing each medical sheet (Consultant, Lasik, etc.).

## 4. Visual Continuity

- **Breadcrumbs**: All pages must integrate with the new breadcrumb system in `AdminHubShell`.
- **Spacing**: Rigid adherence to `DESIGN.md` spacing tokens (`xl` between sections, `md` inside components).
- **Icons**: Standardize on Lucide icons with consistent sizes (`h-4` or `h-5`).

---

This shape completes the transformation of the Admin Hub into a cohesive, high-utility technical command center.
