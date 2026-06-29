---
name: Visionary Precision
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#526069'
  on-secondary: '#ffffff'
  secondary-container: '#d3e2ed'
  on-secondary-container: '#56656e'
  tertiary: '#004b58'
  on-tertiary: '#ffffff'
  tertiary-container: '#006476'
  on-tertiary-container: '#70e2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d6e5ef'
  secondary-fixed-dim: '#bac9d3'
  on-secondary-fixed: '#0f1d25'
  on-secondary-fixed-variant: '#3b4951'
  tertiary-fixed: '#adecff'
  tertiary-fixed-dim: '#5dd6f3'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5d'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  element-gap: 12px
  section-margin: 32px
---

## Brand & Style

The design system is engineered for the high-precision environment of ophthalmology. It prioritizes clarity, trust, and clinical efficiency. The visual language is **Corporate / Modern** with a focus on a "Clinical Dashboard" aesthetic—minimizing visual noise to ensure that critical medical data remains the focal point.

The system targets medical professionals, optometrists, and surgeons. It evokes an emotional response of reliability and surgical precision through a structured layout, generous white space, and a refined professional color palette. The aesthetic utilizes subtle depth to separate analytical tools from patient records, ensuring a seamless cognitive flow during high-pressure clinical consultations.

## Colors

The palette is anchored by **Medical Blue (#0052CC)**, representing authority and trust. This primary color is used for key actions, navigational anchors, and primary branding. 

- **Background Strategy:** A multi-layered approach using "Soft Light Blue" (#E3F2FD) for subtle content grouping and "Neutral White" (#FFFFFF) for the primary workspace to ensure maximum contrast for medical text.
- **Functional Colors:** Critical medical readings (e.g., high Intraocular Pressure or abnormal Visual Acuity) utilize a high-visibility "Error Red" (#DE350B). Warnings and borderline scans use "Warning Amber" (#FFAB00).
- **Secondary Accents:** A soft teal tertiary color is used for auxiliary data points like secondary eye measurements or historical trend lines.

## Typography

This design system utilizes **Inter** for its exceptional legibility at small sizes and its neutral character which supports both English and Arabic medical scripts effectively. 

- **Data Legibility:** For numerical eye measurements (IOP, Sphere, Cylinder), the `data-mono` style uses tabular numbers to ensure columns of figures align perfectly for quick scanning.
- **Hierarchy:** High-level diagnosis and patient names use Bold weights, while clinical notes and descriptions use Medium to Regular weights to maintain a clean page texture.
- **Bilingual Support:** Ensure line-height is sufficient (1.5x minimum) to accommodate Arabic diacritics without clipping, especially in multi-line diagnosis fields.

## Layout & Spacing

The system follows a **Fluid Grid** model with a 12-column structure for desktop and a single-column flow for mobile. 

- **Clinical Rhythm:** A base 8px spacing unit ensures mathematical consistency. Content is grouped into logical "Clinical Modules" (e.g., Patient History, Refraction, Treatment Plan) using 24px margins between modules.
- **Data Density:** In diagnostic tables, vertical padding is reduced to 12px to allow more data to be visible "above the fold" without sacrificing legibility. 
- **Responsive Behavior:** On tablets, the side-by-side view for Left Eye (OS) and Right Eye (OD) data remains horizontal to allow direct comparison, while peripheral charts reflow beneath the primary data.

## Elevation & Depth

To maintain a "modern dashboard" feel without overwhelming the user, the design system employs **Tonal Layers** combined with **Ambient Shadows**.

- **Surface 0 (Background):** Neutral Light Blue (#F4F5F7) or White.
- **Surface 1 (Modules/Cards):** Pure White with a subtle 1px border (#E1E4E8) and a soft, low-opacity shadow (Offset: 0, 2px; Blur: 4px; Opacity: 0.05).
- **Surface 2 (Popovers/Modals):** Increased elevation with a deeper shadow (Blur: 12px; Opacity: 0.1) to create clear focus on diagnostic overlays or Pentacam scan results.
- **Depth Cues:** Active states for input fields or selected table rows use a subtle "Primary Blue" tint (5% opacity) rather than heavy shadows to indicate focus.

## Shapes

The shape language uses **Rounded (0.5rem)** corners to soften the clinical environment and provide a modern, approachable feel.

- **Primary Elements:** Input fields, buttons, and cards use the standard 8px (0.5rem) radius.
- **Large Containers:** Specialized cards for Pentacam result scans use 16px (1rem) radius to define them as distinct, sophisticated data entities.
- **Data Indicators:** Status chips (e.g., "Stable," "Progressing") use a fully pill-shaped (2rem) radius to distinguish them from actionable buttons.

## Components

### Data Tables (Eye Measurements)
- **Structure:** Use a fixed header for scrolling through long measurement histories.
- **OD/OS Distinction:** Use subtle background tinting (OD = Light Blue, OS = Neutral White) or clear typographic labels to prevent error during data entry for Right and Left eyes.
- **Inline Editing:** Inputs within tables should be borderless until hovered to keep the interface clean during review mode.

### Specialized Cards (Pentacam & Scans)
- **Visuals:** Cards must include a square aspect-ratio placeholder for corneal topography maps or OCT scans.
- **Metadata:** Summary stats (K-max, Thinnest Point) should be displayed in the `label-caps` style at the bottom of the card for quick reference.

### Buttons & Inputs
- **Primary Action:** Solid Medical Blue with white text. High-contrast and easily clickable.
- **Measurements Inputs:** Numeric fields should include unit labels (e.g., "mmHg", "D") as fixed suffixes within the input container.

### Alerts & Indicators
- **Critical Reading:** High IOP or extreme refraction changes are highlighted with a "Critical" badge: Bold white text on Error Red background.
- **Diagnostic Tags:** Diagnoses (e.g., "Glaucoma," "Keratoconus") should be represented as high-contrast chips for rapid patient profile scanning.