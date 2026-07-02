# Medical Sheets Redesign System

## Overview
This document outlines the redesign principles and layout strategy for the SRV100 examination sheets (`ConsultantSheet`, `LasikExamSheet`, `SpecialistSheet`, `ExternalOperationSheet`, `FollowupTablesBody`). The goal is to unify the visual language, improve printability (A4 standard), and create a modern, clean, and consistent interface based on the provided reference SVGs.

## Design Principles

### 1. Color Palette
- **Primary Accent:** `#003D9B` (Deep Blue) - Used for primary headings, right eye (OD) highlights, and key borders.
- **Secondary Accent:** `#526069` (Slate Gray) - Used for left eye (OS) highlights and secondary text.
- **Backgrounds:**
  - Page Background: `#F8F9FB`
  - Table Headers: `#E7E8EA`
  - Subtle Highlights: `#F3F4F6`
- **Text Colors:**
  - Primary Text: `#191C1E`
  - Muted Text: `#434654`
  - Borders: `#C3C6D6`

### 2. Typography
- **Font Family:** Clean sans-serif (Tailwind default `font-sans`).
- **Sizes:**
  - Main Titles: `text-lg font-bold`
  - Section Headers: `text-xs uppercase tracking-wider font-bold`
  - Standard Text: `text-sm`
  - Small Text (Print): `text-[11px]`

### 3. Layout & Spacing
- **Print Optimization:** All sheets are strictly optimized for A4 portrait (`210mm` width).
- **RTL/LTR Handling:**
  - Arabic text is strictly RTL.
  - Medical abbreviations (OD, OS, UCVA, BCVA) and English text are strictly LTR.
  - Tables are centered.
- **Patient Information Band:**
  - Order (Right to Left): Name -> Date of Birth -> Age -> Address -> Mobile.
  - Displayed in a compact, bordered grid or inline flex layout with a light gray background (`#F3F4F6`).

### 4. Component Patterns
- **Header:** Unified `SheetCenterHeader` with centered logo/title and date.
- **Eye Selection:** OD (Right) highlighted in blue, OS (Left) in gray.
- **Tables:**
  - Unified table styles with `#E7E8EA` headers.
  - OD rows have a subtle blue tint (`bg-[#003d9b]/5`).
  - OS rows have a subtle gray tint (`bg-[#f3f4f6]`).
- **Inputs:** Transparent inputs with bottom borders (`border-b border-[#c3c6d6]`), turning blue on focus.
- **Checkboxes:** Custom styled checkboxes for medical history.
- **Signatures Footer:** 4-column grid (Reception, Nurse, Technician, Doctor) with signature lines.

## Implementation Plan
1. **ConsultantSheet & FollowupTablesBody:** Update layout to match `consal.svg` and `followups.svg`.
2. **LasikExamSheet & SpecialistSheet:** Update layout to match `lasik.svg`, incorporating Pentacam data blocks.
3. **ExternalOperationSheet:** Align with the new unified layout structure.
4. **CSS Overrides:** Ensure `print` media queries strictly enforce A4 dimensions and hide non-essential UI elements.
