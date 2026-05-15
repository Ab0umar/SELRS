# Shape: Accounting Page

This document outlines the design and UX for the new accounting page, targeting the **Admin** user persona for revenue tracking and reporting.

## 1. Purpose & Core Job

- **Job:** To provide a clear, actionable overview of the center's financial performance.
- **User:** Admin staff.
- **Context:** Used on a desktop in a bright clinic office for financial analysis and reporting.

## 2. Key Components & Layout

The page will be structured in a top-to-bottom flow, from high-level summary to detailed breakdown. It will use the existing sidebar navigation.

### Component 1: Key Metrics (The "At-a-Glance" View)

- **Layout:** A row of 3-4 summary cards at the top of the page.
- **Content:**
    - **Total Revenue (This Month):** Large number, with a small percentage change indicator vs. last month.
    - **Services Rendered:** Count of all billable procedures.
    - **Average Revenue Per Patient:** Calculation of total revenue / unique patients.
    - **Outstanding Invoices:** Total amount pending payment.
- **Design:** Use `Card` component from `DESIGN.md` (White background, light gray border, no shadow).

### Component 2: Revenue Breakdown (The "Detailed View")

- **Layout:** A detailed data table below the key metrics.
- **Content:**
    - A table of all financial transactions, grouped by date (most recent first).
    - **Columns:**
        - `Date`: Transaction date.
        - `Patient Name`: Patient associated with the service.
        - `Service`: The specific procedure or consultation.
        - `Doctor`: The performing doctor.
        - `Amount`: Revenue from the service.
        - `Status`: (e.g., Paid, Pending, Overdue).
- **Design:** Use `Table` component from `DESIGN.md`. Alternating row colors, clear headers, and appropriate text alignment for numbers. The `Status` column will use colored badges (Success for Paid, Warning for Pending, Error for Overdue).

### Component 3: Filtering & Actions (The "Tools")

- **Layout:** A control bar above the Revenue Breakdown table.
- **Content:**
    - **Date Range Picker:** To filter the table by a specific period.
    - **Export Button:** A primary action button (`orange`) to export the current view as a CSV or Excel file.
- **Design:** Use `Form` input styles for the date picker and the `Primary` button style for the export action.

## 3. User Flow

1.  Admin navigates to the "Accounting" section from the main sidebar.
2.  The page loads with the current month's data displayed by default.
3.  Admin can quickly see the key financial metrics in the top cards.
4.  Admin can scroll down to the table to see detailed transactions.
5.  Admin uses the date range picker to analyze a specific period.
6.  Admin clicks "Export" to download a report for offline use.

## 4. Rationale & Design Decisions

- **Desktop-First:** The layout is optimized for a desktop screen to handle the data density of the table.
- **Clarity and Efficiency:** The design follows the principles from `PRODUCT.md`. The information hierarchy is clear, and the user can quickly get an overview or dive into details.
- **Consistency:** The design will strictly adhere to the established `DESIGN.md` for all components, colors, and spacing to ensure a consistent experience with the rest of the application.
