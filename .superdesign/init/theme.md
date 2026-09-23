# Medical reports theme

## Part 1 — compact token summary

- Brand: عيون الشروق / Shorouk Eyes; Arabic-first ophthalmology staff workflow.
- Direction: RTL (`dir="rtl"` on report controls and Arabic document chrome).
- Primary navy: `#003D82`; deep navy `#00355f`; saturated report blue `#003d9b`.
- Typography: Cairo for Arabic UI and printed reports, with readable numeric/Latin fallbacks.
- Documents: A4 portrait print, zero page margin, exact color adjustment, print-hidden app controls.
- Clinical geometry: OD/OS comparison grids, compact labels, bordered cells and signature/footer areas.
- Component language: shadcn-style Radix primitives composed with Tailwind utilities.

## Part 2 — source tokens and report CSS

### Tailwind

No `tailwind.config.*` file is tracked at the project root or under `client/` at init time. Tailwind v4 is imported from `client/src/index.css`; keep the report redesign compatible with these utilities and shadcn tokens. This is a gap to verify if a config is added later.

### `client/src/styles/medical-report-brand.css` (complete source)

```css
.medical-report-brand {
  --report-primary: #003d9b;
  --report-primary-dark: #00355f;
  --report-ink: #161d1f;
  --report-muted: #727780;
  --report-border: #c3c6d6;
  --report-header: #e7e8ea;
  --report-tint: #f3f4f6;
  background: #eef5f7;
  color: var(--report-ink);
  font-family: "Inter", "Cairo", "Segoe UI", sans-serif;
}

.medical-report-page {
  box-sizing: border-box;
  width: 210mm;
  min-height: 297mm;
  margin-inline: auto;
  border: 1px solid var(--report-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(0 53 95 / 8%);
}

.medical-report-brand table {
  border-color: var(--report-border);
}

.medical-report-brand table th,
.medical-report-brand table td {
  border-color: var(--report-border);
  text-align: center;
  vertical-align: middle;
}

.medical-report-brand table thead,
.medical-report-brand table thead tr {
  background: var(--report-header);
  color: var(--report-ink);
}

.medical-report-brand table th {
  font-weight: 700;
}

.medical-report-brand .report-title {
  color: var(--report-primary);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.medical-report-brand .report-section-title {
  color: var(--report-primary);
  font-weight: 700;
}

.clinical-report-content {
  color: var(--report-ink);
  font-size: 13px;
  line-height: 1.4;
}

.clinical-report-content h2,
.clinical-report-content h3 {
  color: var(--report-primary) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.clinical-report-content input,
.clinical-report-content textarea,
.clinical-report-content select {
  font-size: 13px;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  .medical-report-brand {
    min-height: 0 !important;
    height: auto !important;
    background: #fff !important;
    overflow: visible !important;
  }

  .medical-report-page {
    box-sizing: border-box !important;
    width: auto !important;
    max-width: none !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
    overflow: visible !important;
  }

  /* Avoid breaks only on compact blocks - never lock the whole sheet */
  .medical-report-brand table,
  .medical-report-brand .report-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .no-print,
  .print\:hidden {
    display: none !important;
  }
}
```

### Global CSS key-variable excerpts

`client/src/index.css` is 3,467 lines. The relevant ranges are: Tailwind/font imports and `@theme` (1-40), base `:root`/`.dark` tokens (237-319), and explicit Shorouk/Eye report brand overrides (925-1000).

```css

   1: @import "tailwindcss";
   2: @import "tw-animate-css";
   3: @import "./styles/medical-report-brand.css";
   4: @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap");
   5: 
   6: @custom-variant dark (&:is(.dark *));
   7: 
   8: @theme inline {
   9:   --font-sans: "Inter", "Segoe UI", system-ui, sans-serif;
  10:   --font-arabic: "Cairo", "Segoe UI", system-ui, sans-serif;
  11:   --font-mono: "IBM Plex Mono", "Courier New", monospace;
  12:   --radius-sm: calc(var(--radius) - 4px);
  13:   --radius-md: calc(var(--radius) - 2px);
  14:   --radius-lg: var(--radius);
  15:   --radius-xl: calc(var(--radius) + 4px);
  16:   --color-background: var(--background);
  17:   --color-foreground: var(--foreground);
  18:   --color-card: var(--card);
  19:   --color-card-foreground: var(--card-foreground);
  20:   --color-popover: var(--popover);
  21:   --color-popover-foreground: var(--popover-foreground);
  22:   --color-primary: var(--primary);
  23:   --color-primary-foreground: var(--primary-foreground);
  24:   --color-secondary: var(--secondary);
  25:   --color-secondary-foreground: var(--secondary-foreground);
  26:   --color-muted: var(--muted);
  27:   --color-muted-foreground: var(--muted-foreground);
  28:   --color-accent: var(--accent);
  29:   --color-accent-foreground: var(--accent-foreground);
  30:   --color-destructive: var(--destructive);
  31:   --color-destructive-foreground: var(--destructive-foreground);
  32:   --color-border: var(--border);
  33:   --color-input: var(--input);
  34:   --color-ring: var(--ring);
  35:   --color-chart-1: var(--chart-1);
  36:   --color-chart-2: var(--chart-2);
  37:   --color-chart-3: var(--chart-3);
  38:   --color-chart-4: var(--chart-4);
  39:   --color-chart-5: var(--chart-5);
  40:   --color-sidebar: var(--sidebar);


/* base root and dark tokens */

 237: :root {
 238:   /* Bento One clinical redesign: calm blue structure with warm orange action. */
 239:   --selrs-navy: oklch(0.45 0.16 257);
 240:   --selrs-orange: oklch(0.68 0.18 45);
 241:   --selrs-dark-blue: oklch(0.24 0.024 253);
 242:   --selrs-light-blue: oklch(0.945 0.016 248);
 243:   --selrs-light-orange: oklch(0.94 0.055 55);
 244: 
 245:   --primary: oklch(0.45 0.16 257);
 246:   --primary-foreground: oklch(0.985 0.006 245);
 247:   --sidebar-primary: oklch(0.5 0.14 257);
 248:   --sidebar-primary-foreground: oklch(0.985 0.006 245);
 249: 
 250:   --chart-1: oklch(0.45 0.16 257);
 251:   --chart-2: oklch(0.67 0.18 47);
 252:   --chart-3: oklch(0.62 0.14 154);
 253:   --chart-4: oklch(0.73 0.15 83);
 254:   --chart-5: oklch(0.58 0.16 27);
 255: 
 256:   --radius: 1rem;
 257: 
 258:   --background: oklch(0.982 0.008 248);
 259:   --foreground: oklch(0.24 0.024 253);
 260:   --card: oklch(0.998 0.004 248);
 261:   --card-foreground: oklch(0.24 0.024 253);
 262:   --popover: oklch(0.998 0.004 248);
 263:   --popover-foreground: oklch(0.24 0.024 253);
 264:   --secondary: oklch(0.68 0.18 45);
 265:   --secondary-foreground: oklch(0.985 0.006 55);
 266:   --muted: oklch(0.945 0.016 248);
 267:   --muted-foreground: oklch(0.5 0.03 253);
 268:   --accent: oklch(0.925 0.04 248);
 269:   --accent-foreground: oklch(0.3 0.06 257);
 270:   --destructive: oklch(0.57 0.2 27);
 271:   --destructive-foreground: oklch(0.985 0.006 55);
 272:   --success: oklch(0.62 0.14 154);
 273:   --success-foreground: oklch(0.985 0.006 145);
 274:   --info: oklch(0.58 0.17 257);
 275:   --info-foreground: oklch(0.985 0.006 245);
 276:   --warning: oklch(0.73 0.15 83);
 277:   --warning-foreground: oklch(0.27 0.045 65);
 278:   --error: oklch(0.57 0.2 27);
 279:   --error-foreground: oklch(0.985 0.006 55);
 280:   --border: oklch(0.89 0.018 248);
 281:   --input: oklch(0.998 0.004 248);
 282:   --ring: oklch(0.58 0.17 257);
 283: 
 284:   --sidebar: oklch(0.966 0.014 248);
 285:   --sidebar-foreground: oklch(0.24 0.024 253);
 286:   --sidebar-accent: oklch(0.925 0.04 248);
 287:   --sidebar-accent-foreground: oklch(0.3 0.06 257);
 288:   --sidebar-border: oklch(0.88 0.02 248);
 289:   --sidebar-ring: oklch(0.58 0.17 257);
 290: 
 291:   --destructive-text: oklch(0.48 0.17 27);
 292:   --success-text: oklch(0.42 0.12 154);
 293:   --warning-text: oklch(0.45 0.1 75);
 294:   --bento-shadow:
 295:     0 1px 2px oklch(0.28 0.04 257 / 0.06),
 296:     0 18px 45px oklch(0.42 0.08 257 / 0.08);
 297:   --bento-shadow-soft: 0 1px 2px oklch(0.28 0.04 257 / 0.07);
 298: }
 299: 
 300: .dark {
 301:   --background: oklch(0.12 0.015 265);
 302:   --foreground: oklch(0.97 0.004 60);
 303:   --card: oklch(0.17 0.012 265);
 304:   --card-foreground: oklch(0.97 0.004 60);
 305:   --popover: oklch(0.22 0.01 265);
 306:   --popover-foreground: oklch(0.97 0.004 60);
 307:   --primary: oklch(0.75 0.16 76);
 308:   --primary-foreground: oklch(0.12 0.015 265);
 309:   --secondary: oklch(0.82 0.13 76);
 310:   --secondary-foreground: oklch(0.12 0.015 265);
 311:   --muted: oklch(0.22 0.01 265);
 312:   --muted-foreground: oklch(0.52 0.01 265);
 313:   --accent: oklch(0.82 0.13 76);
 314:   --accent-foreground: oklch(0.12 0.015 265);
 315:   --destructive: oklch(0.62 0.22 25);
 316:   --destructive-foreground: oklch(0.97 0.004 60);
 317:   --success: oklch(0.68 0.15 145);
 318:   --success-foreground: oklch(0.97 0.004 60);
 319:   --info: oklch(0.67 0.14 230);


/* explicit brand overrides */

 925:     background: #010409;
 926:   }
 927: 
 928:   .selrs-login-bg {
 929:     --background: #fbfdff;
 930:     --foreground: #001f47;
 931:     --card: #ffffff;
 932:     --card-foreground: #001f47;
 933:     --popover: #ffffff;
 934:     --popover-foreground: #001f47;
 935:     --muted: #e8f0f8;
 936:     --muted-foreground: #4b5563;
 937:     --border: #dbe4ef;
 938:     --input: #dbe4ef;
 939:     --primary: #003d82;
 940:     --primary-foreground: #ffffff;
 941:     --secondary: #ff9500;
 942:     --secondary-foreground: #001f47;
 943:     --accent: #ff9500;
 944:     --accent-foreground: #001f47;
 945:     --ring: #003d82;
 946:     color-scheme: light;
 947:     background-image:
 948:       radial-gradient(
 949:         circle at 18% 14%,
 950:         rgba(0, 61, 130, 0.12) 0%,
 951:         rgba(0, 61, 130, 0.05) 20%,
 952:         transparent 48%
 953:       ),
 954:       radial-gradient(
 955:         circle at 86% 16%,
 956:         rgba(255, 149, 0, 0.14) 0%,
 957:         rgba(255, 149, 0, 0.05) 18%,
 958:         transparent 42%
 959:       ),
 960:       radial-gradient(
 961:         circle at 72% 82%,
 962:         rgba(0, 61, 130, 0.06) 0%,
 963:         transparent 28%
 964:       ),
 965:       linear-gradient(135deg, #ffffff 0%, #f7fbff 42%, #eef4fb 100%);
 966:     background-attachment: fixed;
 967:   }
 968: 
 969:   .selrs-login-bg input:-webkit-autofill,
 970:   .selrs-login-bg input:-webkit-autofill:hover,
 971:   .selrs-login-bg input:-webkit-autofill:focus,
 972:   .selrs-login-bg input:-webkit-autofill:active {
 973:     -webkit-text-fill-color: transparent !important;
 974:     caret-color: var(--primary) !important;
 975:     -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
 976:     box-shadow: 0 0 0 1000px transparent inset !important;
 977:     transition: background-color 9999s ease-out 0s;
 978:   }
 979: 
 980:   .dark .selrs-login-bg {
 981:     --background: #fbfdff;
 982:     --foreground: #001f47;
 983:     --card: #ffffff;
 984:     --card-foreground: #001f47;
 985:     --popover: #ffffff;
 986:     --popover-foreground: #001f47;
 987:     --muted: #e8f0f8;
 988:     --muted-foreground: #4b5563;
 989:     --border: #dbe4ef;
 990:     --input: #dbe4ef;
 991:     --primary: #003d82;
 992:     --primary-foreground: #ffffff;
 993:     --secondary: #ff9500;
 994:     --secondary-foreground: #001f47;
 995:     --accent: #ff9500;
 996:     --accent-foreground: #001f47;
 997:     --ring: #003d82;
 998:     color-scheme: light;
 999:     background-image:
1000:       radial-gradient(

```
