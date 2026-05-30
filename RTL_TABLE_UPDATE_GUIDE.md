# RTL Table Formatting Guide

## Overview
All tables in Attendance and Salary modules need to be updated to use proper RTL (Right-to-Left) layout with consistent column ordering.

## Key Changes Required

### 1. Add RTL Direction to Tables
```tsx
// Container
<div className="overflow-x-auto" dir="rtl">
  // Table
  <table className="w-full text-sm" dir="rtl">
    // Headers and rows
  </table>
</div>
```

### 2. Column Ordering Standard
All tables should follow this left-to-right display order (which appears right-to-left in RTL):

**For Employee/Staff Tables:**
```
الكود | الاسم | القسم | النوع | الحالة | الإجراءات
(Code) (Name) (Dept) (Type) (Status) (Actions)
```

**For Salary/Payroll Tables:**
```
الكود | الاسم | الراتب | البدلات | الخصومات | الإجمالي | الإجراءات
(Code) (Name) (Salary) (Allowances) (Deductions) (Total) (Actions)
```

**For Attendance/Reports Tables:**
```
التاريخ | الموظف | الحضور | الغياب | التأخير | الملاحظات | الإجراءات
(Date) (Employee) (Present) (Absent) (Late) (Notes) (Actions)
```

### 3. Header Column Widths
```tsx
<th className="px-4 py-3 text-center font-semibold text-foreground w-16">
  الكود
</th>
<th className="px-4 py-3 text-right font-semibold text-foreground min-w-max">
  الاسم
</th>
<th className="px-4 py-3 text-center font-semibold text-foreground w-16">
  القسم
</th>
```

### 4. Text Alignment
- **Code/ID columns:** `text-center` with `w-16` or `w-20`
- **Name columns:** `text-right` with `min-w-max` (takes only needed width)
- **Status/Action columns:** `text-center` with fixed width
- **Amount columns:** `text-center` with `w-20`

### 5. Body Row Structure
Ensure body rows follow the exact same column order as headers:

```tsx
<tr>
  {/* Code Column */}
  <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
    {emp.empCd}
  </td>
  
  {/* Name Column */}
  <td className="px-4 py-3 text-right min-w-max">
    {emp.fullName}
  </td>
  
  {/* Department Column */}
  <td className="px-4 py-3 text-center">
    {emp.department}
  </td>
  
  {/* Status Column */}
  <td className="px-4 py-3 text-center">
    {emp.active ? "نشط" : "غير نشط"}
  </td>
  
  {/* Actions Column */}
  <td className="px-4 py-3 text-center">
    {/* Edit/Delete buttons */}
  </td>
</tr>
```

## Files to Update

### Attendance Module
- [ ] AttendanceHome.tsx
- [ ] DailyView.tsx
- [ ] LeaveBalanceReport.tsx
- [ ] LeaveManagement.tsx
- [ ] LiveBoard.tsx
- [ ] Reports.tsx
- [ ] ShiftAssignments.tsx
- [ ] ShiftManagement.tsx
- [ ] PermissionReport.tsx
- [ ] Permissions.tsx

### Salary Module
- [ ] SalaryBasics.tsx
- [ ] CurrentSalaryData.tsx
- [ ] CommissionPools.tsx
- [ ] PayrollReport.tsx
- [ ] SalaryPenalties.tsx
- [ ] ShiftPayroll.tsx
- [ ] ShiftSchedule.tsx
- [ ] ShiftStaff.tsx

## Implementation Steps

1. **Add dir="rtl" attributes** to table containers and tables
2. **Reorder columns** in both `<thead>` and `<tbody>`
3. **Adjust text alignment** (text-right for names, text-center for others)
4. **Set column widths** consistently
5. **Test in browser** with hard refresh (Ctrl+Shift+R)

## Example: Before and After

### Before
```tsx
<table className="w-full text-sm">
  <thead>
    <tr>
      <th>الإجراءات</th>
      <th>الحالة</th>
      <th>النوع</th>
      <th>القسم</th>
      <th>الاسم</th>
      <th>الكود</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{/* Actions */}</td>
      <td>{emp.active}</td>
      <td>{emp.type}</td>
      <td>{emp.dept}</td>
      <td>{emp.name}</td>
      <td>{emp.code}</td>
    </tr>
  </tbody>
</table>
```

### After
```tsx
<div className="overflow-x-auto" dir="rtl">
  <table className="w-full text-sm" dir="rtl">
    <thead>
      <tr className="border-b bg-muted/50">
        <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
          الكود
        </th>
        <th className="px-4 py-3 text-right font-semibold text-foreground min-w-max">
          الاسم
        </th>
        <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
          القسم
        </th>
        <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
          النوع
        </th>
        <th className="px-4 py-3 text-center font-semibold text-foreground w-16">
          الحالة
        </th>
        <th className="px-4 py-3 text-center font-semibold text-foreground w-20">
          الإجراءات
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="px-4 py-3 text-center font-mono text-xs font-semibold">
          {emp.code}
        </td>
        <td className="px-4 py-3 text-right min-w-max">
          {emp.name}
        </td>
        <td className="px-4 py-3 text-center">
          {emp.dept}
        </td>
        <td className="px-4 py-3 text-center">
          {emp.type}
        </td>
        <td className="px-4 py-3 text-center">
          {emp.active ? "نشط" : "غير نشط"}
        </td>
        <td className="px-4 py-3 text-center">
          {/* Actions */}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## Quick Checklist

- [ ] Table has `dir="rtl"` on both container and table element
- [ ] Header columns match body row column order
- [ ] All columns have consistent width classes
- [ ] Text alignment is correct (right for names, center for others)
- [ ] No `flex-1` on name columns (use `min-w-max` instead)
- [ ] Hard refresh browser to clear cache
- [ ] Verify all tables display correctly in RTL

## Notes

- Always hard refresh (Ctrl+Shift+R) after making changes
- The `min-w-max` class prevents the Name column from stretching
- Fixed widths (w-16, w-20) keep columns compact
- RTL direction is applied at both container and table level for maximum compatibility
