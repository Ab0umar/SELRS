"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorsLookup = exports.visitScheduleRequests = exports.followupItems = exports.followupSheets = exports.operationListItems = exports.operationLists = exports.sheetEntries = exports.userPermissions = exports.systemSettings = exports.testRequestItems = exports.testRequests = exports.testFavorites = exports.tests = exports.medications = exports.auditLogs = exports.auditLog = exports.medicalHistoryChecklist = exports.consentForms = exports.postOpFollowups = exports.surgeries = exports.patientServiceEntries = exports.patientPageStates = exports.pushDeviceRegistrations = exports.userPageStates = exports.diseases = exports.prescriptionItems = exports.prescriptions = exports.doctorReports = exports.pentacamResults = exports.glassesRecords = exports.afterRefractionData = exports.autorefractometryData = exports.examinations = exports.visits = exports.appointments = exports.patientImportStaging = exports.patients = exports.users = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const mysql_core_2 = require("drizzle-orm/mysql-core");
/**
 * Core user table with local authentication (username/password)
 */
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    username: (0, mysql_core_1.varchar)("username", { length: 64 }).notNull().unique(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(), // bcrypt hash
    name: (0, mysql_core_1.text)("name"),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["admin", "doctor", "nurse", "technician", "reception", "manager", "accountant"]).default("reception").notNull(),
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery", "both"]).default("examinations").notNull(),
    shift: (0, mysql_core_1.int)("shift").default(1).notNull(),
    isActive: (0, mysql_core_1.boolean)("isActive").default(true).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: (0, mysql_core_1.timestamp)("lastSignedIn"),
});
/**
 * Patients table - ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط±ط¶ظ‰
 */
exports.patients = (0, mysql_core_1.mysqlTable)("patients", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientCode: (0, mysql_core_1.varchar)("patientCode", { length: 50 }).notNull().unique(), // ظƒظˆط¯ ط§ظ„ظ…ط±ظٹط¶
    fullName: (0, mysql_core_1.varchar)("fullName", { length: 255 }).notNull(), // ط§ظ„ط§ط³ظ… ط§ظ„ظƒط§ظ…ظ„
    dateOfBirth: (0, mysql_core_1.date)("dateOfBirth"), // طھط§ط±ظٹط® ط§ظ„ظ…ظٹظ„ط§ط¯
    age: (0, mysql_core_1.int)("age"), // ط§ظ„ط¹ظ…ط±
    gender: (0, mysql_core_1.mysqlEnum)("gender", ["male", "female"]), // ط§ظ„ط¬ظ†ط³
    nationalId: (0, mysql_core_1.varchar)("nationalId", { length: 20 }), // ط§ظ„ط±ظ‚ظ… ط§ظ„ظ‚ظˆظ…ظٹ
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }), // ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ
    alternatePhone: (0, mysql_core_1.varchar)("alternatePhone", { length: 20 }), // ط±ظ‚ظ… ظ‡ط§طھظپ ط¨ط¯ظٹظ„
    address: (0, mysql_core_1.text)("address"), // ط§ظ„ط¹ظ†ظˆط§ظ†
    occupation: (0, mysql_core_1.varchar)("occupation", { length: 255 }), // ط§ظ„ظˆط¸ظٹظپط©
    referralSource: (0, mysql_core_1.varchar)("referralSource", { length: 255 }), // ظƒظٹظپظٹط© ط§ظ„ظ…ط¹ط±ظپط©
    medicalHistory: (0, mysql_core_1.text)("medicalHistory"), // ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط±ط¶ظٹ
    allergies: (0, mysql_core_1.text)("allergies"), // ط§ظ„ط­ط³ط§ط³ظٹط§طھ
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery"]).default("examinations"), // ط§ظ„ظپط±ط¹ ط§ظ„ط£ط³ط§ط³ظٹ
    serviceType: (0, mysql_core_1.mysqlEnum)("serviceType", ["consultant", "specialist", "lasik", "surgery", "external"]).default("consultant"), // ظ†ظˆط¹ ط§ظ„ط®ط¯ظ…ط©
    locationType: (0, mysql_core_1.mysqlEnum)("locationType", ["center", "external"]).default("center"), // مكان الخدمة
    doctorId: (0, mysql_core_1.varchar)("doctorId", { length: 36 }),
    doctorCode: (0, mysql_core_1.varchar)("doctorCode", { length: 64 }),
    serviceCode: (0, mysql_core_1.varchar)("serviceCode", { length: 64 }),
    lastVisit: (0, mysql_core_1.date)("lastVisit"), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©/ط§ظ„ظ…طھط§ط¨ط¹ط©
    receptionSignature: (0, mysql_core_1.varchar)("receptionSignature", { length: 255 }), // توقيع الاستقبال الأخير
    status: (0, mysql_core_1.mysqlEnum)("status", ["new", "followup", "archived"]).default("new"), // ط­ط§ظ„ط© ط§ظ„ظ…ط±ظٹط¶
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
exports.patientImportStaging = (0, mysql_core_1.mysqlTable)("patient_import_staging", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    batchId: (0, mysql_core_1.varchar)("batchId", { length: 64 }).notNull(),
    rowNumber: (0, mysql_core_1.int)("rowNumber").notNull(),
    patientCode: (0, mysql_core_1.varchar)("patientCode", { length: 50 }),
    fullName: (0, mysql_core_1.varchar)("fullName", { length: 255 }),
    dateOfBirthRaw: (0, mysql_core_1.varchar)("dateOfBirthRaw", { length: 64 }),
    dateOfBirth: (0, mysql_core_1.date)("dateOfBirth"),
    gender: (0, mysql_core_1.mysqlEnum)("gender", ["male", "female"]),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }),
    address: (0, mysql_core_1.text)("address"),
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery"]).default("examinations"),
    serviceType: (0, mysql_core_1.mysqlEnum)("serviceType", ["consultant", "specialist", "lasik", "surgery", "external"]),
    locationType: (0, mysql_core_1.mysqlEnum)("locationType", ["center", "external"]),
    doctorCode: (0, mysql_core_1.varchar)("doctorCode", { length: 64 }),
    doctorId: (0, mysql_core_1.int)("doctorId"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "valid", "invalid", "applied"]).default("pending").notNull(),
    errors: (0, mysql_core_1.text)("errors"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Appointments table - ط¬ط¯ظˆظ„ ط§ظ„ظ…ظˆط§ط¹ظٹط¯
 */
exports.appointments = (0, mysql_core_1.mysqlTable)("appointments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    doctorId: (0, mysql_core_1.int)("doctorId"), // ط§ظ„ط·ط¨ظٹط¨ ط§ظ„ظ…ط¹ظٹظ†
    appointmentDate: (0, mysql_core_1.timestamp)("appointmentDate").notNull(), // طھط§ط±ظٹط® ظˆظˆظ‚طھ ط§ظ„ظ…ظˆط¹ط¯
    appointmentType: (0, mysql_core_1.mysqlEnum)("appointmentType", ["examination", "surgery", "followup"]).notNull(), // ظ†ظˆط¹ ط§ظ„ظ…ظˆط¹ط¯
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery"]).notNull(), // ط§ظ„ظپط±ط¹
    status: (0, mysql_core_1.mysqlEnum)("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled"), // ط­ط§ظ„ط© ط§ظ„ظ…ظˆط¹ط¯
    notes: (0, mysql_core_1.text)("notes"), // ظ…ظ„ط§ط­ط¸ط§طھ
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Visits table - ط¬ط¯ظˆظ„ ط§ظ„ط²ظٹط§ط±ط§طھ/ط§ظ„ظƒط´ظˆظپط§طھ
 */
exports.visits = (0, mysql_core_1.mysqlTable)("visits", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    appointmentId: (0, mysql_core_1.int)("appointmentId"), // ط§ظ„ظ…ظˆط¹ط¯ ط§ظ„ظ…ط±طھط¨ط·
    visitDate: (0, mysql_core_1.timestamp)("visitDate").defaultNow().notNull(), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©
    visitType: (0, mysql_core_1.mysqlEnum)("visitType", ["consultation", "examination", "surgery", "followup"]).notNull(), // ظ†ظˆط¹ ط§ظ„ط²ظٹط§ط±ط©
    chiefComplaint: (0, mysql_core_1.text)("chiefComplaint"), // ط§ظ„ط´ظƒظˆظ‰ ط§ظ„ط±ط¦ظٹط³ظٹط©
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery"]).notNull(), // ط§ظ„ظپط±ط¹
    receptionSignature: (0, mysql_core_1.varchar)("receptionSignature", { length: 255 }), // توقيع الاستقبال / ENTEREDBY
    queueStatus: (0, mysql_core_1.mysqlEnum)("queueStatus", ["checkedIn", "next", "clinic", "treated"]).default("checkedIn"),
    checkedInAt: (0, mysql_core_1.timestamp)("checkedInAt"),
    movedToNextAt: (0, mysql_core_1.timestamp)("movedToNextAt"),
    movedToClinicAt: (0, mysql_core_1.timestamp)("movedToClinicAt"),
    treatedAt: (0, mysql_core_1.timestamp)("treatedAt"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Examinations table - ط¬ط¯ظˆظ„ ط§ظ„ظپط­ظˆطµط§طھ
 */
exports.examinations = (0, mysql_core_1.mysqlTable)("examinations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    visitId: (0, mysql_core_1.int)("visitId").notNull(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    // Uncorrected Vision (UCVA) - ط­ط¯ط© ط§ظ„ط¥ط¨طµط§ط± ط¨ط¯ظˆظ† طھطµط­ظٹط­
    ucvaOD: (0, mysql_core_1.varchar)("ucvaOD", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
    ucvaOS: (0, mysql_core_1.varchar)("ucvaOS", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
    // Best Corrected Visual Acuity (BCVA) - ط£ظپط¶ظ„ ط­ط¯ط© ط¥ط¨طµط§ط± ظ…طµط­ط­ط©
    bcvaOD: (0, mysql_core_1.varchar)("bcvaOD", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
    bcvaOS: (0, mysql_core_1.varchar)("bcvaOS", { length: 20 }), // ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
    // Refraction - ط§ظ„ط§ظ†ظƒط³ط§ط±
    sphereOD: (0, mysql_core_1.varchar)("sphereOD", { length: 20 }), // ط§ظ„ظƒط±ط©
    sphereOS: (0, mysql_core_1.varchar)("sphereOS", { length: 20 }),
    cylinderOD: (0, mysql_core_1.varchar)("cylinderOD", { length: 20 }), // ط§ظ„ط£ط³ط·ظˆط§ظ†ط©
    cylinderOS: (0, mysql_core_1.varchar)("cylinderOS", { length: 20 }),
    axisOD: (0, mysql_core_1.varchar)("axisOD", { length: 20 }), // ط§ظ„ظ…ط­ظˆط±
    axisOS: (0, mysql_core_1.varchar)("axisOS", { length: 20 }),
    // Glasses Prescription - طµูŠغ„ط© ط§ظ„ظ†ظ„ط§ط¶ط©
    glassesData: (0, mysql_core_1.text)("glassesData"), // JSON: {od: {s, c, axis, pd, bcva}, os: {s, c, axis, pd, bcva}}
    // Intraocular Pressure (IOP) - ط¶ط؛ط· ط§ظ„ط¹ظٹظ†
    iopOD: (0, mysql_core_1.varchar)("iopOD", { length: 20 }), // ط§ظ„ط¶ط؛ط· ط§ظ„ط¹ظٹظ† ط§ظ„ظٹظ…ظ†ظ‰
    iopOS: (0, mysql_core_1.varchar)("iopOS", { length: 20 }), // ط§ظ„ط¶ط؛ط· ط§ظ„ط¹ظٹظ† ط§ظ„ظٹط³ط±ظ‰
    // Anterior Segment - ط§ظ„ظ…ظ‚ط¯ظ…ط©
    anteriorSegmentOD: (0, mysql_core_1.text)("anteriorSegmentOD"),
    anteriorSegmentOS: (0, mysql_core_1.text)("anteriorSegmentOS"),
    // Posterior Segment - ط§ظ„ظ…ط¤ط®ط±ط©
    posteriorSegmentOD: (0, mysql_core_1.text)("posteriorSegmentOD"),
    posteriorSegmentOS: (0, mysql_core_1.text)("posteriorSegmentOS"),
    // Radiology & Labs - تحاليل و إشاعات
    radiologyLabsNotes: (0, mysql_core_1.text)("radiologyLabsNotes"),
    // Air Puff - ط§ط®طھط¨ط§ط± ط§ظ„ظ‡ظˆط§ط،
    airPuffOD: (0, mysql_core_1.varchar)("airPuffOD", { length: 20 }),
    airPuffOS: (0, mysql_core_1.varchar)("airPuffOS", { length: 20 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Autorefractometry Data table - بيانات جهاز قياس الانكسار الآلي
 * Separate table for autorefraction to avoid overwriting when saving other data
 */
exports.autorefractometryData = (0, mysql_core_1.mysqlTable)("autorefractometryData", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    examinationId: (0, mysql_core_1.int)("examinationId").notNull().references(() => exports.examinations.id, { onDelete: "cascade" }),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    // Right Eye (OD)
    sphereOD: (0, mysql_core_1.varchar)("sphereOD", { length: 20 }),
    cylinderOD: (0, mysql_core_1.varchar)("cylinderOD", { length: 20 }),
    axisOD: (0, mysql_core_1.varchar)("axisOD", { length: 20 }),
    ucvaOD: (0, mysql_core_1.varchar)("ucvaOD", { length: 20 }),
    bcvaOD: (0, mysql_core_1.varchar)("bcvaOD", { length: 20 }),
    iopOD: (0, mysql_core_1.varchar)("iopOD", { length: 20 }),
    // Left Eye (OS)
    sphereOS: (0, mysql_core_1.varchar)("sphereOS", { length: 20 }),
    cylinderOS: (0, mysql_core_1.varchar)("cylinderOS", { length: 20 }),
    axisOS: (0, mysql_core_1.varchar)("axisOS", { length: 20 }),
    ucvaOS: (0, mysql_core_1.varchar)("ucvaOS", { length: 20 }),
    bcvaOS: (0, mysql_core_1.varchar)("bcvaOS", { length: 20 }),
    iopOS: (0, mysql_core_1.varchar)("iopOS", { length: 20 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * After Refraction Data table - بيانات AFTER (منفصلة عن Autoref)
 */
exports.afterRefractionData = (0, mysql_core_1.mysqlTable)("afterRefractionData", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    examinationId: (0, mysql_core_1.int)("examinationId").notNull().references(() => exports.examinations.id, { onDelete: "cascade" }),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    sphereOD: (0, mysql_core_1.varchar)("sphereOD", { length: 20 }),
    cylinderOD: (0, mysql_core_1.varchar)("cylinderOD", { length: 20 }),
    axisOD: (0, mysql_core_1.varchar)("axisOD", { length: 20 }),
    sphereOS: (0, mysql_core_1.varchar)("sphereOS", { length: 20 }),
    cylinderOS: (0, mysql_core_1.varchar)("cylinderOS", { length: 20 }),
    axisOS: (0, mysql_core_1.varchar)("axisOS", { length: 20 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Glasses Prescription Data table - بيانات وصفة النظارة
 * Separate table for glasses prescription to avoid overwriting when saving other data
 */
exports.glassesRecords = (0, mysql_core_1.mysqlTable)("glassesRecords", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    examinationId: (0, mysql_core_1.int)("examinationId").notNull().references(() => exports.examinations.id, { onDelete: "cascade" }),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    // Right Eye (OD)
    sOD: (0, mysql_core_1.varchar)("sOD", { length: 20 }),
    cOD: (0, mysql_core_1.varchar)("cOD", { length: 20 }),
    axisOD: (0, mysql_core_1.varchar)("axisOD", { length: 20 }),
    pdOD: (0, mysql_core_1.varchar)("pdOD", { length: 20 }),
    addOD: (0, mysql_core_1.varchar)("addOD", { length: 20 }),
    bcvaOD: (0, mysql_core_1.varchar)("bcvaOD", { length: 20 }),
    // Left Eye (OS)
    sOS: (0, mysql_core_1.varchar)("sOS", { length: 20 }),
    cOS: (0, mysql_core_1.varchar)("cOS", { length: 20 }),
    axisOS: (0, mysql_core_1.varchar)("axisOS", { length: 20 }),
    pdOS: (0, mysql_core_1.varchar)("pdOS", { length: 20 }),
    addOS: (0, mysql_core_1.varchar)("addOS", { length: 20 }),
    bcvaOS: (0, mysql_core_1.varchar)("bcvaOS", { length: 20 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Pentacam Results table - ظ†طھط§ط¦ط¬ ط§ظ„ط¨ظ†طھط§ظƒط§ظ…
 */
exports.pentacamResults = (0, mysql_core_1.mysqlTable)("pentacamResults", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    visitId: (0, mysql_core_1.int)("visitId").notNull(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    recordedBy: (0, mysql_core_1.int)("recordedBy"), // ط§ظ„ظپظ†ظٹ ط§ظ„ط°ظٹ ط³ط¬ظ„ ط§ظ„ظ†طھط§ط¦ط¬
    // Pachymetry - ط§ظ„ظ…ط­ط§ط°اة (corneal thickness)
    pachymetryOD: (0, mysql_core_1.varchar)("pachymetryOD", { length: 20 }), // ط³ظ…ظƒ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹظ…ظ†ظ‰
    pachymetryOS: (0, mysql_core_1.varchar)("pachymetryOS", { length: 20 }), // ط³ظ…ظƒ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹط³ط±ظ‰
    // Keratometry - ظ‚ياس ط§ظ„ظ‚ط±ظ†ظٹط© (corneal curvature - K readings)
    k1OD: (0, mysql_core_1.varchar)("k1OD", { length: 20 }), // K1 right eye
    k2OD: (0, mysql_core_1.varchar)("k2OD", { length: 20 }), // K2 right eye
    axisOD: (0, mysql_core_1.varchar)("axisOD", { length: 20 }), // Axis right eye
    thinnestPointOD: (0, mysql_core_1.varchar)("thinnestPointOD", { length: 20 }), // Thinnest point right eye
    apexOD: (0, mysql_core_1.varchar)("apexOD", { length: 20 }), // Apex right eye
    residualOD: (0, mysql_core_1.varchar)("residualOD", { length: 20 }), // Residual right eye
    tttOD: (0, mysql_core_1.varchar)("tttOD", { length: 20 }), // TTT right eye
    ablationOD: (0, mysql_core_1.varchar)("ablationOD", { length: 20 }), // Ablation right eye
    k1OS: (0, mysql_core_1.varchar)("k1OS", { length: 20 }), // K1 left eye
    k2OS: (0, mysql_core_1.varchar)("k2OS", { length: 20 }), // K2 left eye
    axisOS: (0, mysql_core_1.varchar)("axisOS", { length: 20 }), // Axis left eye
    thinnestPointOS: (0, mysql_core_1.varchar)("thinnestPointOS", { length: 20 }), // Thinnest point left eye
    apexOS: (0, mysql_core_1.varchar)("apexOS", { length: 20 }), // Apex left eye
    residualOS: (0, mysql_core_1.varchar)("residualOS", { length: 20 }), // Residual left eye
    tttOS: (0, mysql_core_1.varchar)("tttOS", { length: 20 }), // TTT left eye
    ablationOS: (0, mysql_core_1.varchar)("ablationOS", { length: 20 }), // Ablation left eye
    // Legacy keratometry field (may contain JSON or combined values)
    keratometryOD: (0, mysql_core_1.varchar)("keratometryOD", { length: 50 }), // ظ‚ظٹط§ط³ طھط­ط¯ط¨ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹظ…ظ†ظ‰
    keratometryOS: (0, mysql_core_1.varchar)("keratometryOS", { length: 50 }), // ظ‚ظٹط§ط³ طھط­ط¯ط¨ ط§ظ„ظ‚ط±ظ†ظٹط© ط§ظ„ظٹط³ط±ظ‰
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Doctor Reports table - طھظ‚ط§ط±ظٹط± ط§ظ„ط·ط¨ظٹط¨
 */
exports.doctorReports = (0, mysql_core_1.mysqlTable)("doctorReports", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    visitId: (0, mysql_core_1.int)("visitId").notNull(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    doctorId: (0, mysql_core_1.int)("doctorId"), // ط§ظ„ط·ط¨ظٹط¨
    diagnosis: (0, mysql_core_1.text)("diagnosis"), // ط§ظ„طھط´ط®ظٹطµ
    diseases: (0, mysql_core_1.text)("diseases"), // JSON array of diseases
    treatment: (0, mysql_core_1.text)("treatment"), // ط§ظ„ط¹ظ„ط§ط¬
    recommendations: (0, mysql_core_1.text)("recommendations"), // ط§ظ„طھظˆطµظٹط§طھ
    visitDate: (0, mysql_core_1.date)("visitDate"), // طھط§ط±ظٹط® ط§ظ„ط²ظٹط§ط±ط©
    operationType: (0, mysql_core_1.varchar)("operationType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ط¹ظ…ظ„ظٹط©
    clinicalOpinion: (0, mysql_core_1.text)("clinicalOpinion"),
    additionalNotes: (0, mysql_core_1.text)("additionalNotes"),
    followUpDate: (0, mysql_core_1.timestamp)("followUpDate"), // طھط§ط±ظٹط® ط§ظ„ظ…طھط§ط¨ط¹ط©
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Prescriptions table - ط§ظ„ط±ظˆط´ط§طھ
 */
exports.prescriptions = (0, mysql_core_1.mysqlTable)("prescriptions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    visitId: (0, mysql_core_1.int)("visitId"),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    doctorId: (0, mysql_core_1.int)("doctorId"), // ط§ظ„ط·ط¨ظٹط¨
    prescriptionDate: (0, mysql_core_1.timestamp)("prescriptionDate").defaultNow().notNull(),
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Prescription Items table - ط¨ظ†ظˆط¯ ط§ظ„ط±ظˆط´ط©
 */
exports.prescriptionItems = (0, mysql_core_1.mysqlTable)("prescriptionItems", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    prescriptionId: (0, mysql_core_1.int)("prescriptionId").notNull(),
    medicationId: (0, mysql_core_1.int)("medicationId").notNull(),
    dosage: (0, mysql_core_1.varchar)("dosage", { length: 100 }), // ط§ظ„ط¬ط±ط¹ط©
    frequency: (0, mysql_core_1.varchar)("frequency", { length: 100 }), // ط§ظ„طھظƒط±ط§ط±
    duration: (0, mysql_core_1.varchar)("duration", { length: 100 }), // ط§ظ„ظ…ط¯ط©
    instructions: (0, mysql_core_1.text)("instructions"), // ط§ظ„طھط¹ظ„ظٹظ…ط§طھ
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
/**
 * Diseases table - ط§ظ„ط£ظ…ط±ط§ط¶
 */
exports.diseases = (0, mysql_core_1.mysqlTable)("diseases", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    branch: (0, mysql_core_1.varchar)("branch", { length: 100 }),
    abbrev: (0, mysql_core_1.varchar)("abbrev", { length: 50 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * User Page States - UI state per user/page
 */
exports.userPageStates = (0, mysql_core_1.mysqlTable)("userPageStates", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("userId").notNull(),
    page: (0, mysql_core_1.varchar)("page", { length: 128 }).notNull(),
    data: (0, mysql_core_1.json)("data"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
exports.pushDeviceRegistrations = (0, mysql_core_1.mysqlTable)("push_device_registrations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("userId").notNull(),
    provider: (0, mysql_core_1.mysqlEnum)("provider", ["fcm"]).default("fcm").notNull(),
    platform: (0, mysql_core_1.mysqlEnum)("platform", ["android", "ios", "web"]).notNull(),
    token: (0, mysql_core_1.varchar)("token", { length: 512 }).notNull(),
    deviceId: (0, mysql_core_1.varchar)("deviceId", { length: 191 }),
    appVersion: (0, mysql_core_1.varchar)("appVersion", { length: 64 }),
    build: (0, mysql_core_1.varchar)("build", { length: 64 }),
    lastSeenAt: (0, mysql_core_1.timestamp)("lastSeenAt").defaultNow().notNull(),
    disabledAt: (0, mysql_core_1.timestamp)("disabledAt"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    tokenUniqueIdx: (0, mysql_core_2.uniqueIndex)("ux_push_device_registrations_token").on(table.token),
    userDeviceIdx: (0, mysql_core_1.index)("idx_push_device_user_device").on(table.userId, table.deviceId),
    activeByUserIdx: (0, mysql_core_1.index)("idx_push_device_active_user").on(table.userId, table.disabledAt, table.lastSeenAt),
}));
/**
 * Patient Page States - UI state per patient/page
 */
exports.patientPageStates = (0, mysql_core_1.mysqlTable)("patientPageStates", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    page: (0, mysql_core_1.varchar)("page", { length: 128 }).notNull(),
    data: (0, mysql_core_1.json)("data"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    patientPageIdx: (0, mysql_core_1.index)("idx_patient_page_updated").on(table.patientId, table.page, table.updatedAt),
}));
/**
 * Patient Service Entries - service-level transactions per patient (can repeat by patient code)
 */
exports.patientServiceEntries = (0, mysql_core_1.mysqlTable)("patientServiceEntries", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    serviceCode: (0, mysql_core_1.varchar)("serviceCode", { length: 64 }).notNull(),
    serviceName: (0, mysql_core_1.varchar)("serviceName", { length: 255 }),
    source: (0, mysql_core_1.mysqlEnum)("source", ["mssql", "manual", "import"]).default("mssql").notNull(),
    sourceRef: (0, mysql_core_1.varchar)("sourceRef", { length: 128 }).notNull().unique(),
    serviceDate: (0, mysql_core_1.date)("serviceDate"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    patientServiceDateIdx: (0, mysql_core_1.index)("idx_patient_service_date").on(table.patientId, table.serviceCode, table.serviceDate),
    sourceUpdatedIdx: (0, mysql_core_1.index)("idx_service_source_updated").on(table.source, table.updatedAt),
}));
/**
 * Surgeries table - ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„ط¬ط±ط§ط­ظٹط©
 */
exports.surgeries = (0, mysql_core_1.mysqlTable)("surgeries", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    surgeryType: (0, mysql_core_1.varchar)("surgeryType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ط¹ظ…ظ„ظٹط©
    surgeryDate: (0, mysql_core_1.timestamp)("surgeryDate").notNull(), // طھط§ط±ظٹط® ط§ظ„ط¹ظ…ظ„ظٹط©
    surgeon: (0, mysql_core_1.varchar)("surgeon", { length: 255 }), // ط§ظ„ط¬ط±ط§ط­
    notes: (0, mysql_core_1.text)("notes"), // ظ…ظ„ط§ط­ط¸ط§طھ
    status: (0, mysql_core_1.mysqlEnum)("status", ["scheduled", "completed", "cancelled"]).default("scheduled"),
    branch: (0, mysql_core_1.mysqlEnum)("branch", ["examinations", "surgery"]).default("surgery"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Post-Op Followups table - ظ…طھط§ط¨ط¹ط© ظ…ط§ ط¨ط¹ط¯ ط§ظ„ط¹ظ…ظ„ظٹط©
 */
exports.postOpFollowups = (0, mysql_core_1.mysqlTable)("postOpFollowups", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    surgeryId: (0, mysql_core_1.int)("surgeryId").notNull(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    followupDate: (0, mysql_core_1.timestamp)("followupDate").notNull(),
    findings: (0, mysql_core_1.text)("findings"), // ط§ظ„ظ†طھط§ط¦ط¬
    recommendations: (0, mysql_core_1.text)("recommendations"), // ط§ظ„طھظˆطµظٹط§طھ
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Consent Forms table - ظ†ظ…ط§ط°ط¬ ط§ظ„ط¥ظ‚ط±ط§ط±
 */
exports.consentForms = (0, mysql_core_1.mysqlTable)("consentForms", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    formType: (0, mysql_core_1.varchar)("formType", { length: 255 }), // ظ†ظˆط¹ ط§ظ„ظ†ظ…ظˆط°ط¬
    signedDate: (0, mysql_core_1.timestamp)("signedDate").notNull(),
    content: (0, mysql_core_1.text)("content"), // ظ…ط­طھظˆظ‰ ط§ظ„ظ†ظ…ظˆط°ط¬
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
/**
 * Medical History Checklist table - ظ‚ط§ط¦ظ…ط© ط§ظ„طھط§ط±ظٹط® ط§ظ„ظ…ط±ط¶ظٹ
 */
exports.medicalHistoryChecklist = (0, mysql_core_1.mysqlTable)("medicalHistoryChecklist", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    diabetes: (0, mysql_core_1.boolean)("diabetes").default(false),
    hypertension: (0, mysql_core_1.boolean)("hypertension").default(false),
    heartDisease: (0, mysql_core_1.boolean)("heartDisease").default(false),
    asthma: (0, mysql_core_1.boolean)("asthma").default(false),
    allergies: (0, mysql_core_1.boolean)("allergies").default(false),
    previousSurgeries: (0, mysql_core_1.text)("previousSurgeries"),
    medications: (0, mysql_core_1.text)("medications"),
    familyHistory: (0, mysql_core_1.text)("familyHistory"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Audit Logs table - ط³ط¬ظ„ ط§ظ„طھط¯ظ‚ظٹظ‚
 */
exports.auditLog = (0, mysql_core_1.mysqlTable)("auditLog", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    adminId: (0, mysql_core_1.int)("adminId"),
    action: (0, mysql_core_1.varchar)("action", { length: 255 }),
    entityType: (0, mysql_core_1.varchar)("entityType", { length: 100 }),
    entityId: (0, mysql_core_1.int)("entityId"),
    changes: (0, mysql_core_1.text)("changes"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
/**
 * Alias for auditLog
 */
exports.auditLogs = exports.auditLog;
/**
 * Medications table - ط§ظ„ط£ط¯ظˆظٹط©
 */
exports.medications = (0, mysql_core_1.mysqlTable)("medications", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["tablet", "drops", "ointment", "injection", "suspension", "other"]).notNull(),
    activeIngredient: (0, mysql_core_1.varchar)("activeIngredient", { length: 255 }),
    strength: (0, mysql_core_1.varchar)("strength", { length: 100 }),
    manufacturer: (0, mysql_core_1.varchar)("manufacturer", { length: 255 }),
    dosage: (0, mysql_core_1.varchar)("dosage", { length: 100 }),
    description: (0, mysql_core_1.text)("description"),
    /** Optional stock count for pharmacy-style dashboards */
    stockPieces: (0, mysql_core_1.int)("stockPieces"),
    /** Row-level inventory posture; if null UI derives from stockPieces */
    inventoryStatus: (0, mysql_core_1.mysqlEnum)("inventoryStatus", ["available", "out_of_stock", "reserved"]),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Tests table - ط§ظ„ظپط­ظˆطµط§طھ ظˆط§ظ„طھط­ط§ظ„ظٹظ„
 */
exports.tests = (0, mysql_core_1.mysqlTable)("tests", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, mysql_core_1.mysqlEnum)("type", ["examination", "lab", "imaging", "other"]).notNull(),
    category: (0, mysql_core_1.varchar)("category", { length: 255 }),
    normalRange: (0, mysql_core_1.varchar)("normalRange", { length: 255 }),
    unit: (0, mysql_core_1.varchar)("unit", { length: 64 }),
    description: (0, mysql_core_1.text)("description"),
    priceEgp: (0, mysql_core_1.varchar)("priceEgp", { length: 32 }),
    durationMinutes: (0, mysql_core_1.int)("durationMinutes"),
    isActive: (0, mysql_core_1.boolean)("isActive").default(true).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
exports.testFavorites = (0, mysql_core_1.mysqlTable)("testFavorites", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("userId").notNull(),
    testId: (0, mysql_core_1.int)("testId").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").notNull().defaultNow(),
});
/**
 * Test Requests table - ط·ظ„ط¨ط§طھ ط§ظ„ظپط­ظˆطµط§طھ
 */
exports.testRequests = (0, mysql_core_1.mysqlTable)("testRequests", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    visitId: (0, mysql_core_1.int)("visitId"),
    requestDate: (0, mysql_core_1.timestamp)("requestDate").defaultNow().notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "completed", "cancelled"]).default("pending"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Test Request Items table - ط¨ظ†ظˆط¯ ط·ظ„ط¨ ط§ظ„ظپط­ظˆطµط§طھ
 */
exports.testRequestItems = (0, mysql_core_1.mysqlTable)("testRequestItems", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    testRequestId: (0, mysql_core_1.int)("testRequestId").notNull(),
    testId: (0, mysql_core_1.int)("testId").notNull(),
    result: (0, mysql_core_1.text)("result"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
});
/**
 * System Settings table - ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ†ط¸ط§ظ…
 */
exports.systemSettings = (0, mysql_core_1.mysqlTable)("systemSettings", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    key: (0, mysql_core_1.varchar)("key", { length: 255 }).notNull().unique(),
    value: (0, mysql_core_1.text)("value"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * User permissions table
 */
exports.userPermissions = (0, mysql_core_1.mysqlTable)("user_permissions", {
    userId: (0, mysql_core_1.int)("userId").notNull(),
    pageId: (0, mysql_core_1.varchar)("pageId", { length: 255 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
}, (table) => ({
    pk: (0, mysql_core_1.primaryKey)({ columns: [table.userId, table.pageId] }),
}));
/**
 * Sheet entries table
 */
exports.sheetEntries = (0, mysql_core_1.mysqlTable)("sheet_entries", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    sheetType: (0, mysql_core_1.mysqlEnum)("sheetType", ["consultant", "specialist", "lasik", "external"]).notNull(),
    content: (0, mysql_core_1.text)("content").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Operation lists table
 */
exports.operationLists = (0, mysql_core_1.mysqlTable)("operationLists", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    doctorTab: (0, mysql_core_1.varchar)("doctorTab", { length: 100 }).notNull(),
    listDate: (0, mysql_core_1.date)("listDate").notNull(),
    operationType: (0, mysql_core_1.varchar)("operationType", { length: 50 }),
    doctorName: (0, mysql_core_1.varchar)("doctorName", { length: 255 }),
    listTime: (0, mysql_core_1.varchar)("listTime", { length: 50 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Operation list items table
 */
exports.operationListItems = (0, mysql_core_1.mysqlTable)("operationListItems", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    listId: (0, mysql_core_1.int)("listId").notNull(),
    number: (0, mysql_core_1.varchar)("number", { length: 50 }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 50 }),
    doctor: (0, mysql_core_1.varchar)("doctor", { length: 255 }),
    operation: (0, mysql_core_1.varchar)("operation", { length: 255 }),
    eye: (0, mysql_core_1.varchar)("eye", { length: 50 }),
    center: (0, mysql_core_1.boolean)("center").default(false).notNull(),
    payment: (0, mysql_core_1.varchar)("payment", { length: 255 }),
    hospital: (0, mysql_core_1.varchar)("hospital", { length: 255 }),
    code: (0, mysql_core_1.varchar)("code", { length: 50 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
}, (table) => ({
    listNumberIdx: (0, mysql_core_1.index)("idx_operation_list_number").on(table.listId, table.number),
}));
/**
 * Followup Sheets table - أوراق المتابعة
 * Stores each group of 4 followup tables as a separate sheet with version number
 */
exports.followupSheets = (0, mysql_core_1.mysqlTable)("followupSheets", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    patientId: (0, mysql_core_1.int)("patientId").notNull(),
    sheetType: (0, mysql_core_1.mysqlEnum)("sheetType", ["consultant", "specialist", "lasik", "external"]).notNull(), // نوع الشيت
    version: (0, mysql_core_1.int)("version").notNull().default(1), // رقم النسخة (شيت 1، شيت 2، إلخ)
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    patientSheetTypeIdx: (0, mysql_core_1.index)("idx_followup_patient_type").on(table.patientId, table.sheetType),
}));
/**
 * Followup Items table - بيانات كل جدول متابعة (4 جداول في كل شيت)
 */
exports.followupItems = (0, mysql_core_1.mysqlTable)("followupItems", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    followupSheetId: (0, mysql_core_1.int)("followupSheetId").notNull(), // الرابط إلى followup_sheets
    tableIndex: (0, mysql_core_1.int)("tableIndex").notNull(), // رقم الجدول (0-3 في كل شيت)
    followupDate: (0, mysql_core_1.timestamp)("followupDate"), // تاريخ المتابعة
    followupName: (0, mysql_core_1.varchar)("followupName", { length: 255 }), // اسم المتابعة (المتابعة الأولى، إلخ)
    // Visual Acuity (VA) - حدة الإبصار
    vaOD: (0, mysql_core_1.varchar)("vaOD", { length: 50 }), // العين اليمنى
    vaOS: (0, mysql_core_1.varchar)("vaOS", { length: 50 }), // العين اليسرى
    // Refraction - الانكسار
    refracOD: (0, mysql_core_1.text)("refracOD"), // JSON: {s, c, a}
    refracOS: (0, mysql_core_1.text)("refracOS"),
    // Flap (for LASIK) - السدفة
    flapOD: (0, mysql_core_1.text)("flapOD"), // JSON: {edges, bed}
    flapOS: (0, mysql_core_1.text)("flapOS"),
    // IOP - ضغط العين
    iopOD: (0, mysql_core_1.varchar)("iopOD", { length: 50 }),
    iopOS: (0, mysql_core_1.varchar)("iopOS", { length: 50 }),
    // Treatment - العلاج
    treatment: (0, mysql_core_1.text)("treatment"),
    // Notes - ملاحظات
    notes: (0, mysql_core_1.text)("notes"),
    // Metadata for consultant followups
    rightEye: (0, mysql_core_1.boolean)("rightEye").default(false), // هل يتم الفحص على العين اليمنى
    leftEye: (0, mysql_core_1.boolean)("leftEye").default(false), // هل يتم الفحص على العين اليسرى
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    sheetTableIdx: (0, mysql_core_1.index)("idx_followup_sheet_table").on(table.followupSheetId, table.tableIndex),
}));
/**
 * طلبات تحديد موعد / كشف (استقبال) — بيانات حرة دون ربط إلزامي بسجل مريض
 */
exports.visitScheduleRequests = (0, mysql_core_1.mysqlTable)("visit_schedule_requests", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    fullName: (0, mysql_core_1.varchar)("fullName", { length: 255 }).notNull(),
    age: (0, mysql_core_1.int)("age"),
    visitDate: (0, mysql_core_1.date)("visitDate").notNull(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 32 }),
    service: (0, mysql_core_1.varchar)("service", { length: 128 }).notNull(),
    createdByUserId: (0, mysql_core_1.int)("createdByUserId"),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    visitDateIdx: (0, mysql_core_1.index)("idx_visit_schedule_requests_visitDate").on(table.visitDate),
}));
/**
 * Doctors lookup table (synced from MSSQL via code)
 */
exports.doctorsLookup = (0, mysql_core_1.mysqlTable)("doctors", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey(),
    code: (0, mysql_core_1.varchar)("code", { length: 64 }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }),
});
