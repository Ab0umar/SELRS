/**
 * Module Theme Configuration
 * Customize colors, spacing, and styling for different modules
 */

export const moduleThemes = {
  salary: {
    name: "Salary Module",
    colors: {
      primary: "primary",
      accent: "primary/10",
      border: "primary/20",
      hover: "muted/50",
      activeText: "text-primary",
      activeBg: "bg-primary/10",
      activeBorder: "border-primary/30",
      inactiveText: "text-muted-foreground",
      inactiveBg: "bg-card",
      focusRing: "focus-visible:ring-primary/30",
    },
    icons: {
      primary: "BadgeDollarSign",
      sections: {
        preparation: "Users",
        variables: "Percent",
        payroll: "BarChart3",
        shifts: "UserRound",
        settings: "SlidersHorizontal",
      },
    },
    spacing: {
      sidebarWidth: "lg:w-64",
      sidebarPadding: "p-3 sm:p-4",
      sectionPadding: "px-3 py-2",
      itemPadding: "px-3 py-2.5",
      headerPadding: "px-3 py-4 sm:px-4 lg:px-5",
      contentPadding: "px-3 py-5 sm:px-4 lg:px-5",
    },
    metrics: {
      columns: {
        mobile: "grid-cols-2",
        tablet: "sm:grid-cols-4",
        desktop: "lg:grid-cols-4",
      },
      gap: "gap-2",
      borderRadius: "rounded-lg",
      padding: "p-3",
    },
  },

  attendance: {
    name: "Attendance Module",
    colors: {
      primary: "secondary",
      accent: "secondary/10",
      border: "secondary/20",
      hover: "muted/50",
      activeText: "text-secondary",
      activeBg: "bg-secondary/10",
      activeBorder: "border-secondary/30",
      inactiveText: "text-muted-foreground",
      inactiveBg: "bg-card",
      focusRing: "focus-visible:ring-secondary/30",
    },
    icons: {
      primary: "Activity",
      sections: {
        monitoring: "Activity",
        employees: "Users",
        reports: "BarChart3",
        settings: "Smartphone",
      },
    },
    spacing: {
      sidebarWidth: "lg:w-64",
      sidebarPadding: "p-3 sm:p-4",
      sectionPadding: "px-3 py-2",
      itemPadding: "px-3 py-2.5",
      headerPadding: "px-3 py-4 sm:px-4 lg:px-5",
      contentPadding: "px-3 py-5 sm:px-4 lg:px-5",
    },
    metrics: {
      columns: {
        mobile: "grid-cols-2",
        tablet: "sm:grid-cols-4",
        desktop: "lg:grid-cols-4",
      },
      gap: "gap-2",
      borderRadius: "rounded-lg",
      padding: "p-3",
    },
  },
};

/**
 * Get theme configuration for a module
 * @param module - Module name (salary or attendance)
 * @returns Theme configuration object
 */
export function getModuleTheme(module: "salary" | "attendance") {
  return moduleThemes[module];
}

/**
 * Theme customization presets
 * Can be used to quickly switch between different design styles
 */
export const themePresets = {
  default: {
    sidebarWidth: "w-64",
    borderRadius: "rounded-lg",
    fontWeight: "font-medium",
    spacing: "p-3",
  },
  compact: {
    sidebarWidth: "w-56",
    borderRadius: "rounded-md",
    fontWeight: "font-normal",
    spacing: "p-2",
  },
  spacious: {
    sidebarWidth: "w-72",
    borderRadius: "rounded-xl",
    fontWeight: "font-semibold",
    spacing: "p-4",
  },
};

/**
 * Color scheme options
 * Can be extended with more color schemes
 */
export const colorSchemes = {
  light: {
    background: "bg-background",
    card: "bg-card",
    border: "border-border",
    text: "text-foreground",
    muted: "text-muted-foreground",
  },
  dark: {
    background: "bg-slate-950",
    card: "bg-slate-900",
    border: "border-slate-800",
    text: "text-slate-50",
    muted: "text-slate-400",
  },
};
