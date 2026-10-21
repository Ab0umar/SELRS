## [1.0.1]

### Added
- Searchable, categorized module directory on the home page
- Grouped directory tools in the admin area
- Compact, expandable records in Accounting
- Compact registers and request timelines in Attendance
- Compact summaries and deduction tabs in Salary
- Neutral light theme surfaces, distinct from clinical paper
- Reviewed dictation and prescription proposals in the medical assistant
- Experimental transcription comparison and fictional transcript providers for the voice assistant
- Reference ranges and catalog maintenance tools in the medical catalog
- Outgoing referral-doctor registry in clinical reports
- Marketing content generation jobs, page-aware publishing with OAuth, and brand management
- Explicit task agent profile support
- Shared page access for attendance and salary permissions
- Signed cashbook entries and advance-employee matching in Accounting

### Changed
- Refined floating glass mobile bottom navigation and scrolling tabs
- Updated light screen color palette
- Refined home and admin navigation
- Improved responsive layouts and toolbars across Attendance, Salary, Clinical Sheets, Doctor Portal, Receipts, Marketing scheduler, and Medical Reference filters
- Improved mobile filter target sizing in Medical Reference
- Updated interfaces across Frontdesk, Patient Portal, Patient File, Clinical Suite, Doctor Portal, Stockroom, Pentacam, Operations, Admin, Marketing, and Accounting
- Updated receipt and print layouts and native printing for clinical sheets
- Improved error handling and page permission checks
- Improved shift scheduling and attendance dashboards, registers, and reports
- Updated desktop installer and application version

### Fixed
- Visits now finish only after clinical saves complete
- Corrected leave and monthly attendance calculations
- Preserved device timestamps and per-device offsets in attendance synchronization
- Preserved settled operation-fund history in Salary
- Fixed payroll snapshot validation and deduction calculations
- Removed duplicate Pentacam records without deleting shared files
- Deduplicated operations in medical history and exposed linked types
- Fixed a summary hook ordering issue in Patient File
- Fixed toolbar and tab collisions on narrow screens
- Prevented image toolbar overflow in the Doctor Portal

### Security
- Secured and coordinated attendance device synchronization
- Enforced WhatsApp consent opt-out and center-only message delivery

## [1.0.0]

### Added
- Added a searchable, categorized module directory on the home screen.
- Added compact, expandable records in Accounting.
- Added reviewed dictation and prescription proposals in the Medical Assistant.
- Added experimental fictional transcript providers for the Medical Assistant.
- Added a neutral light theme for screens, visually distinct from clinical paper.

### Changed
- Refined the home and admin navigation, with admin directory tools now grouped together.
- Refined the floating mobile navigation with a glass-style bottom bar and scrolling tabs.
- Updated the light screen color palette.
- Made Attendance registers and request timelines more compact.
- Made Salary summaries more compact and refined the deduction tabs.
- Refined Accounting prototype layouts and themed canvas.
- Medical visits are now marked as finished only after all clinical saves complete.
- Improved responsive controls and layouts in Attendance, Clinical Sheets, and specialist toolbars.
- Improved mobile filter target sizing in Medical Reference.

### Fixed
- Fixed toolbar and tab collisions on narrow screens in Salary.
- Fixed image toolbar overflow in the Doctor Portal.
- Fixed toolbar labels being cut off in the Clinical Suite by allowing them to wrap.
- Fixed receipt toolbar wrapping in KF.
- Fixed Marketing scheduler header controls overflowing by allowing them to wrap.