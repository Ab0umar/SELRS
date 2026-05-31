import { int, varchar, text, timestamp, date, boolean, json, decimal, mysqlTable, mysqlEnum, primaryKey, index } from "drizzle-orm/mysql-core";
import { uniqueIndex } from "drizzle-orm/mysql-core"
/**
 * Core user table with local authentication (username/password)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // bcrypt hash
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["admin", "doctor", "nurse", "technician", "reception", "manager", "accountant", "worker", "supervisor"]).default("reception").notNull(),
  branch: mysqlEnum("branch", ["examinations", "surgery", "both"]).default("examinations").notNull(),
  shift: int("shift").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table - ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط±ط¶ظ‰
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  patientCode: varchar("patientCode", { length: 50 }).notNull().unique(), // ظƒظˆط¯ ط§ظ„ظ…ط±ظٹط¶
  fullName: varchar("fullName", { length: 255 }).notNull(), // ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„
  dateOfBirth: date("dateOfBirth"), // طھط§ط±ظٹط® ط§ظ„ظ…ظٹظ„ط§ط¯
  age: int("age"), // ط§ظ„ط¹ظ…ط±
  gender: mysqlEnum("gender", ["male", "female"]), // ط§ظ„ط¬ظ†ط³
  nationalId: varchar("nationalId", { length: 20 }), // ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ
  phone: varchar("phone", { length: 20 }), // ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ
  alternatePhone: varchar("alternatePhone", { length: 20 }), // ط±ظ‚ظ… ظ‡ط§طھظپ ط¨ط¯ظٹظ„
  address: text("address"), // ط§ظ„ط¹ظ†ظˆط§ظ†
  occupation: varchar("occupation", { length: 255 }), // ط§ظ„ظˆط¸ظٹظپط©
  referralSource: varchar("referralSource", { length: 255 }), // ظƒظٹظپظٹط© ط§ظ„ظ…ط¹ط±ظپط©
  medicalHistory: text("medicalHistory"), // ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط±ط¶ظٹ
  allergies: text("allergies"), // ط§ظ„ط­ط³ط§ط³ظٹط§طھ
  branch: mysqlEnum("branch", ["examinations", "surgery"]).default("examinations"), // ط§ظ„ظپط±ط¹ ط§ظ„ط£ط³ط§ط³ظٹ
  serviceType: mysqlEnum("serviceType", ["consultant", "specialist", "lasik", "surgery", "external"]).default("consultant"), // ظ†ظˆط¹ ط§ظ„ط®ط¯ظ…ط©
  locationType: mysqlEnum("locationType", ["center", "external"]).default("center"), // مكان الخدمة
  doctorId: varchar("doctorId", { length: 36 }),
  doctorCode: varchar("doctorCode", { length: 64 }),
  serviceCode: varchar("serviceCode", { length: 64 }),
  lastVisit: date("lastVisit"), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©/ط§ظ„ظ…طھط§ط¨ط¹ط©
  receptionSignature: varchar("receptionSignature", { length: 255 }), // توقيع الاستقبال الأخير
  status: mysqlEnum("status", ["new", "followup", "archived"]).default("new"), // ط­ط§ظ„ط© ط§ظ„ظ…ط±ظٹط¶
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

export const patientImportStaging = mysqlTable("patient_import_staging", {
  id: int("id").autoincrement().primaryKey(),
  batchId: varchar("batchId", { length: 64 }).notNull(),
  rowNumber: int("rowNumber").notNull(),
  patientCode: varchar("patientCode", { length: 50 }),
  fullName: varchar("fullName", { length: 255 }),
  dateOfBirthRaw: varchar("dateOfBirthRaw", { length: 64 }),
  dateOfBirth: date("dateOfBirth"),
  gender: mysqlEnum("gender", ["male", "female"]),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  branch: mysqlEnum("branch", ["examinations", "surgery"]).default("examinations"),
  serviceType: mysqlEnum("serviceType", ["consultant", "specialist", "lasik", "surgery", "external"]),
  locationType: mysqlEnum("locationType", ["center", "external"]),
  doctorCode: varchar("doctorCode", { length: 64 }),
  doctorId: int("doctorId"),
  status: mysqlEnum("status", ["pending", "valid", "invalid", "applied"]).default("pending").notNull(),
  errors: text("errors"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatientImportStaging = typeof patientImportStaging.$inferSelect;
export type InsertPatientImportStaging = typeof patientImportStaging.$inferInsert;

export const stockItems = mysqlTable("stock_items", {
  id: int("id").autoincrement().primaryKey(),
  itemCode: varchar("itemCode", { length: 100 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }),
  quantity: int("quantity").default(0).notNull(),
  status: mysqlEnum("status", ["متوفر", "كمية قليلة", "نفذ المخزون"]).default("متوفر").notNull(),
  expiryDate: date("expiryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockItem = typeof stockItems.$inferSelect;
export type InsertStockItem = typeof stockItems.$inferInsert;

export const stockTransactions = mysqlTable("stock_transactions", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  type: mysqlEnum("type", ["add", "dispense"]).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  totalValue: decimal("totalValue", { precision: 10, scale: 2 }),
  employeeName: varchar("employeeName", { length: 255 }),
  performedBy: varchar("performedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InsertStockTransaction = typeof stockTransactions.$inferInsert;

export const attendanceShifts = mysqlTable("attendance_shifts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  crossesMidnight: boolean("crosses_midnight").default(false).notNull(),
  graceLateMin: int("grace_late_min").default(0).notNull(),
  graceEarlyMin: int("grace_early_min").default(0).notNull(),
  allowOT: boolean("allow_ot").default(false).notNull(),
  breakMinutes: int("break_minutes").default(0).notNull(),
  weekdayMask: int("weekday_mask").default(62).notNull(), // bits 0-6 Sun-Sat; 62=Mon-Fri
  requirePunch: boolean("require_punch").default(true).notNull(), // false = auto-present if shift assigned
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxActive: index("idx_active").on(table.active),
}));

export const employeeAttendanceMapping = mysqlTable("employee_attendance_mapping", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  machineUserId: varchar("machineUserId", { length: 50 }).notNull().unique(),
  shiftId: int("shiftId"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const attendanceLogs = mysqlTable("attendance_logs", {
  id: int("id").autoincrement().primaryKey(),
  machineUserId: varchar("machineUserId", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  type: mysqlEnum("type", ["check_in", "check_out", "unknown"]).default("check_in"),
  machineName: varchar("machineName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type InsertAttendanceLog = typeof attendanceLogs.$inferInsert;

/**
 * Appointments table - ط¬ط¯ظˆظ„ ط§ظ„ظ…ظˆط§ط¹ظٹط¯
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"), // ط§ظ„ط·ط¨ظٹط¨ ط§ظ„ظ…ط¹ظٹظ†
  appointmentDate: timestamp("appointmentDate").notNull(), // طھط§ط±ظٹط® ظˆظˆظ‚طھ ط§ظ„ظ…ظˆط¹ط¯
  appointmentType: mysqlEnum("appointmentType", ["examination", "surgery", "followup"]).notNull(), // ظ†ظˆط¹ ط§ظ„ظ…ظˆط¹ط¯
  branch: mysqlEnum("branch", ["examinations", "surgery"]).notNull(), // ط§ظ„ظپط±ط¹
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"), // ط­ط§ظ„ط© ط§ظ„ظ…ظˆط¹ط¯
  notes: text("notes"), // ظ…ظ„ط§ط­ط¸ط§طھ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Visits table - ط¬ط¯ظˆظ„ ط§ظ„ط²ظٹط§ط±ط§طھ/ط§ظ„ظƒط´ظˆظپط§طھ
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  appointmentId: int("appointmentId"), // ط§ظ„ظ…ظˆط¹ط¯ ط§ظ„ظ…ط±طھط¨ط·
  visitDate: timestamp("visitDate").defaultNow().notNull(), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©
  visitType: mysqlEnum("visitType", ["consultation", "examination", "surgery", "followup"]).notNull(), // ظ†ظˆط¹ ط§ظ„ط²ظٹط§ط±ط©
  chiefComplaint: text("chiefComplaint"), // ط§ظ„ط´ظƒظˆظ‰ ط§ظ„ط±ط¦ظٹط³ظٹط©
  branch: mysqlEnum("branch", ["examinations", "surgery"]).notNull(), // ط§ظ„ظپط±ط¹
  receptionSignature: varchar("receptionSignature", { length: 255 }), // توقيع الاستقبال / ENTEREDBY
  queueStatus: mysqlEnum("queueStatus", ["checkedIn", "next", "clinic", "treated"]).default("checkedIn"),
  checkedInAt: timestamp("checkedInAt"),
  movedToNextAt: timestamp("movedToNextAt"),
  movedToClinicAt: timestamp("movedToClinicAt"),
  treatedAt: timestamp("treatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * Examinations table - ط¬ط¯ظˆظ„ ط§ظ„ظپط­ظˆطµط§طھ
 */
export const examinations = mysqlTable("examinations", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  patientId: int("patientId").notNull(),
  
  // Uncorrected Vision (UCVA) - ط­ط¯ط© ط§ظ„ط¥ط¨طµط§ط± ط¨ط¯ظˆظ† طھطµط­ظٹط­
  ucvaOD: varchar("ucvaOD", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
  ucvaOS: varchar("ucvaOS", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
  
  // Best Corrected Visual Acuity (BCVA) - ط£ظپط¶ظ„ ط­ط¯ط© ط¥ط¨طµط§ط± ظ…طµط­ط­ط©
  bcvaOD: varchar("bcvaOD", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
  bcvaOS: varchar("bcvaOS", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
  
  // Refraction - ط§ظ„ط§ظ†ظƒط³ط§ط±
  sphereOD: varchar("sphereOD", { length: 20 }), // ط§ظ„ظƒط±ط©
  sphereOS: varchar("sphereOS", { length: 20 }),
  cylinderOD: varchar("cylinderOD", { length: 20 }), // ط§ظ„ط£ط³ط·ظˆط§ظ†ط©
  cylinderOS: varchar("cylinderOS", { length: 20 }),
  axisOD: varchar("axisOD", { length: 20 }), // ط§ظ„ظ…ط­ظˆط±
  axisOS: varchar("axisOS", { length: 20 }),

  // Glasses Prescription - طµูŠغ„ط© ط§ظ„ظ†ظ„ط§ط¶ط©
  glassesData: text("glassesData"), // JSON: {od: {s, c, axis, pd, bcva}, os: {s, c, axis, pd, bcva}}

  // Intraocular Pressure (IOP) - ط¶ط؛ط· ط§ظ„ط¹ظٹظ†
  iopOD: varchar("iopOD", { length: 20 }), // ط§ظ„ط¶ط؛ط· ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
  iopOS: varchar("iopOS", { length: 20 }), // ط§ظ„ط¶ط؛ط· ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
  
  // Anterior Segment - ط§ظ„ظ…ظ‚ط¯ظ…ط©
  anteriorSegmentOD: text("anteriorSegmentOD"),
  anteriorSegmentOS: text("anteriorSegmentOS"),

  // Posterior Segment - ط§ظ„ظ…ط¤ط®ط±ط©
  posteriorSegmentOD: text("posteriorSegmentOD"),
  posteriorSegmentOS: text("posteriorSegmentOS"),

  // Radiology & Labs - تحاليل و إشاعات
  radiologyLabsNotes: text("radiologyLabsNotes"),
  
  // Air Puff - ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظˆط§ط،
  airPuffOD: varchar("airPuffOD", { length: 20 }),
  airPuffOS: varchar("airPuffOS", { length: 20 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Examination = typeof examinations.$inferSelect;
export type InsertExamination = typeof examinations.$inferInsert;

/**
 * Autorefractometry Data table - بيانات جهاز قياس الانكسار الآلي
 * Separate table for autorefraction to avoid overwriting when saving other data
 */
export const autorefractometryData = mysqlTable("autorefractometryData", {
  id: int("id").autoincrement().primaryKey(),
  examinationId: int("examinationId").notNull().references(() => examinations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull(),

  // Right Eye (OD)
  sphereOD: varchar("sphereOD", { length: 20 }),
  cylinderOD: varchar("cylinderOD", { length: 20 }),
  axisOD: varchar("axisOD", { length: 20 }),
  ucvaOD: varchar("ucvaOD", { length: 20 }),
  bcvaOD: varchar("bcvaOD", { length: 20 }),
  iopOD: varchar("iopOD", { length: 20 }),

  // Left Eye (OS)
  sphereOS: varchar("sphereOS", { length: 20 }),
  cylinderOS: varchar("cylinderOS", { length: 20 }),
  axisOS: varchar("axisOS", { length: 20 }),
  ucvaOS: varchar("ucvaOS", { length: 20 }),
  bcvaOS: varchar("bcvaOS", { length: 20 }),
  iopOS: varchar("iopOS", { length: 20 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutorefractometryData = typeof autorefractometryData.$inferSelect;
export type InsertAutorefractometryData = typeof autorefractometryData.$inferInsert;

/**
 * After Refraction Data table - بيانات AFTER (منفصلة عن Autoref)
 */
export const afterRefractionData = mysqlTable("afterRefractionData", {
  id: int("id").autoincrement().primaryKey(),
  examinationId: int("examinationId").notNull().references(() => examinations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull(),
  sphereOD: varchar("sphereOD", { length: 20 }),
  cylinderOD: varchar("cylinderOD", { length: 20 }),
  axisOD: varchar("axisOD", { length: 20 }),
  sphereOS: varchar("sphereOS", { length: 20 }),
  cylinderOS: varchar("cylinderOS", { length: 20 }),
  axisOS: varchar("axisOS", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AfterRefractionData = typeof afterRefractionData.$inferSelect;
export type InsertAfterRefractionData = typeof afterRefractionData.$inferInsert;

/**
 * Glasses Prescription Data table - بيانات وصفة النظارة
 * Separate table for glasses prescription to avoid overwriting when saving other data
 */
export const glassesRecords = mysqlTable("glassesRecords", {
  id: int("id").autoincrement().primaryKey(),
  examinationId: int("examinationId").notNull().references(() => examinations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull(),

  // Right Eye (OD)
  sOD: varchar("sOD", { length: 20 }),
  cOD: varchar("cOD", { length: 20 }),
  axisOD: varchar("axisOD", { length: 20 }),
  pdOD: varchar("pdOD", { length: 20 }),
  addOD: varchar("addOD", { length: 20 }),
  bcvaOD: varchar("bcvaOD", { length: 20 }),

  // Left Eye (OS)
  sOS: varchar("sOS", { length: 20 }),
  cOS: varchar("cOS", { length: 20 }),
  axisOS: varchar("axisOS", { length: 20 }),
  pdOS: varchar("pdOS", { length: 20 }),
  addOS: varchar("addOS", { length: 20 }),
  bcvaOS: varchar("bcvaOS", { length: 20 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlassesRecord = typeof glassesRecords.$inferSelect;
export type InsertGlassesRecord = typeof glassesRecords.$inferInsert;

/**
 * Pentacam Results table - ظ†طھط§ط¦ط¬ ط§ظ„ط¨ظ†طھط§ظƒط§ظ…
 */
export const pentacamResults = mysqlTable("pentacamResults", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  patientId: int("patientId").notNull(),
  recordedBy: int("recordedBy"), // ط§ظ„ظپظ†ظٹ ط§ظ„ط°ظٹ ط³ط¬ظ„ ط§ظ„ظ†طھط§ط¦ط¬

  // Pachymetry - ط§ظ„ظ…ط­ط§ط°اة (corneal thickness)
  pachymetryOD: varchar("pachymetryOD", { length: 20 }), // ط³ظ…ظƒ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹظ…ظ†ظ‰
  pachymetryOS: varchar("pachymetryOS", { length: 20 }), // ط³ظ…ظƒ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹط³ط±ظ‰

  // Keratometry - ظ‚ياس ط§ظ„ظ‚ط±ظ†ظٹط© (corneal curvature - K readings)
  k1OD: varchar("k1OD", { length: 20 }), // K1 right eye
  k2OD: varchar("k2OD", { length: 20 }), // K2 right eye
  axisOD: varchar("axisOD", { length: 20 }), // Axis right eye
  thinnestPointOD: varchar("thinnestPointOD", { length: 20 }), // Thinnest point right eye
  apexOD: varchar("apexOD", { length: 20 }), // Apex right eye
  residualOD: varchar("residualOD", { length: 20 }), // Residual right eye
  tttOD: varchar("tttOD", { length: 20 }), // TTT right eye
  ablationOD: varchar("ablationOD", { length: 20 }), // Ablation right eye

  k1OS: varchar("k1OS", { length: 20 }), // K1 left eye
  k2OS: varchar("k2OS", { length: 20 }), // K2 left eye
  axisOS: varchar("axisOS", { length: 20 }), // Axis left eye
  thinnestPointOS: varchar("thinnestPointOS", { length: 20 }), // Thinnest point left eye
  apexOS: varchar("apexOS", { length: 20 }), // Apex left eye
  residualOS: varchar("residualOS", { length: 20 }), // Residual left eye
  tttOS: varchar("tttOS", { length: 20 }), // TTT left eye
  ablationOS: varchar("ablationOS", { length: 20 }), // Ablation left eye

  // Legacy keratometry field (may contain JSON or combined values)
  keratometryOD: varchar("keratometryOD", { length: 50 }), // ظ‚ظٹط§ط³ طھط­ط¯ط¨ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹظ…ظ†ظ‰
  keratometryOS: varchar("keratometryOS", { length: 50 }), // ظ‚ظٹط§ط³ طھط­ط¯ط¨ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹط³ط±ظ‰

  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PentacamResult = typeof pentacamResults.$inferSelect;
export type InsertPentacamResult = typeof pentacamResults.$inferInsert;

/**
 * Doctor Reports table - طھظ‚ط§ط±ظٹط± ط§ظ„ط·ط¨ظٹط¨
 */
export const doctorReports = mysqlTable("doctorReports", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"), // ط§ظ„ط·ط¨ظٹط¨
  diagnosis: text("diagnosis"), // ط§ظ„طھط´ط®ظٹطµ
  diseases: text("diseases"), // JSON array of diseases
  treatment: text("treatment"), // ط§ظ„ط¹ظ„ط§ط¬
  recommendations: text("recommendations"), // ط§ظ„طھظˆطµظٹط§طھ
  visitDate: date("visitDate"), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©
  operationType: varchar("operationType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ط¹ظ…ظ„ظٹط©
  clinicalOpinion: text("clinicalOpinion"),
  additionalNotes: text("additionalNotes"),
  followUpDate: timestamp("followUpDate"), // طھط§ط±ظٹط® ط§ظ„ظ…طھط§ط¨ط¹ط©
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DoctorReport = typeof doctorReports.$inferSelect;
export type InsertDoctorReport = typeof doctorReports.$inferInsert;

/**
 * Prescriptions table - ط§ظ„ط±ظˆط´ط§طھ
 */
export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId"),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId"), // ط§ظ„ط·ط¨ظٹط¨
  prescriptionDate: timestamp("prescriptionDate").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

/**
 * Prescription Items table - ط¨ظ†ظˆط¯ ط§ظ„ط±ظˆط´ط©
 */
export const prescriptionItems = mysqlTable("prescriptionItems", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionId: int("prescriptionId").notNull(),
  medicationId: int("medicationId").notNull(),
  dosage: varchar("dosage", { length: 100 }), // ط§ظ„ط¬ط±ط¹ط©
  frequency: varchar("frequency", { length: 100 }), // ط§ظ„طھظƒط±ط§ط±
  duration: varchar("duration", { length: 100 }), // ط§ظ„ظ…ط¯ط©
  instructions: text("instructions"), // ط§ظ„طھط¹ظ„ظٹظ…ط§طھ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type InsertPrescriptionItem = typeof prescriptionItems.$inferInsert;

/**
 * Diseases table - ط§ظ„ط£ظ…ط±ط§ط¶
 */
export const diseases = mysqlTable("diseases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  branch: varchar("branch", { length: 100 }),
  abbrev: varchar("abbrev", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Disease = typeof diseases.$inferSelect;
export type InsertDisease = typeof diseases.$inferInsert;

/**
 * User Page States - UI state per user/page
 */
export const userPageStates = mysqlTable("userPageStates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  page: varchar("page", { length: 128 }).notNull(),
  data: json("data"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPageState = typeof userPageStates.$inferSelect;
export type InsertUserPageState = typeof userPageStates.$inferInsert;

export const pushDeviceRegistrations = mysqlTable("push_device_registrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["fcm"]).default("fcm").notNull(),
  platform: mysqlEnum("platform", ["android", "ios", "web"]).notNull(),
  token: varchar("token", { length: 2048 }).notNull(),
  deviceId: varchar("deviceId", { length: 191 }),
  appVersion: varchar("appVersion", { length: 64 }),
  build: varchar("build", { length: 64 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  disabledAt: timestamp("disabledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userDeviceIdx: index("idx_push_device_user_device").on(table.userId, table.deviceId),
  activeByUserIdx: index("idx_push_device_active_user").on(table.userId, table.disabledAt, table.lastSeenAt),
}));

export type PushDeviceRegistration = typeof pushDeviceRegistrations.$inferSelect;
export type InsertPushDeviceRegistration = typeof pushDeviceRegistrations.$inferInsert;

/**
 * Patient Page States - UI state per patient/page
 */
export const patientPageStates = mysqlTable("patientPageStates", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  page: varchar("page", { length: 128 }).notNull(),
  data: json("data"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientPageIdx: index("idx_patient_page_updated").on(table.patientId, table.page, table.updatedAt),
}));

export type PatientPageState = typeof patientPageStates.$inferSelect;
export type InsertPatientPageState = typeof patientPageStates.$inferInsert;

/**
 * Patient Service Entries - service-level transactions per patient (can repeat by patient code)
 */
export const patientServiceEntries = mysqlTable("patientServiceEntries", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  serviceCode: varchar("serviceCode", { length: 64 }).notNull(),
  serviceName: varchar("serviceName", { length: 255 }),
  source: mysqlEnum("source", ["mssql", "manual", "import"]).default("mssql").notNull(),
  sourceRef: varchar("sourceRef", { length: 128 }).notNull().unique(),
  serviceDate: date("serviceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientServiceDateIdx: index("idx_patient_service_date").on(table.patientId, table.serviceCode, table.serviceDate),
  sourceUpdatedIdx: index("idx_service_source_updated").on(table.source, table.updatedAt),
}));

export type PatientServiceEntry = typeof patientServiceEntries.$inferSelect;
export type InsertPatientServiceEntry = typeof patientServiceEntries.$inferInsert;

/**
 * Surgeries table - ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„ط¬ط±ط§ط­ظٹط©
 */
export const surgeries = mysqlTable("surgeries", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  surgeryType: varchar("surgeryType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ط¹ظ…ظ„ظٹط©
  surgeryDate: timestamp("surgeryDate").notNull(), // طھط§ط±ظٹط® ط§ظ„ط¹ظ…ظ„ظٹط©
  surgeon: varchar("surgeon", { length: 255 }), // ط§ظ„ط¬ط±ط§ط­
  notes: text("notes"), // ظ…ظ„ط§ط­ط¸ط§طھ
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled"),
  branch: mysqlEnum("branch", ["examinations", "surgery"]).default("surgery"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Surgery = typeof surgeries.$inferSelect;
export type InsertSurgery = typeof surgeries.$inferInsert;

/**
 * Post-Op Followups table - ظ…طھط§ط¨ط¹ط© ظ…ط§ ط¨ط¹ط¯ ط§ظ„ط¹ظ…ظ„ظٹط©
 */
export const postOpFollowups = mysqlTable("postOpFollowups", {
  id: int("id").autoincrement().primaryKey(),
  surgeryId: int("surgeryId").notNull(),
  patientId: int("patientId").notNull(),
  followupDate: timestamp("followupDate").notNull(),
  findings: text("findings"), // ط§ظ„ظ†طھط§ط¦ط¬
  recommendations: text("recommendations"), // ط§ظ„طھظˆطµظٹط§طھ
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PostOpFollowup = typeof postOpFollowups.$inferSelect;
export type InsertPostOpFollowup = typeof postOpFollowups.$inferInsert;

/**
 * Consent Forms table - ظ†ظ…ط§ط°ط¬ ط§ظ„ط¥ظ‚ط±ط§ط±
 */
export const consentForms = mysqlTable("consentForms", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  formType: varchar("formType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ظ†ظ…ظˆط°ط¬
  signedDate: timestamp("signedDate").notNull(),
  content: text("content"), // ظ…ط­طھظˆظ‰ ط§ظ„ظ†ظ…ظˆط°ط¬
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsentForm = typeof consentForms.$inferSelect;
export type InsertConsentForm = typeof consentForms.$inferInsert;

/**
 * Medical History Checklist table - ظ‚ط§ط¦ظ…ط© ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط±ط¶ظٹ
 */
export const medicalHistoryChecklist = mysqlTable("medicalHistoryChecklist", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  diabetes: boolean("diabetes").default(false),
  hypertension: boolean("hypertension").default(false),
  heartDisease: boolean("heartDisease").default(false),
  asthma: boolean("asthma").default(false),
  allergies: boolean("allergies").default(false),
  previousSurgeries: text("previousSurgeries"),
  medications: text("medications"),
  familyHistory: text("familyHistory"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicalHistoryChecklist = typeof medicalHistoryChecklist.$inferSelect;
export type InsertMedicalHistoryChecklist = typeof medicalHistoryChecklist.$inferInsert;

/**
 * Examination Checklist Items - checklist per examination (normalized)
 */
export const examinationChecklistItems = mysqlTable("examination_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  examinationId: int("examinationId").notNull().references(() => examinations.id, { onDelete: "cascade" }),
  patientId: int("patientId").notNull(),
  generalDiseases: boolean("generalDiseases").default(false),
  pregnancyOrLactation: boolean("pregnancyOrLactation").default(false),
  usesAllergySupplementsSteroidsOrPressureMeds: boolean("usesAllergySupplementsSteroidsOrPressureMeds").default(false),
  acneTreatment: boolean("acneTreatment").default(false),
  familyKeratoconus: boolean("familyKeratoconus").default(false),
  usesTearSubstituteOrExcessTearsOrSandySensation: boolean("usesTearSubstituteOrExcessTearsOrSandySensation").default(false),
  symptomsWorseWithAirOrAC: boolean("symptomsWorseWithAirOrAC").default(false),
  glaucomaTreatment: boolean("glaucomaTreatment").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  examChecklistUniqueIdx: uniqueIndex("ux_exam_checklist").on(table.examinationId),
}));

export type ExaminationChecklistItem = typeof examinationChecklistItems.$inferSelect;
export type InsertExaminationChecklistItem = typeof examinationChecklistItems.$inferInsert;

/**
 * Audit Logs table - ط³ط¬ظ„ ط§ظ„طھط¯ظ‚ظٹظ‚
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId"),
  action: varchar("action", { length: 255 }),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  changes: text("changes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Alias for auditLog
 */
export const auditLogs = auditLog;

/**
 * Medications table - ط§ظ„ط£ط¯ظˆظٹط©
 */
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["tablet", "drops", "ointment", "injection", "suspension", "other"]).notNull(),
  activeIngredient: varchar("activeIngredient", { length: 255 }),
  strength: varchar("strength", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  dosage: varchar("dosage", { length: 100 }),
  description: text("description"),
  /** Optional stock count for pharmacy-style dashboards */
  stockPieces: int("stockPieces"),
  /** Row-level inventory posture; if null UI derives from stockPieces */
  inventoryStatus: mysqlEnum("inventoryStatus", ["available", "out_of_stock", "reserved"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

/**
 * Tests table - ط§ظ„ظپط­ظˆطµط§طھ ظˆط§ظ„طھط­ط§ظ„ظٹظ„
 */
export const tests = mysqlTable("tests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["examination", "lab", "imaging", "other"]).notNull(),
  category: varchar("category", { length: 255 }),
  normalRange: varchar("normalRange", { length: 255 }),
  unit: varchar("unit", { length: 64 }),
  description: text("description"),
  priceEgp: varchar("priceEgp", { length: 32 }),
  durationMinutes: int("durationMinutes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const testFavorites = mysqlTable("testFavorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  testId: int("testId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Test = typeof tests.$inferSelect;
export type InsertTest = typeof tests.$inferInsert;

/**
 * Test Requests table - ط·ظ„ط¨ط§طھ ط§ظ„ظپط­ظˆطµط§طھ
 */
export const testRequests = mysqlTable("testRequests", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  visitId: int("visitId"),
  requestDate: timestamp("requestDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestRequest = typeof testRequests.$inferSelect;
export type InsertTestRequest = typeof testRequests.$inferInsert;

/**
 * Test Request Items table - ط¨ظ†ظˆط¯ ط·ظ„ط¨ ط§ظ„ظپط­ظˆطµط§طھ
 */
export const testRequestItems = mysqlTable("testRequestItems", {
  id: int("id").autoincrement().primaryKey(),
  testRequestId: int("testRequestId").notNull(),
  testId: int("testId").notNull(),
  result: text("result"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TestRequestItem = typeof testRequestItems.$inferSelect;
export type InsertTestRequestItem = typeof testRequestItems.$inferInsert;

/**
 * System Settings table - ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ†ط¸ط§ظ…
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * User permissions table
 */
export const userPermissions = mysqlTable("user_permissions", {
  userId: int("userId").notNull(),
  pageId: varchar("pageId", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.pageId] }),
}));

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * Sheet entries table
 */
export const sheetEntries = mysqlTable("sheet_entries", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  sheetType: mysqlEnum("sheetType", ["consultant", "specialist", "lasik", "external"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SheetEntry = typeof sheetEntries.$inferSelect;
export type InsertSheetEntry = typeof sheetEntries.$inferInsert;

/**
 * Operation lists table
 */
export const operationLists = mysqlTable("operationLists", {
  id: int("id").autoincrement().primaryKey(),
  doctorTab: varchar("doctorTab", { length: 100 }).notNull(),
  listDate: date("listDate").notNull(),
  operationType: varchar("operationType", { length: 50 }),
  doctorName: varchar("doctorName", { length: 255 }),
  listTime: varchar("listTime", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationList = typeof operationLists.$inferSelect;
export type InsertOperationList = typeof operationLists.$inferInsert;

/**
 * Operation list items table
 */
export const operationListItems = mysqlTable("operationListItems", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("listId").notNull(),
  number: varchar("number", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  doctor: varchar("doctor", { length: 255 }),
  operation: varchar("operation", { length: 255 }),
  eye: varchar("eye", { length: 50 }),
  center: boolean("center").default(false).notNull(),
  payment: varchar("payment", { length: 255 }),
  hospital: varchar("hospital", { length: 255 }),
  code: varchar("code", { length: 50 }),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  listNumberIdx: index("idx_operation_list_number").on(table.listId, table.number),
}));

export type OperationListItem = typeof operationListItems.$inferSelect;
export type InsertOperationListItem = typeof operationListItems.$inferInsert;

export const operationBookings = mysqlTable(
  "operationBookings",
  {
    id: int("id").autoincrement().primaryKey(),
    bookingDate: date("bookingDate").notNull(),
    weekdayLabel: varchar("weekdayLabel", { length: 80 }),
    bookingTime: varchar("bookingTime", { length: 20 }).notNull(),
    doctorName: varchar("doctorName", { length: 255 }).notNull(),
    operationType: varchar("operationType", { length: 100 }).notNull(),
    casesCount: int("casesCount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("idx_operation_booking_date").on(t.bookingDate)],
);

export type OperationBooking = typeof operationBookings.$inferSelect;
export type InsertOperationBooking = typeof operationBookings.$inferInsert;

export const services = mysqlTable("services", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }),
  serviceType: varchar("serviceType", { length: 64 }).notNull(),
  srvTyp: varchar("srvTyp", { length: 4 }),
  defaultSheet: varchar("defaultSheet", { length: 64 }),
  locationType: varchar("locationType", { length: 32 }).default("center"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Followup Sheets table - أوراق المتابعة
 * Stores each group of 4 followup tables as a separate sheet with version number
 */
export const followupSheets = mysqlTable("followupSheets", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  sheetType: mysqlEnum("sheetType", ["consultant", "specialist", "lasik", "external"]).notNull(), // نوع الشيت
  version: int("version").notNull().default(1), // رقم النسخة (شيت 1، شيت 2، إلخ)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientSheetTypeIdx: index("idx_followup_patient_type").on(table.patientId, table.sheetType),
}));

export type FollowupSheet = typeof followupSheets.$inferSelect;
export type InsertFollowupSheet = typeof followupSheets.$inferInsert;

/**
 * Followup Items table - بيانات كل جدول متابعة (4 جداول في كل شيت)
 */
export const followupItems = mysqlTable("followupItems", {
  id: int("id").autoincrement().primaryKey(),
  followupSheetId: int("followupSheetId").notNull(), // الرابط إلى followup_sheets
  tableIndex: int("tableIndex").notNull(), // رقم الجدول (0-3 في كل شيت)
  followupDate: timestamp("followupDate"), // تاريخ المتابعة
  followupName: varchar("followupName", { length: 255 }), // اسم المتابعة (المتابعة الأولى، إلخ)

  // Visual Acuity (VA) - حدة الإبصار
  vaOD: varchar("vaOD", { length: 50 }), // العين اليمنى
  vaOS: varchar("vaOS", { length: 50 }), // العين اليسرى

  // Refraction - الانكسار
  refracOD: text("refracOD"), // JSON: {s, c, a}
  refracOS: text("refracOS"),

  // Flap (for LASIK) - السدفة
  flapOD: text("flapOD"), // JSON: {edges, bed}
  flapOS: text("flapOS"),

  // IOP - ضغط العين
  iopOD: varchar("iopOD", { length: 50 }),
  iopOS: varchar("iopOS", { length: 50 }),

  // Treatment - العلاج
  treatment: text("treatment"),

  // Notes - ملاحظات
  notes: text("notes"),

  // Metadata for consultant followups
  rightEye: boolean("rightEye").default(false), // هل يتم الفحص على العين اليمنى
  leftEye: boolean("leftEye").default(false), // هل يتم الفحص على العين اليسرى

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sheetTableIdx: index("idx_followup_sheet_table").on(table.followupSheetId, table.tableIndex),
}));

export type FollowupItem = typeof followupItems.$inferSelect;
export type InsertFollowupItem = typeof followupItems.$inferInsert;

/**
 * طلبات تحديد موعد / كشف (استقبال) — بيانات حرة دون ربط إلزامي بسجل مريض
 */
export const visitScheduleRequests = mysqlTable("visit_schedule_requests", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  age: int("age"),
  visitDate: date("visitDate").notNull(),
  phone: varchar("phone", { length: 32 }),
  service: varchar("service", { length: 128 }).notNull(),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  visitDateIdx: index("idx_visit_schedule_requests_visitDate").on(table.visitDate),
}));

export type VisitScheduleRequest = typeof visitScheduleRequests.$inferSelect;
export type InsertVisitScheduleRequest = typeof visitScheduleRequests.$inferInsert;

// ============ ACCESS DB SYNC TABLES ============

export const accLedger = mysqlTable("accLedger", {
  id: int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }),
  balance: decimal("balance", { precision: 15, scale: 2 }),
  income: decimal("income", { precision: 15, scale: 2 }),
  expense: decimal("expense", { precision: 15, scale: 2 }),
  txDate: date("txDate").notNull(),
  notes: varchar("notes", { length: 500 }),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: index("accLedger_accessId").on(t.accessId) }));

export const accAdvances = mysqlTable("accAdvances", {
  id: int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  txDate: date("txDate").notNull(),
  advance: decimal("advance", { precision: 15, scale: 2 }),
  repayment: decimal("repayment", { precision: 15, scale: 2 }),
  notes: varchar("notes", { length: 500 }),
  employee: varchar("employee", { length: 200 }),
  total: decimal("total", { precision: 15, scale: 2 }),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: index("accAdvances_accessId").on(t.accessId) }));

export const accLoans = mysqlTable("accLoans", {
  id: int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  name: varchar("name", { length: 200 }),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  repayment: decimal("repayment", { precision: 15, scale: 2 }),
  remaining: decimal("remaining", { precision: 15, scale: 2 }),
  total: decimal("total", { precision: 15, scale: 2 }),
  txDate: date("txDate").notNull(),
  notes: text("notes"),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: index("accLoans_accessId").on(t.accessId) }));

export const accHome = mysqlTable("accHome", {
  id: int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  txDate: date("txDate").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }),
  balance: decimal("balance", { precision: 15, scale: 2 }),
  inAmount: decimal("inAmount", { precision: 15, scale: 2 }),
  outAmount: decimal("outAmount", { precision: 15, scale: 2 }),
  notes: varchar("notes", { length: 500 }),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: index("accHome_accessId").on(t.accessId) }));

export const accInstapay = mysqlTable("accInstapay", {
  id: int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  txDate: date("txDate").notNull(),
  total: decimal("total", { precision: 15, scale: 2 }),
  balance: decimal("balance", { precision: 15, scale: 2 }),
  inAmount: decimal("inAmount", { precision: 15, scale: 2 }),
  outAmount: decimal("outAmount", { precision: 15, scale: 2 }),
  notes: varchar("notes", { length: 500 }),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: index("accInstapay_accessId").on(t.accessId) }));

export const accEmployees = mysqlTable("accEmployees", {
  id:       int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  name:     varchar("name", { length: 200 }).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("accEmployees_accessId").on(t.accessId) }));

export const accCategories = mysqlTable("accCategories", {
  id:       int("id").autoincrement().primaryKey(),
  accessId: int("accessId").notNull(),
  name:     varchar("name", { length: 200 }),
  entity:   varchar("entity", { length: 200 }),
  isPaid:   boolean("isPaid").default(false),
  syncedAt: timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("accCategories_accessId").on(t.accessId) }));

export const accSaadany = mysqlTable("accSaadany", {
  id:          int("id").autoincrement().primaryKey(),
  accessId:    int("accessId").notNull(),
  txDate:      date("txDate").notNull(),
  withdrawals: decimal("withdrawals", { precision: 15, scale: 2 }),
  repayment:   decimal("repayment",   { precision: 15, scale: 2 }),
  notes:       varchar("notes", { length: 500 }),
  total:       decimal("total",       { precision: 15, scale: 2 }),
  syncedAt:    timestamp("syncedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({ uniq: uniqueIndex("accSaadany_accessId").on(t.accessId) }));

/**
 * Doctors lookup table (synced from MSSQL via code)
 */
export const doctorsLookup = mysqlTable("doctors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 64 }),
  name: varchar("name", { length: 255 }),
  isActive: int("isActive").default(1),
  locationType: varchar("locationType", { length: 32 }).default("center"),
  doctorType: varchar("doctorType", { length: 32 }).default("consultant"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/**
 * Attendance Module — Phase 1
 * Fully isolated from Medical and Accounting modules
 */

export const attendanceEmployees = mysqlTable("attendance_employees", {
  empCd: varchar("emp_cd", { length: 32 }).primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 128 }),
  salaryType: varchar("salary_type", { length: 32 }),
  attendanceCommissionRate: decimal("attendance_commission_rate", { precision: 5, scale: 4 }),
  defaultShiftId: int("default_shift_id"),
  active: boolean("active").default(true).notNull(),
  commAttendance: boolean("comm_attendance").default(true).notNull(),
  commExam: boolean("comm_exam").default(true).notNull(),
  commPentacam: boolean("comm_pentacam").default(true).notNull(),
  sourceHash: varchar("source_hash", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxActive: index("idx_active").on(table.active),
  idxDept: index("idx_dept").on(table.department),
}));

export type AttendanceEmployee = typeof attendanceEmployees.$inferSelect;
export type InsertAttendanceEmployee = typeof attendanceEmployees.$inferInsert;

export const attendancePunches = mysqlTable("attendance_punches", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  punchAt: timestamp("punch_at").notNull(),
  direction: mysqlEnum("direction", ["in", "out", "unknown"]).default("unknown").notNull(),
  deviceId: varchar("device_id", { length: 64 }),
  source: mysqlEnum("source", ["access", "tcp", "manual"]).notNull(),
  sourceRowId: varchar("source_row_id", { length: 64 }),
  sourceHash: varchar("source_hash", { length: 40 }).notNull(),
  note: varchar("note", { length: 255 }),
  insertedBy: int("inserted_by"),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
}, (table) => ({
  uqPunch: uniqueIndex("uq_punch").on(table.empCd, table.punchAt, table.sourceRowId),
  idxEmpTime: index("idx_emp_time").on(table.empCd, table.punchAt),
  idxPunchAt: index("idx_punch_at").on(table.punchAt),
  idxSource: index("idx_source").on(table.source),
}));

export type AttendancePunch = typeof attendancePunches.$inferSelect;
export type InsertAttendancePunch = typeof attendancePunches.$inferInsert;

export const attendanceShiftAssignments = mysqlTable("attendance_shift_assignments", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  shiftId: int("shift_id").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  weekdayMask: int("weekday_mask").default(127).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxEmpFrom: index("idx_emp_from").on(table.empCd, table.effectiveFrom),
}));

export type AttendanceShiftAssignment = typeof attendanceShiftAssignments.$inferSelect;
export type InsertAttendanceShiftAssignment = typeof attendanceShiftAssignments.$inferInsert;

// ── Shift Cycles ──────────────────────────────────────────────────────────────
export const attendanceShiftCycles = mysqlTable("attendance_shift_cycles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  period: mysqlEnum("period", ["day", "week", "month"]).notNull(),
  anchorDate: date("anchor_date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const attendanceShiftCycleSlots = mysqlTable("attendance_shift_cycle_slots", {
  id: int("id").autoincrement().primaryKey(),
  cycleId: int("cycle_id").notNull(),
  slotIndex: int("slot_index").notNull(),
  shiftId: int("shift_id").notNull(),
}, (table) => ({
  uqCycleSlot: uniqueIndex("uq_cycle_slot").on(table.cycleId, table.slotIndex),
  idxCycle: index("idx_cycle_id").on(table.cycleId),
}));

export const attendanceShiftCycleAssignments = mysqlTable("attendance_shift_cycle_assignments", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  cycleId: int("cycle_id").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  idxCycleEmpFrom: index("idx_cycle_emp_from").on(table.empCd, table.effectiveFrom),
}));

export type AttendanceShiftCycle = typeof attendanceShiftCycles.$inferSelect;
export type AttendanceShiftCycleSlot = typeof attendanceShiftCycleSlots.$inferSelect;
export type AttendanceShiftCycleAssignment = typeof attendanceShiftCycleAssignments.$inferSelect;

export const attendanceLeaves = mysqlTable("attendance_leaves", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  dateFrom: date("date_from").notNull(),
  dateTo: date("date_to").notNull(),
  type: mysqlEnum("type", ["annual", "sick", "unpaid", "other"]).notNull(),
  approved: boolean("approved").default(false).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxEmpFrom: index("idx_emp_from").on(table.empCd, table.dateFrom),
}));

export type AttendanceLeave = typeof attendanceLeaves.$inferSelect;
export type InsertAttendanceLeave = typeof attendanceLeaves.$inferInsert;

export const attendanceHolidays = mysqlTable("attendance_holidays", {
  date: date("date").primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  paid: boolean("paid").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AttendanceHoliday = typeof attendanceHolidays.$inferSelect;
export type InsertAttendanceHoliday = typeof attendanceHolidays.$inferInsert;

export const attendanceLeaveBalances = mysqlTable("attendance_leave_balances", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  annualAllocation: int("annual_allocation").default(21).notNull(),
  carryOver: int("carry_over").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uqLeaveBalEmpYear: uniqueIndex("uq_leave_bal_emp_year").on(table.empCd, table.year),
}));

export type AttendanceLeaveBalance = typeof attendanceLeaveBalances.$inferSelect;
export type InsertAttendanceLeaveBalance = typeof attendanceLeaveBalances.$inferInsert;

export const attendancePermissions = mysqlTable("attendance_permissions", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  date: date("date").notNull(),
  type: mysqlEnum("perm_type", ["in", "out"]).notNull(),
  durationMinutes: int("duration_minutes").notNull(),
  approved: boolean("approved").default(false).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxPermEmpDate: index("idx_perm_emp_date").on(table.empCd, table.date),
}));

export type AttendancePermission = typeof attendancePermissions.$inferSelect;
export type InsertAttendancePermission = typeof attendancePermissions.$inferInsert;

export const attendanceDaily = mysqlTable("attendance_daily", {
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  workDate: date("work_date").notNull(),
  shiftId: int("shift_id"),
  firstIn: timestamp("first_in"),
  lastOut: timestamp("last_out"),
  workedMinutes: int("worked_minutes"),
  lateMinutes: int("late_minutes").default(0).notNull(),
  earlyLeaveMin: int("early_leave_min").default(0).notNull(),
  overtimeMinutes: int("overtime_minutes").default(0).notNull(),
  status: mysqlEnum("status", ["present", "absent", "leave", "holiday", "partial", "missing_checkout"]).notNull(),
  insideNow: boolean("inside_now").default(false).notNull(),
  computedAt: timestamp("computedAt").notNull(),
}, (table) => ({
  pkAttendanceDaily: primaryKey({ columns: [table.empCd, table.workDate] }),
  idxDateStatus: index("idx_date_status").on(table.workDate, table.status),
  idxInsideNow: index("idx_inside_now").on(table.insideNow),
}));

export type AttendanceDaily = typeof attendanceDaily.$inferSelect;
export type InsertAttendanceDaily = typeof attendanceDaily.$inferInsert;

/**
 * Monthly Attendance Report
 * Aggregated from daily attendance records
 * Recomputed whenever daily records change
 */
export const attendanceMonthlyReport = mysqlTable("attendance_monthly_report", {
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  totalDays: int("total_days").default(0).notNull(),
  presentDays: int("present_days").default(0).notNull(),
  absentDays: int("absent_days").default(0).notNull(),
  leaveDays: int("leave_days").default(0).notNull(),
  holidayDays: int("holiday_days").default(0).notNull(),
  partialDays: int("partial_days").default(0).notNull(),
  missingCheckoutDays: int("missing_checkout_days").default(0).notNull(),
  totalLateMins: int("total_late_mins").default(0).notNull(),
  lateCount: int("late_count").default(0).notNull(),
  totalEarlyLeaveMins: int("total_early_leave_mins").default(0).notNull(),
  earlyLeaveCount: int("early_leave_count").default(0).notNull(),
  totalOTMins: int("total_ot_mins").default(0).notNull(),
  computedAt: timestamp("computed_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pkMonthlyReport: primaryKey({ columns: [table.empCd, table.year, table.month] }),
  idxYearMonth: index("idx_year_month").on(table.year, table.month),
}));

export type AttendanceMonthlyReport = typeof attendanceMonthlyReport.$inferSelect;
export type InsertAttendanceMonthlyReport = typeof attendanceMonthlyReport.$inferInsert;

export const attendanceSyncRuns = mysqlTable("attendance_sync_runs", {
  id: int("id").autoincrement().primaryKey(),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  source: mysqlEnum("source", ["access", "tcp"]).notNull(),
  trigger: mysqlEnum("trigger", ["cron", "manual"]).notNull(),
  triggeredBy: int("triggered_by"),
  rowsSeen: int("rows_seen").default(0).notNull(),
  rowsInserted: int("rows_inserted").default(0).notNull(),
  rowsSkipped: int("rows_skipped").default(0).notNull(),
  rowsQuarantined: int("rows_quarantined").default(0).notNull(),
  status: mysqlEnum("status", ["running", "ok", "partial", "failed", "locked"]).notNull(),
  error: text("error"),
  highWaterMark: timestamp("high_water_mark"),
}, (table) => ({
  idxStarted: index("idx_started").on(table.startedAt),
  idxStatus: index("idx_status").on(table.status),
}));

export type AttendanceSyncRun = typeof attendanceSyncRuns.$inferSelect;
export type InsertAttendanceSyncRun = typeof attendanceSyncRuns.$inferInsert;

export const attendanceDeviceSettings = mysqlTable("attendance_device_settings", {
  id: int("id").primaryKey().default(1), // Single row per deployment
  enabled: boolean("enabled").default(false).notNull(),
  ip: varchar("ip", { length: 255 }).default("192.168.1.100").notNull(),
  port: int("port").default(5005).notNull(),
  protocol: mysqlEnum("protocol", ["tcp", "udp"]).default("tcp").notNull(),
  fallbackToAccess: boolean("fallback_to_access").default(true).notNull(),
  realTimeSync: boolean("real_time_sync").default(true).notNull(),
  lastConfigUpdate: timestamp("last_config_update"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AttendanceDeviceSettings = typeof attendanceDeviceSettings.$inferSelect;
export type InsertAttendanceDeviceSettings = typeof attendanceDeviceSettings.$inferInsert;

// ============================================================
// SALARY MODULE
// ============================================================

export const salaryBasics = mysqlTable("salary_basics", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  basicAmount: decimal("basic_amount", { precision: 12, scale: 2 }).notNull(),
  socialAllowance: decimal("social_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  costOfLivingAllowance: decimal("cost_of_living_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  transportAllowance: decimal("transport_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  workNatureAllowance: decimal("work_nature_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  receptionAllowance: decimal("reception_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  yearlyRaise: decimal("yearly_raise", { precision: 12, scale: 2 }).notNull().default("0"),
  insuranceDeduction: decimal("insurance_deduction", { precision: 12, scale: 2 }).notNull().default("0"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxSalaryEmp: index("idx_salary_emp").on(table.empCd),
}));

export type SalaryBasic = typeof salaryBasics.$inferSelect;
export type InsertSalaryBasic = typeof salaryBasics.$inferInsert;

export const salaryPenalties = mysqlTable("salary_penalties", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxPenaltyEmpMonth: index("idx_penalty_emp_month").on(table.empCd, table.year, table.month),
}));

export type SalaryPenalty = typeof salaryPenalties.$inferSelect;
export type InsertSalaryPenalty = typeof salaryPenalties.$inferInsert;

export const salaryCommissionPools = mysqlTable("salary_commission_pools", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  section: varchar("section", { length: 32 }).default("مركز").notNull(),
  examCount: int("exam_count").default(0).notNull(),
  examPool: decimal("exam_pool", { precision: 14, scale: 2 }).default("0").notNull(),
  examCountConsultant: int("exam_count_consultant"),
  examCountSpecialist: int("exam_count_specialist"),
  examPoolConsultant: decimal("exam_pool_consultant", { precision: 12, scale: 2 }),
  examPoolSpecialist: decimal("exam_pool_specialist", { precision: 12, scale: 2 }),
  pentacamPool: decimal("pentacam_pool", { precision: 14, scale: 2 }).default("0").notNull(),
  costOfLivingAllowanceAmount: decimal("cost_of_living_allowance_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  costOfLivingAllowanceCount: int("cost_of_living_allowance_count").default(0).notNull(),
  costOfLivingAllowanceTotal: decimal("cost_of_living_allowance_total", { precision: 14, scale: 2 }).default("0").notNull(),
  transportAllowanceAmount: decimal("transport_allowance_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  transportAllowanceCount: int("transport_allowance_count").default(0).notNull(),
  transportAllowanceTotal: decimal("transport_allowance_total", { precision: 14, scale: 2 }).default("0").notNull(),
  cases450: int("cases_450").default(0).notNull(),
  cases400: int("cases_400").default(0).notNull(),
  cases350: int("cases_350").default(0).notNull(),
  cases250: int("cases_250").default(0).notNull(),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uqPoolYearMonthSection: uniqueIndex("uq_pool_year_month_section").on(table.year, table.month, table.section),
}));

export type SalaryCommissionPool = typeof salaryCommissionPools.$inferSelect;
export type InsertSalaryCommissionPool = typeof salaryCommissionPools.$inferInsert;

export const salaryPayroll = mysqlTable("salary_payroll", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  section: varchar("section", { length: 32 }).default("مركز").notNull(),
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  workingDays: int("working_days").default(0).notNull(),
  absentDays: int("absent_days").default(0).notNull(),
  lateMinutes: int("late_minutes").default(0).notNull(),
  earlyLeaveMinutes: int("early_leave_minutes").default(0).notNull(),
  overtimeMinutes: int("overtime_minutes").default(0).notNull(),
  leaveDays: int("leave_days").default(0).notNull(),
  absentDeduction: decimal("absent_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  lateDeduction: decimal("late_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  earlyLeaveDeduction: decimal("early_leave_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  penaltyDeduction: decimal("penalty_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  advancesDeduction: decimal("advances_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  insuranceDeduction: decimal("insurance_deduction", { precision: 12, scale: 2 }).default("0").notNull(),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).default("0").notNull(),
  deductionPct: decimal("deduction_pct", { precision: 6, scale: 4 }).default("0").notNull(),
  leaveMultiplier: decimal("leave_multiplier", { precision: 4, scale: 2 }).default("1").notNull(),
  netBasic: decimal("net_basic", { precision: 12, scale: 2 }).notNull(),
  attendanceCommission: decimal("attendance_commission", { precision: 12, scale: 2 }).default("0").notNull(),
  examCommission: decimal("exam_commission", { precision: 12, scale: 2 }).default("0").notNull(),
  pentacamCommission: decimal("pentacam_commission", { precision: 12, scale: 2 }).default("0").notNull(),
  costOfLivingAllowance: decimal("cost_of_living_allowance", { precision: 12, scale: 2 }).default("0").notNull(),
  transportAllowance: decimal("transport_allowance", { precision: 12, scale: 2 }).default("0").notNull(),
  totalCommission: decimal("total_commission", { precision: 12, scale: 2 }).default("0").notNull(),
  overtimePay: decimal("overtime_pay", { precision: 12, scale: 2 }).default("0").notNull(),
  totalPay: decimal("total_pay", { precision: 12, scale: 2 }).notNull(),
  payrollStatus: mysqlEnum("payroll_status", ["draft", "final"]).default("draft").notNull(),
  computedAt: timestamp("computed_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uqPayrollEmpMonth: uniqueIndex("uq_payroll_emp_month_section").on(table.empCd, table.year, table.month, table.section),
  idxPayrollYearMonth: index("idx_payroll_year_month").on(table.year, table.month),
}));

export type SalaryPayroll = typeof salaryPayroll.$inferSelect;
export type InsertSalaryPayroll = typeof salaryPayroll.$inferInsert;

export const salaryAdvances = mysqlTable("salary_advances", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  idxAdvanceEmpMonth: index("idx_advance_emp_month").on(table.empCd, table.year, table.month),
}));

export type SalaryAdvance = typeof salaryAdvances.$inferSelect;
export type InsertSalaryAdvance = typeof salaryAdvances.$inferInsert;

export const salaryHolidays = mysqlTable("salary_holidays", {
  id: int("id").autoincrement().primaryKey(),
  date: date("date").notNull(),
  name: varchar("name", { length: 100 }).notNull().default(""),
  year: int("year").notNull(),
  month: int("month").notNull(),
});

export type SalaryHoliday = typeof salaryHolidays.$inferSelect;

export const salaryRaiseHistory = mysqlTable("salary_raise_history", {
  id: int("id").autoincrement().primaryKey(),
  empCd: varchar("emp_cd", { length: 32 }).notNull(),
  year: int("year").notNull(),
  raiseAmount: decimal("raise_amount", { precision: 12, scale: 2 }).notNull(),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uqRaiseEmpYear: uniqueIndex("uq_raise_emp_year").on(table.empCd, table.year),
  idxRaiseEmp: index("idx_raise_emp").on(table.empCd),
}));

export type SalaryRaiseHistory = typeof salaryRaiseHistory.$inferSelect;

export const salaryConfig = mysqlTable("salary_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const shiftStaff = mysqlTable("shift_staff", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  ratePerShift: decimal("rate_per_shift", { precision: 10, scale: 2 }).notNull().default("0.00"),
  active: boolean("active").notNull().default(true),
  empCd: varchar("emp_cd", { length: 64 }),
  userId: int("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const shiftAttendance = mysqlTable("shift_attendance", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staff_id").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  workDate: date("work_date").notNull(),
  shiftName: varchar("shift_name", { length: 128 }).notNull(),
  present: boolean("present").notNull().default(true),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uqStaffDateShift: uniqueIndex("uq_staff_date_shift").on(t.staffId, t.workDate, t.shiftName),
}));

export const shiftStaffCycle = mysqlTable("shift_staff_cycle", {
  staffId: int("staff_id").notNull(),
  dayOfWeek: int("day_of_week").notNull(), // 0=Sun 1=Mon ... 6=Sat
  shiftName: varchar("shift_name", { length: 128 }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.staffId, t.dayOfWeek, t.shiftName] }),
}));

// ============ PATIENT PORTAL ============

export const patientPortalOtps = mysqlTable("patient_portal_otps", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  phoneIdx: index("idx_portal_otp_phone").on(table.phone),
}));

export type PatientPortalOtp = typeof patientPortalOtps.$inferSelect;
export type InsertPatientPortalOtp = typeof patientPortalOtps.$inferInsert;

export const patientPortalSessions = mysqlTable("patient_portal_sessions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  token: varchar("token", { length: 512 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex("idx_portal_session_token").on(table.token),
  patientIdx: index("idx_portal_session_patient").on(table.patientId),
}));

export type PatientPortalSession = typeof patientPortalSessions.$inferSelect;
export type InsertPatientPortalSession = typeof patientPortalSessions.$inferInsert;

// weekdayMask bits: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat → value = sum of (1 << bit)
export const bookingScheduleConfig = mysqlTable("booking_schedule_config", {
  id: int("id").autoincrement().primaryKey(),
  bookingType: mysqlEnum("bookingType", ["consultant", "specialist", "lasik", "external"]).notNull(),
  weekdayMask: int("weekdayMask").default(127).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: uniqueIndex("idx_booking_schedule_type").on(table.bookingType),
}));

export type BookingScheduleConfig = typeof bookingScheduleConfig.$inferSelect;
export type InsertBookingScheduleConfig = typeof bookingScheduleConfig.$inferInsert;

export const patientPortalBookings = mysqlTable("patient_portal_bookings", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  bookingType: mysqlEnum("bookingType", ["consultant", "specialist", "lasik", "external"]).notNull(),
  requestedDate: date("requestedDate").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  staffNotes: text("staffNotes"),
  confirmedDate: date("confirmedDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  patientIdx: index("idx_portal_booking_patient").on(table.patientId),
  dateIdx: index("idx_portal_booking_date").on(table.requestedDate),
  statusIdx: index("idx_portal_booking_status").on(table.status),
}));

export type PatientPortalBooking = typeof patientPortalBookings.$inferSelect;
export type InsertPatientPortalBooking = typeof patientPortalBookings.$inferInsert;
