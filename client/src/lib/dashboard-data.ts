// Navigation metadata + labels (dashboard queue data comes from tRPC live queries).

export type QueueStatus = "checkedIn" | "next" | "clinic" | "treated";

export interface Patient {
  id: number;
  fullName: string;
  doctorName: string;
  serviceType: string;
  queueStatus: QueueStatus;
  checkedInTime?: string;
}

export const serviceTypeLabels: Record<string, string> = {
  consultant: "استشاري",
  specialist: "أخصائي",
  lasik: "ليزك",
  surgery: "عمليات",
  external: "خارجي",
};

export const queueStatusLabelsAr: Record<QueueStatus, string> = {
  checkedIn: "تسجيل",
  next: "التالي",
  clinic: "عيادة",
  treated: "معالج",
};

// ===== Sidebar Navigation (matches real repo structure) =====

// Main items (always visible)
export const mainNavItems = [
  { key: 'dashboard' as const, label: 'لوحة التحكم', icon: 'activity', badge: undefined },
  { key: 'today-patients' as const, label: 'مرضى اليوم', icon: 'clock', badge: undefined },
  { key: 'operations' as const, label: 'المواعيد والعمليات', icon: 'calendar-days', badge: undefined },
  { key: 'home' as const, label: 'تسجيل الدخول', icon: 'settings', badge: undefined },
]

// Workflow section
export const workflowNavItems = [
  { key: 'patients' as const, label: 'المرضى', icon: 'users', badge: '4.2k' },
  { key: 'examinations' as const, label: 'الفحوصات', icon: 'eye', badge: undefined },
  { key: 'quick-entry' as const, label: 'دخول سريع', icon: 'user-plus', badge: undefined },
  { key: 'new-cases' as const, label: 'حالات جديدة', icon: 'file-plus', badge: undefined },
  { key: 'followups' as const, label: 'المتابعات', icon: 'repeat', badge: undefined },
  { key: 'visits' as const, label: 'الزيارات', icon: 'calendar-check', badge: undefined },
  { key: 'surgeries' as const, label: 'العمليات', icon: 'syringe', badge: undefined },
  { key: 'prescriptions' as const, label: 'الروشتات', icon: 'pill', badge: undefined },
  { key: 'medical-reports' as const, label: 'التقارير الطبية', icon: 'file-text', badge: undefined },
  { key: 'workflow-hub' as const, label: 'مركز سير العمل', icon: 'workflow', badge: undefined },
  { key: 'patient-hub' as const, label: 'مركز المرضى', icon: 'users', badge: undefined },
]

// Users & Roles section
export const usersRolesNavItems = [
  { key: 'users' as const, label: 'المستخدمين', icon: 'user-cog', badge: undefined },
  { key: 'doctors' as const, label: 'الأطباء', icon: 'stethoscope', badge: undefined },
  { key: 'permissions' as const, label: 'الصلاحيات', icon: 'shield', badge: undefined },
]

// Data & Services section
export const dataServicesNavItems = [
  { key: 'services' as const, label: 'الخدمات', icon: 'building', badge: undefined },
  { key: 'medical-sheets' as const, label: 'النماذج', icon: 'clipboard-list', badge: undefined },
  { key: 'sheet-designer' as const, label: 'مصمم النماذج', icon: 'layout-grid', badge: undefined },
  { key: 'pentacam' as const, label: 'بنتاكام', icon: 'circle-dot', badge: undefined },
  { key: 'sheet-copies' as const, label: 'نسخ النماذج', icon: 'copy', badge: undefined },
]

// System & Settings section
export const systemSettingsNavItems = [
  { key: 'settings' as const, label: 'الإعدادات', icon: 'settings', badge: undefined },
  { key: 'system-status' as const, label: 'حالة النظام', icon: 'activity', badge: undefined },
  { key: 'migrations' as const, label: 'الهجرات', icon: 'database', badge: undefined },
  { key: 'api-tools' as const, label: 'أدوات API', icon: 'terminal', badge: undefined },
  { key: 'admin-hub' as const, label: 'مركز الإدارة', icon: 'layout-grid', badge: undefined },
  { key: 'admin-patients' as const, label: 'إدارة المرضى (Admin)', icon: 'users', badge: undefined },
]

// Other Tools section
export const otherToolsNavItems = [
  { key: 'medications' as const, label: 'الأدوية', icon: 'pill', badge: undefined },
  { key: 'medications-registry' as const, label: 'سجل الأدوية (متقدم)', icon: 'pill', badge: undefined },
  { key: 'medications-tests' as const, label: 'أدوية و فحوصات', icon: 'flask-conical', badge: undefined },
  { key: 'examinations-catalog' as const, label: 'إدارة الاختبارات', icon: 'flask-conical', badge: undefined },
  { key: 'txhub' as const, label: 'TXhub تحاليل وأشعة', icon: 'microscope', badge: undefined },
  { key: 'tests' as const, label: 'اختصار الفحوصات', icon: 'flask-conical', badge: undefined },
  { key: 'tests-management' as const, label: 'إدارة الفحوصات (Admin)', icon: 'clipboard-list', badge: undefined },
  { key: 'component-showcase' as const, label: 'عرض المكونات', icon: 'layout-grid', badge: undefined },
]

// Sidebar collapsible group definitions
export interface NavItem {
  key: string
  label: string
  icon: string
  badge: string | undefined
}

export interface NavGroup {
  id: string
  label: string
  icon: string
  items: readonly NavItem[]
}

export const sidebarGroups: NavGroup[] = [
  { id: 'workflow', label: 'سير العمل', icon: 'workflow', items: workflowNavItems },
  { id: 'users-roles', label: 'المستخدمين والأدوار', icon: 'users', items: usersRolesNavItems },
  { id: 'data-services', label: 'البيانات والخدمات', icon: 'building', items: dataServicesNavItems },
  { id: 'system-settings', label: 'النظام والإعدادات', icon: 'settings', items: systemSettingsNavItems },
  { id: 'other-tools', label: 'أدوات أخرى', icon: 'wrench', items: otherToolsNavItems },
]

// ===== Page Key Type =====

export type PageKey =
  | 'dashboard'
  | 'today-patients'
  | 'operations'
  | 'home'
  | 'patients'
  | 'examinations'
  | 'quick-entry'
  | 'new-cases'
  | 'followups'
  | 'visits'
  | 'surgeries'
  | 'prescriptions'
  | 'medical-reports'
  | 'workflow-hub'
  | 'patient-hub'
  | 'users'
  | 'doctors'
  | 'permissions'
  | 'services'
  | 'medical-sheets'
  | 'sheet-designer'
  | 'pentacam'
  | 'sheet-copies'
  | 'settings'
  | 'system-status'
  | 'migrations'
  | 'api-tools'
  | 'admin-hub'
  | 'admin-patients'
  | 'medications'
  | 'medications-registry'
  | 'medications-tests'
  | 'examinations-catalog'
  | 'txhub'
  | 'tests'
  | 'tests-management'
  | 'component-showcase'
  | 'login'
  | 'not-found'
  | 'force-password-change'
  | 'examination-form'
  | 'refraction'
  | 'write-prescription'
  | 'request-tests'
  | 'consultant-sheet'
  | 'specialist-sheet'
  | 'lasik-exam-sheet'
  | 'lasik-followup'
  | 'pentacam-sheet'
  | 'external-operation-sheet'
  | 'followup-form'
  | 'consultant-followup'
  | 'profile'
  | 'patient-details'
  | 'patient-summary'
  | 'doctor-patient-view'
  | 'notification-settings'
  | 'pentacam-failed'
  | 'card-visibility'
  | 'admin-diagnostics'

// ===== Route Map (DSC PageKey → SELRS URL) =====

export const routeMap: Record<PageKey, string> = {
  'dashboard': '/dashboard',
  'today-patients': '/today',
  'operations': '/operations',
  'home': '/',
  'patients': '/patients',
  'examinations': '/examination',
  'quick-entry': '/quick-entry',
  'new-cases': '/new-cases',
  'followups': '/followups',
  'visits': '/visits',
  'surgeries': '/operations',
  'prescriptions': '/prescriptions',
  'medical-reports': '/medical-reports',
  'workflow-hub': '/workflow-hub',
  'patient-hub': '/patient-hub',
  'users': '/users',
  'doctors': '/doctors',
  'permissions': '/permissions',
  'services': '/services',
  'medical-sheets': '/medical-sheets',
  'sheet-designer': '/sheet-designer',
  'pentacam': '/pentacam',
  'sheet-copies': '/sheet-copies',
  'settings': '/admin/settings',
  'system-status': '/system-status',
  'migrations': '/migrations',
  'api-tools': '/api-tools',
  'admin-hub': '/admin-hub',
  'admin-patients': '/admin-patients',
  'medications': '/medications',
  'medications-registry': '/medications/registry',
  'medications-tests': '/medications-tests',
  'tests': '/tests',
  'examinations-catalog': '/examinations/catalog',
  'txhub': '/txhub',
  'tests-management': '/tests-management',
  'component-showcase': '/showcase',
  'login': '/login',
  'not-found': '/404',
  'force-password-change': '/force-password-change',
  'examination-form': '/examination',
  'refraction': '/refraction',
  'write-prescription': '/prescription',
  'request-tests': '/request-tests',
  /** Global entry: pick patient on file hub (no `:id` route for consultant-only). */
  'consultant-sheet': '/patient-file',
  'specialist-sheet': '/patient-file',
  'lasik-exam-sheet': '/examination',
  'lasik-followup': '/followups',
  'pentacam-sheet': '/sheets/pentacam',
  'external-operation-sheet': '/patient-file',
  'followup-form': '/followups',
  'consultant-followup': '/followups',
  'profile': '/profile',
  'patient-details': '/patient-file',
  'patient-summary': '/patient-summary',
  'doctor-patient-view': '/doctor/patient/0',
  'notification-settings': '/notification-settings',
  'pentacam-failed': '/pentacam-failed',
  'card-visibility': '/card-visibility',
  'admin-diagnostics': '/admin-diagnostics',
}

