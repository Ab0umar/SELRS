# Shape: Admin Hub & Modules

This document outlines the design and UX strategy for the Admin Hub and its associated management modules.

## 1. Purpose & Core Job

- **Job**: To provide a centralized, professional control center for system administrators to manage users, clinical data, system settings, and technical maintenance.
- **Users**: High-privilege Administrators and technical staff.
- **Context**: Used on high-resolution desktop monitors in bright office environments. Requires high information density and clear action paths.

## 2. Information Architecture

### The Hub (Landing)
A jumping-off point with three tiers of priority:
1. **Critical Actions**: One-click access to Diagnostic tools (High visibility).
2. **Core Modules**: Grid of the 6 most used modules (Users, Doctors, Permissions, Services, Status, Migrations).
3. **Secondary Tools**: Categorized lists or tags for infrequent tasks (Settings, API tools, Sheet designer, etc.).

### Module Structure
Every admin module should follow a predictable layout:
- **Level 1 (View)**: A search/filter bar followed by a dense data table.
- **Level 2 (Inspect/Edit)**: Inline editing or a side-panel for details (avoiding modals where possible).
- **Level 3 (Action)**: Clear primary buttons for "Add New" or "Save Changes".

## 3. Visual Strategy

- **Register**: Product (Design serves utility and accuracy).
- **Color Strategy**: *Restrained*. 
    - **Neutral Base**: Tinted off-whites (`#F9FAFB`) for backgrounds.
    - **Brand Accent**: Orange (`#FF6B35`) for global "Save" or "Primary" actions.
    - **Functional Colors**: 
        - Blue (`#2563EB`) for system status and configuration.
        - Emerald (`#10B981`) for health checks and data integrity.
        - Red (`#EF4444`) for critical deletions and migration warnings.
- **Typography**: Heavy weight contrast between headers (H1/H2) and tabular data. Use Mono (`13px`) for system IDs and codes.

## 4. Key Components & Layouts

### Hub Cards
- **Current**: Large cards with "Open Module" buttons.
- **Proposed**: Compact cards where the entire surface is clickable. Hover states should use a subtle elevation and brand-tinted border (`border-primary/30`).
- **Icons**: Standardize on Lucide icons with a specific container style (soft background tint).

### Data Tables (The "Admin Standard")
- **Header**: Sticky, light blue tint (`#DBEAFE`), 600 weight.
- **Rows**: Alternating white/gray. 
- **Actions**: Icon-only buttons for Edit/Delete to save horizontal space.
- **Empty States**: Clear illustrations or messages when no data matches filters.

### Navigation (The "Breadcrumb Bar")
- Replace the simple "Back" button with a persistent, slim breadcrumb bar when deep in a module.
- `Admin Hub > Users > Edit User`

## 5. Refinement Goals for Sub-pages

1. **AdminUsers**: Consolidate the massive table. Ensure role badges are distinct.
2. **AdminServices**: Improve the grouping of services by category.
3. **AdminSettings**: Move from a vertical stack of inputs to a tabbed interface for "Clinical", "Financial", and "System" settings.
4. **AdminStatus**: Enhance the visualization of server health (use green/yellow/red pulses).

## 6. Anti-Patterns to Remove
- ❌ Giant "Open" buttons inside cards (redundant).
- ❌ Inconsistent spacing between modules.
- ❌ Multiple conflicting primary colors on the same screen.

---

This shape provides a unified design language that turns the fragmented Admin tools into a cohesive "Command Center".
