# SELRS Medical Center Platform

## Register
**Product** — Internal clinical/admin tool. Design serves workflow efficiency and data clarity.

## Product Purpose
A unified web and Android app for LASIK/corneal surgery center staff to manage patient records, appointments, and surgery documentation. Used exclusively by center employees (admins, surgeons, nurses, receptionists) across desktop (clinic office), mobile (patient-facing, OR), and tablet (front desk).

## Users
- **Surgeons**: Review patient history, pre-op data, post-op follow-ups during clinic hours
- **Nurses**: Manage appointments, post-op care records, patient communication
- **Receptionists**: Schedule appointments, register patients, triage intake
- **Admins**: Reporting, revenue tracking, staff/department management
- **Environment**: Bright clinic offices, dim OR/recovery rooms, on-the-go mobile use

## Key Workflows
1. **Patient Management** — Search, create, view full medical history, pre/post-op tracking
2. **Appointment Scheduling** — Calendar view, slot management, confirmation
3. **Surgery Records** — Real-time documentation, imaging integration, pathology notes
4. **Reporting** — Revenue by service/doctor, performance metrics, audit trails

## Brand Identity
- **Colors**: Orange (primary accent, warmth, medical optimism), Blue (trust, clarity), White (cleanliness, medical sterility)
- **Tone**: Professional, modern, efficient. No decorative flourish; clarity over decoration.
- **Bilingual**: Arabic/English (Arabic primary for UI, English fallback)
- **Voice**: Direct, action-oriented, medical-formal but approachable

## Anti-References
- Healthcare generics (healthcare→teal+white, fitness→neon, SaaS→cream)
- Overly clinical (cold, institutional look)
- Cluttered dashboards (too many cards, no hierarchy)
- Mobile-first: design is desktop-first, responsive as secondary

## Strategic Principles
1. **Clarity over aesthetics** — Data must be readable, actions must be obvious
2. **Efficiency first** — Staff are busy; minimize clicks, maximize information density where needed
3. **Mobile parity** — Capacitor app matches web feature-for-feature, not secondary
4. **Trust through design** — Medical data requires restraint, consistency, professional presentation
5. **Light theme always** — Clinic brightness, no dark mode

## Current State
- Web app functional, multiple pages built
- Android via Capacitor (same codebase)
- Design debt: inconsistent buttons, poor spacing rhythm, weak hierarchy, ad-hoc color usage
- No unified design system

## Success Criteria
- All pages follow a consistent visual language (color, typography, spacing, components)
- Data-heavy pages (tables, charts, reports) are scannable and well-organized
- Medical workflows feel fast and intuitive
- Responsive behavior works seamlessly across web and mobile
- Staff confidence in data accuracy reflects in UI clarity
