"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.getUserByUsername = getUserByUsername;
exports.getUserById = getUserById;
exports.updateUserLastSignedIn = updateUserLastSignedIn;
exports.createUser = createUser;
exports.getAllUsers = getAllUsers;
exports.getDoctors = getDoctors;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.createPatient = createPatient;
exports.stagePatientImportRows = stagePatientImportRows;
exports.getPatientImportErrors = getPatientImportErrors;
exports.getPatientImportPreview = getPatientImportPreview;
exports.applyPatientImportBatch = applyPatientImportBatch;
exports.getOpsHealthStatus = getOpsHealthStatus;
exports.getNextPatientCode = getNextPatientCode;
exports.getPatientById = getPatientById;
exports.getPatientByCode = getPatientByCode;
exports.searchPatients = searchPatients;
exports.resetMssqlSyncCodes = resetMssqlSyncCodes;
exports.updatePatient = updatePatient;
exports.deletePatient = deletePatient;
exports.deleteAllPatientsData = deleteAllPatientsData;
exports.deletePatientWithAllData = deletePatientWithAllData;
exports.deleteVisitWithAllData = deleteVisitWithAllData;
exports.deleteExaminationDirect = deleteExaminationDirect;
exports.fixOrphanedExaminations = fixOrphanedExaminations;
exports.autoFixAllDataIssues = autoFixAllDataIssues;
exports.checkInvalidVisitIds = checkInvalidVisitIds;
exports.fixExamsWithVisitId0 = fixExamsWithVisitId0;
exports.fixVisitsWithoutAppointmentId = fixVisitsWithoutAppointmentId;
exports.checkVisitsWithoutAppointments = checkVisitsWithoutAppointments;
exports.getAllPatients = getAllPatients;
exports.getPatientStats = getPatientStats;
exports.populatePatientNamesFromSheets = populatePatientNamesFromSheets;
exports.getTodayPatientsBySheet = getTodayPatientsBySheet;
exports.createAppointment = createAppointment;
exports.getAppointmentsByPatient = getAppointmentsByPatient;
exports.getAllAppointments = getAllAppointments;
exports.deleteAppointment = deleteAppointment;
exports.updateAppointment = updateAppointment;
exports.getAppointmentsByDate = getAppointmentsByDate;
exports.createVisit = createVisit;
exports.getVisitsByPatient = getVisitsByPatient;
exports.getAllVisits = getAllVisits;
exports.getFollowupVisitsByPatient = getFollowupVisitsByPatient;
exports.updateVisit = updateVisit;
exports.createFollowupSheet = createFollowupSheet;
exports.getFollowupSheetsByPatient = getFollowupSheetsByPatient;
exports.getLatestFollowupSheet = getLatestFollowupSheet;
exports.createFollowupItem = createFollowupItem;
exports.getFollowupItemsBySheet = getFollowupItemsBySheet;
exports.updateFollowupItem = updateFollowupItem;
exports.deleteFollowupSheet = deleteFollowupSheet;
exports.createExamination = createExamination;
exports.getExaminationById = getExaminationById;
exports.getExaminationsByVisit = getExaminationsByVisit;
exports.getExaminationsByPatient = getExaminationsByPatient;
exports.getAllExaminations = getAllExaminations;
exports.updateExamination = updateExamination;
exports.getAutorefractometryByPatient = getAutorefractometryByPatient;
exports.getGlassesRecordsByPatient = getGlassesRecordsByPatient;
exports.getAfterRefractionByPatient = getAfterRefractionByPatient;
exports.createPentacamResult = createPentacamResult;
exports.updatePentacamResult = updatePentacamResult;
exports.getPentacamResultsByVisit = getPentacamResultsByVisit;
exports.saveAutorefractometryData = saveAutorefractometryData;
exports.saveGlassesRecord = saveGlassesRecord;
exports.saveAfterRefractionData = saveAfterRefractionData;
exports.getPentacamResultsByPatient = getPentacamResultsByPatient;
exports.getPentacamResultsForDashboard = getPentacamResultsForDashboard;
exports.getPentacamDashboardDayStats = getPentacamDashboardDayStats;
exports.getRecentPentacamResultNotes = getRecentPentacamResultNotes;
exports.getRecentPentacamLocalResults = getRecentPentacamLocalResults;
exports.reassignPentacamResultPatient = reassignPentacamResultPatient;
exports.deletePentacamResultsByIds = deletePentacamResultsByIds;
exports.createDoctorReport = createDoctorReport;
exports.updateDoctorReport = updateDoctorReport;
exports.getDoctorReportsByVisit = getDoctorReportsByVisit;
exports.getAllDoctorReports = getAllDoctorReports;
exports.getMedicalReportsOverviewRows = getMedicalReportsOverviewRows;
exports.getDoctorReportsByPatient = getDoctorReportsByPatient;
exports.deleteDoctorReport = deleteDoctorReport;
exports.createPrescription = createPrescription;
exports.getPrescriptionsByVisit = getPrescriptionsByVisit;
exports.getPrescriptionsByPatient = getPrescriptionsByPatient;
exports.getPrescriptionsWithItemsByVisit = getPrescriptionsWithItemsByVisit;
exports.getPrescriptionsWithItemsByPatient = getPrescriptionsWithItemsByPatient;
exports.getPrescriptionsOverviewRows = getPrescriptionsOverviewRows;
exports.createPrescriptionWithItems = createPrescriptionWithItems;
exports.deletePrescription = deletePrescription;
exports.createSurgery = createSurgery;
exports.getSurgeriesByPatient = getSurgeriesByPatient;
exports.deleteSurgery = deleteSurgery;
exports.updateSurgery = updateSurgery;
exports.createPostOpFollowup = createPostOpFollowup;
exports.getPostOpFollowupsBySurgery = getPostOpFollowupsBySurgery;
exports.getPostOpFollowupsByPatient = getPostOpFollowupsByPatient;
exports.createConsentForm = createConsentForm;
exports.getConsentFormsByPatient = getConsentFormsByPatient;
exports.createMedicalHistory = createMedicalHistory;
exports.getMedicalHistoryByPatient = getMedicalHistoryByPatient;
exports.createAuditLog = createAuditLog;
exports.getAuditLogs = getAuditLogs;
exports.createMedication = createMedication;
exports.getAllMedications = getAllMedications;
exports.updateMedication = updateMedication;
exports.deleteMedication = deleteMedication;
exports.createTest = createTest;
exports.getAllTests = getAllTests;
exports.updateTest = updateTest;
exports.deleteTest = deleteTest;
exports.getTestFavoritesByUser = getTestFavoritesByUser;
exports.toggleTestFavorite = toggleTestFavorite;
exports.createTestRequest = createTestRequest;
exports.createTestRequestItems = createTestRequestItems;
exports.getTestRequestsByVisit = getTestRequestsByVisit;
exports.getTestRequestsByPatient = getTestRequestsByPatient;
exports.getSystemSettings = getSystemSettings;
exports.getSystemSetting = getSystemSetting;
exports.updateSystemSettings = updateSystemSettings;
exports.normalizePermissionList = normalizePermissionList;
exports.arePermissionListsEqual = arePermissionListsEqual;
exports.normalizePermissionPathsForTeamMirror = normalizePermissionPathsForTeamMirror;
exports.userPermissionsMirrorTeamSnapshot = userPermissionsMirrorTeamSnapshot;
exports.getUserPermissionState = getUserPermissionState;
exports.getUserPermissions = getUserPermissions;
exports.getTeamPermissions = getTeamPermissions;
exports.setTeamPermissions = setTeamPermissions;
exports.getRoleDefaultPermissions = getRoleDefaultPermissions;
exports.getEffectiveUserPermissions = getEffectiveUserPermissions;
exports.setUserPermissions = setUserPermissions;
exports.getSheetEntry = getSheetEntry;
exports.getSheet_Entries = getSheet_Entries;
exports.upsertSheetEntry = upsertSheetEntry;
exports.getOperationList = getOperationList;
exports.getOperationListById = getOperationListById;
exports.saveOperationList = saveOperationList;
exports.deleteOperationList = deleteOperationList;
exports.deleteOperationListById = deleteOperationListById;
exports.getOperationListsHistory = getOperationListsHistory;
exports.getOperationListsHistoryWithItems = getOperationListsHistoryWithItems;
exports.getOperationListsByDate = getOperationListsByDate;
exports.getAutoOperationListsByDate = getAutoOperationListsByDate;
exports.upsertPushDeviceRegistration = upsertPushDeviceRegistration;
exports.disablePushDeviceToken = disablePushDeviceToken;
exports.deletePushDeviceToken = deletePushDeviceToken;
exports.getActivePushDeviceRegistrations = getActivePushDeviceRegistrations;
exports.getActivePushDeviceRegistrationsByUser = getActivePushDeviceRegistrationsByUser;
exports.getUserPageState = getUserPageState;
exports.upsertUserPageState = upsertUserPageState;
exports.isPasswordChangeRequired = isPasswordChangeRequired;
exports.markPasswordChanged = markPasswordChanged;
exports.getPatientPageState = getPatientPageState;
exports.upsertPatientPageState = upsertPatientPageState;
exports.upsertPatientServiceEntry = upsertPatientServiceEntry;
exports.getPatientServiceEntriesByPatients = getPatientServiceEntriesByPatients;
exports.getPatientServiceEntriesByPatient = getPatientServiceEntriesByPatient;
exports.getAllDiseases = getAllDiseases;
exports.createDisease = createDisease;
exports.updateDisease = updateDisease;
exports.deleteDisease = deleteDisease;
exports.getTodayPatients = getTodayPatients;
exports.getTodayVisitsByQueueStatus = getTodayVisitsByQueueStatus;
exports.autoAdvanceQueuePatients = autoAdvanceQueuePatients;
exports.deleteAllPatients = deleteAllPatients;
exports.updateVisitQueueStatus = updateVisitQueueStatus;
exports.getVisitDateIsoById = getVisitDateIsoById;
exports.cascadeQueueStatus = cascadeQueueStatus;
exports.insertVisitScheduleRequest = insertVisitScheduleRequest;
exports.logAuditEvent = logAuditEvent;
const drizzle_orm_1 = require("drizzle-orm");
const mysql2_1 = require("drizzle-orm/mysql2");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const schema_1 = require("../drizzle/schema");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
let _db = null;
const MOJIBAKE_HINT = /[ØÙÃÂ]/;
function decodeMojibake(value) {
    const raw = String(value ?? "");
    if (!raw || !MOJIBAKE_HINT.test(raw))
        return raw;
    try {
        return Buffer.from(raw, "latin1").toString("utf8");
    }
    catch {
        return raw;
    }
}
function encodeForLegacySearch(value) {
    try {
        return Buffer.from(String(value ?? ""), "utf8").toString("latin1");
    }
    catch {
        return value;
    }
}
function decodePatientRow(row) {
    return {
        ...row,
        fullName: decodeMojibake(row.fullName),
        address: decodeMojibake(row.address),
        occupation: decodeMojibake(row.occupation),
        referralSource: decodeMojibake(row.referralSource),
        treatingDoctor: decodeMojibake(row.treatingDoctor),
    };
}
// Lazily create the drizzle instance so local tooling can run without a DB.
async function getDb() {
    if (!_db && process.env.DATABASE_URL) {
        try {
            _db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
        }
        catch (error) {
            console.warn("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}
// ============ USER OPERATIONS ============
/**
 * Get user by username (for local auth)
 */
async function getUserByUsername(username) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get user: database not available");
        return undefined;
    }
    const normalized = String(username ?? "").trim();
    const legacy = encodeForLegacySearch(normalized);
    const result = await db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.username, normalized), (0, drizzle_orm_1.eq)(schema_1.users.username, legacy)))
        .limit(1);
    return result.length > 0 ? result[0] : undefined;
}
/**
 * Get user by ID
 */
async function getUserById(userId) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get user: database not available");
        return undefined;
    }
    const result = await db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
}
/**
 * Update user last signed in
 */
async function updateUserLastSignedIn(userId) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot update user: database not available");
        return;
    }
    await db.update(schema_1.users).set({ lastSignedIn: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
/**
 * Create a new user
 */
async function createUser(userData) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot create user: database not available");
        return undefined;
    }
    const result = await db.insert(schema_1.users).values(userData);
    return result;
}
/**
 * Get all users
 */
async function getAllUsers() {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get users: database not available");
        return [];
    }
    const rows = await db.select().from(schema_1.users);
    return rows.map((row) => ({
        ...row,
        username: decodeMojibake(row.username),
        name: decodeMojibake(row.name),
    }));
}
async function getDoctors() {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot get doctors: database not available");
        return [];
    }
    const rows = await db
        .select({
        id: schema_1.users.id,
        username: schema_1.users.username,
        name: schema_1.users.name,
        isActive: schema_1.users.isActive,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "doctor"));
    return rows
        .filter((row) => row.isActive)
        .map((row) => ({
        id: row.id,
        username: decodeMojibake(row.username),
        name: decodeMojibake(row.name ?? row.username),
        code: `DR${String(row.id).padStart(3, "0")}`,
    }));
}
/**
 * Update user
 */
async function updateUser(userId, updates) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot update user: database not available");
        return;
    }
    await db.update(schema_1.users).set(updates).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
/**
 * Delete user
 */
async function deleteUser(userId) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot delete user: database not available");
        return;
    }
    await db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
}
// ============ PATIENT OPERATIONS ============
async function createPatient(patientData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.patients).values(patientData);
    return result;
}
const IMPORT_ALLOWED_SERVICE_TYPES = new Set(["consultant", "specialist", "lasik", "surgery", "external"]);
const IMPORT_ALLOWED_LOCATION_TYPES = new Set(["center", "external"]);
const IMPORT_ALLOWED_BRANCHES = new Set(["examinations", "surgery"]);
let doctorDirectoryCache = null;
async function getDoctorDirectoryCached() {
    const now = Date.now();
    if (doctorDirectoryCache && now - doctorDirectoryCache.at < 60000) {
        return doctorDirectoryCache;
    }
    const row = await getSystemSetting("doctor_directory");
    const byCode = new Map();
    const byName = new Map();
    if (row?.value) {
        try {
            const parsed = JSON.parse(row.value);
            for (const item of parsed ?? []) {
                const code = String(item?.code ?? "").trim();
                const name = String(item?.name ?? "").trim();
                if (!code || !name)
                    continue;
                const locationType = String(item?.locationType ?? "center").trim().toLowerCase() === "external" ? "external" : "center";
                byCode.set(code.toLowerCase(), { name, locationType });
                byName.set(name.toLowerCase(), { code, locationType });
            }
        }
        catch {
            // ignore malformed setting
        }
    }
    doctorDirectoryCache = { at: now, byCode, byName };
    return doctorDirectoryCache;
}
function normalizeIsoDate(input) {
    const raw = String(input ?? "").trim();
    if (!raw)
        return null;
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m)
        return null;
    const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    if (Number.isNaN(dt.valueOf()))
        return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
}
function safeParseJsonArray(input) {
    try {
        if (!input)
            return [];
        const parsed = JSON.parse(String(input));
        if (!Array.isArray(parsed))
            return [];
        return parsed.map((v) => String(v)).filter(Boolean);
    }
    catch {
        return [];
    }
}
async function stagePatientImportRows(batchId, rows) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalizedBatchId = String(batchId ?? "").trim();
    if (!normalizedBatchId)
        throw new Error("batchId is required");
    await db.delete(schema_1.patientImportStaging).where((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.batchId, normalizedBatchId));
    const codeCounts = new Map();
    for (const row of rows) {
        const code = String(row.patientCode ?? "").trim();
        if (!code)
            continue;
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
    const directory = await getDoctorDirectoryCached();
    const doctorUsers = await getDoctors();
    const doctorIdByName = new Map();
    for (const d of doctorUsers) {
        const key = String(d.name ?? "").trim().toLowerCase();
        if (key)
            doctorIdByName.set(key, Number(d.id));
    }
    let valid = 0;
    let invalid = 0;
    for (const row of rows) {
        const rowNumber = Number(row.rowNumber ?? 0) || 0;
        const patientCode = String(row.patientCode ?? "").trim();
        const fullName = String(row.fullName ?? "").trim();
        const dateOfBirthRaw = String(row.dateOfBirth ?? "").trim();
        const dateOfBirth = normalizeIsoDate(dateOfBirthRaw);
        const serviceType = String(row.serviceType ?? "").trim().toLowerCase();
        const branch = String(row.branch ?? "examinations").trim().toLowerCase();
        const explicitLocation = String(row.locationType ?? "").trim().toLowerCase();
        const doctorCode = String(row.doctorCode ?? "").trim();
        const doctorName = String(row.doctorName ?? "").trim();
        const genderRaw = String(row.gender ?? "").trim().toLowerCase();
        const errors = [];
        if (!patientCode)
            errors.push("Missing patient code");
        if (!fullName)
            errors.push("Missing full name");
        if (patientCode && (codeCounts.get(patientCode) ?? 0) > 1)
            errors.push("Duplicate patient code in same file");
        if (dateOfBirthRaw && !dateOfBirth)
            errors.push("Invalid dateOfBirth format (must be YYYY-MM-DD)");
        if (serviceType && !IMPORT_ALLOWED_SERVICE_TYPES.has(serviceType))
            errors.push("Invalid serviceType");
        if (branch && !IMPORT_ALLOWED_BRANCHES.has(branch))
            errors.push("Invalid branch");
        if (explicitLocation && !IMPORT_ALLOWED_LOCATION_TYPES.has(explicitLocation))
            errors.push("Invalid locationType");
        const locationType = serviceType === "external" ? "external" : (IMPORT_ALLOWED_LOCATION_TYPES.has(explicitLocation) ? explicitLocation : "center");
        const gender = genderRaw === "male" || genderRaw === "female" ? genderRaw : null;
        let resolvedDoctorId = null;
        if (doctorName) {
            resolvedDoctorId = doctorIdByName.get(doctorName.toLowerCase()) ?? null;
        }
        else if (doctorCode) {
            const byCode = directory.byCode.get(doctorCode.toLowerCase());
            if (byCode) {
                resolvedDoctorId = doctorIdByName.get(byCode.name.toLowerCase()) ?? null;
            }
        }
        if ((doctorName || doctorCode) && !resolvedDoctorId) {
            errors.push("Doctor not found in users table");
        }
        const status = errors.length > 0 ? "invalid" : "valid";
        if (status === "valid")
            valid += 1;
        else
            invalid += 1;
        await db.insert(schema_1.patientImportStaging).values({
            batchId: normalizedBatchId,
            rowNumber,
            patientCode: patientCode || null,
            fullName: fullName || null,
            dateOfBirthRaw: dateOfBirthRaw || null,
            dateOfBirth: dateOfBirth,
            gender: gender,
            phone: String(row.phone ?? "").trim() || null,
            address: String(row.address ?? "").trim() || null,
            branch: (IMPORT_ALLOWED_BRANCHES.has(branch) ? branch : "examinations"),
            serviceType: (IMPORT_ALLOWED_SERVICE_TYPES.has(serviceType) ? serviceType : "consultant"),
            locationType: locationType,
            doctorCode: doctorCode || null,
            doctorId: resolvedDoctorId,
            status: status,
            errors: errors.length ? JSON.stringify(errors) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    return {
        batchId: normalizedBatchId,
        total: rows.length,
        valid,
        invalid,
    };
}
async function getPatientImportErrors(batchId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalizedBatchId = String(batchId ?? "").trim();
    if (!normalizedBatchId)
        return [];
    const rows = await db
        .select()
        .from(schema_1.patientImportStaging)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.batchId, normalizedBatchId), (0, drizzle_orm_1.eq)(schema_1.patientImportStaging.status, "invalid")))
        .orderBy(schema_1.patientImportStaging.rowNumber);
    return rows.map((row) => ({
        rowNumber: Number(row.rowNumber ?? 0),
        patientCode: String(row.patientCode ?? ""),
        fullName: String(row.fullName ?? ""),
        errors: safeParseJsonArray(row.errors),
    }));
}
async function getPatientImportPreview(batchId, limit = 100) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalizedBatchId = String(batchId ?? "").trim();
    if (!normalizedBatchId)
        return [];
    const safeLimit = Math.max(1, Math.min(500, Number(limit || 100)));
    const rows = await db
        .select()
        .from(schema_1.patientImportStaging)
        .where((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.batchId, normalizedBatchId))
        .orderBy(schema_1.patientImportStaging.rowNumber)
        .limit(safeLimit);
    return rows.map((row) => ({
        rowNumber: Number(row.rowNumber ?? 0),
        patientCode: String(row.patientCode ?? ""),
        fullName: String(row.fullName ?? ""),
        serviceType: String(row.serviceType ?? ""),
        locationType: String(row.locationType ?? ""),
        status: String(row.status ?? "pending"),
        errors: safeParseJsonArray(row.errors),
    }));
}
async function applyPatientImportBatch(batchId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalizedBatchId = String(batchId ?? "").trim();
    if (!normalizedBatchId)
        throw new Error("batchId is required");
    const rows = await db
        .select()
        .from(schema_1.patientImportStaging)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.batchId, normalizedBatchId), (0, drizzle_orm_1.eq)(schema_1.patientImportStaging.status, "valid")))
        .orderBy(schema_1.patientImportStaging.rowNumber);
    const directory = await getDoctorDirectoryCached();
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    for (const row of rows) {
        try {
            const patientCode = String(row.patientCode ?? "").trim();
            const fullName = String(row.fullName ?? "").trim();
            if (!patientCode || !fullName) {
                failed += 1;
                await db
                    .update(schema_1.patientImportStaging)
                    .set({ status: "invalid", errors: JSON.stringify(["Missing patientCode/fullName"]), updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.id, row.id));
                continue;
            }
            const payload = {
                patientCode,
                fullName,
                dateOfBirth: row.dateOfBirth ?? null,
                gender: row.gender ?? null,
                phone: row.phone ?? "",
                address: row.address ?? "",
                branch: row.branch ?? "examinations",
                serviceType: row.serviceType ?? "consultant",
                locationType: row.locationType ?? (row.serviceType === "external" ? "external" : "center"),
                lastVisit: row.dateOfBirth ?? new Date(),
                doctorId: row.doctorId ?? null,
                status: "new",
            };
            const existing = await getPatientByCode(patientCode);
            if (existing) {
                await db.update(schema_1.patients).set(payload).where((0, drizzle_orm_1.eq)(schema_1.patients.id, Number(existing.id)));
                updated += 1;
            }
            else {
                await db.insert(schema_1.patients).values(payload);
                inserted += 1;
            }
            const doctorCode = String(row.doctorCode ?? "").trim();
            let doctorName = "";
            if (doctorCode) {
                doctorName = directory.byCode.get(doctorCode.toLowerCase())?.name ?? "";
            }
            if (!doctorName && row.doctorId) {
                const owner = await getUserById(Number(row.doctorId));
                doctorName = String(owner?.name ?? owner?.username ?? "").trim();
            }
            if (doctorName) {
                const savedPatient = await getPatientByCode(patientCode);
                if (savedPatient?.id) {
                    const existingState = await getPatientPageState(savedPatient.id, "examination");
                    const existingData = existingState && typeof existingState.data === "object" && existingState.data
                        ? existingState.data
                        : {};
                    await upsertPatientPageState(savedPatient.id, "examination", {
                        ...existingData,
                        doctorName,
                        signatures: {
                            ...(existingData.signatures ?? {}),
                            doctor: doctorName,
                        },
                    });
                }
            }
            await db
                .update(schema_1.patientImportStaging)
                .set({ status: "applied", errors: null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.id, row.id));
        }
        catch (error) {
            failed += 1;
            await db
                .update(schema_1.patientImportStaging)
                .set({
                status: "invalid",
                errors: JSON.stringify([String(error?.message ?? error ?? "Unknown import apply error")]),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.patientImportStaging.id, row.id));
        }
    }
    return {
        batchId: normalizedBatchId,
        total: rows.length,
        inserted,
        updated,
        failed,
    };
}
async function getOpsHealthStatus() {
    const db = await getDb();
    let dbConnected = false;
    let patientsCount = 0;
    let dbError = "";
    try {
        if (!db)
            throw new Error("Database not available");
        const rows = await db.select({ c: (0, drizzle_orm_1.sql) `COUNT(*)` }).from(schema_1.patients);
        dbConnected = true;
        patientsCount = Number(rows[0]?.c ?? 0);
    }
    catch (error) {
        dbConnected = false;
        dbError = String(error?.message ?? error ?? "db error");
    }
    let tunnelConnected = false;
    let tunnelInfo = "";
    try {
        const { stdout } = await exec("cloudflared tunnel list");
        tunnelInfo = stdout.trim();
        tunnelConnected = /[0-9a-f-]{36}/i.test(stdout);
    }
    catch (error) {
        tunnelInfo = String(error?.message ?? "cloudflared not available");
    }
    let api3000 = false;
    let web4000 = false;
    try {
        const { stdout } = await exec('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -First 1 | ForEach-Object { $_.LocalPort }"');
        api3000 = String(stdout).trim() === "3000";
    }
    catch { }
    try {
        const { stdout } = await exec('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object -First 1 | ForEach-Object { $_.LocalPort }"');
        web4000 = String(stdout).trim() === "4000";
    }
    catch { }
    const backupsDir = node_path_1.default.join(process.cwd(), "backups");
    let latestBackupFile = "";
    let latestBackupAt = "";
    try {
        const files = await promises_1.default.readdir(backupsDir);
        const sqlFiles = files.filter((f) => f.toLowerCase().endsWith(".sql"));
        const withStat = await Promise.all(sqlFiles.map(async (name) => {
            const full = node_path_1.default.join(backupsDir, name);
            const stat = await promises_1.default.stat(full);
            return { name, full, mtime: stat.mtime };
        }));
        withStat.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        const latest = withStat[0];
        if (latest) {
            latestBackupFile = latest.full;
            latestBackupAt = latest.mtime.toISOString();
        }
    }
    catch {
        // ignore missing backups dir
    }
    return {
        ok: dbConnected && web4000,
        env: process.env.NODE_ENV || "development",
        web4000,
        api3000,
        dbConnected,
        patientsCount,
        dbError,
        tunnelConnected,
        tunnelInfo,
        latestBackupFile,
        latestBackupAt,
    };
}
async function getNextPatientCode() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({
        maxCode: (0, drizzle_orm_1.sql) `MAX(CASE WHEN ${schema_1.patients.patientCode} REGEXP '^[0-9]{4}$' THEN CAST(${schema_1.patients.patientCode} AS UNSIGNED) ELSE NULL END)`,
    })
        .from(schema_1.patients);
    const current = rows[0]?.maxCode ?? 0;
    const next = Number.isFinite(current) ? Number(current) + 1 : 1;
    return String(next).padStart(4, "0");
}
async function getPatientById(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.select().from(schema_1.patients).where((0, drizzle_orm_1.eq)(schema_1.patients.id, patientId)).limit(1);
    return result.length > 0 ? decodePatientRow(result[0]) : null;
}
async function getPatientByCode(patientCode) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.select().from(schema_1.patients).where((0, drizzle_orm_1.eq)(schema_1.patients.patientCode, patientCode)).limit(1);
    return result.length > 0 ? decodePatientRow(result[0]) : null;
}
async function searchPatients(searchTerm, sheetType) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalized = String(searchTerm ?? "").trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const legacy = encodeForLegacySearch(normalized);
    const term = `%${normalized}%`;
    const legacyTerm = `%${legacy}%`;
    const buildTokenClause = (token) => {
        const t = `%${token}%`;
        const lt = `%${encodeForLegacySearch(token)}%`;
        return (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.patients.fullName, t), (0, drizzle_orm_1.like)(schema_1.patients.fullName, lt), (0, drizzle_orm_1.like)(schema_1.patients.patientCode, t), (0, drizzle_orm_1.like)(schema_1.patients.phone, t), (0, drizzle_orm_1.like)(schema_1.patients.alternatePhone, t));
    };
    const phraseClause = (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.patients.fullName, term), (0, drizzle_orm_1.like)(schema_1.patients.fullName, legacyTerm), (0, drizzle_orm_1.like)(schema_1.patients.patientCode, term), (0, drizzle_orm_1.like)(schema_1.patients.phone, term), (0, drizzle_orm_1.like)(schema_1.patients.alternatePhone, term));
    const tokenClauses = tokens.map(buildTokenClause);
    const textMatch = tokenClauses.length > 1
        ? (0, drizzle_orm_1.and)(...tokenClauses)
        : tokenClauses.length === 1
            ? tokenClauses[0]
            : phraseClause;
    let whereClause = textMatch;
    if (sheetType) {
        const rows = await db
            .select({ patientId: schema_1.sheetEntries.patientId })
            .from(schema_1.sheetEntries)
            .where((0, drizzle_orm_1.eq)(schema_1.sheetEntries.sheetType, sheetType))
            .groupBy(schema_1.sheetEntries.patientId);
        const patientIds = rows.map((row) => Number(row.patientId)).filter((id) => Number.isFinite(id));
        if (patientIds.length === 0)
            return [];
        whereClause = (0, drizzle_orm_1.and)(textMatch, (0, drizzle_orm_1.inArray)(schema_1.patients.id, patientIds));
    }
    const result = await db.select().from(schema_1.patients).where(whereClause).limit(50);
    const enriched = await attachTreatingDoctor(result);
    return enriched.map((row) => decodePatientRow(row));
}
async function resetMssqlSyncCodes() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.execute((0, drizzle_orm_1.sql) `
    DELETE FROM ${schema_1.patientServiceEntries}
    WHERE ${schema_1.patientServiceEntries.source} = 'mssql'
       OR LOWER(COALESCE(${schema_1.patientServiceEntries.sourceRef}, '')) LIKE 'mssql:%'
  `);
    // Clear doctor/service overrides from saved sheet payloads too,
    // so patient list views do not keep stale local doctor values after reset.
    await db.execute((0, drizzle_orm_1.sql) `
    UPDATE sheet_entries
    SET content = CAST(
      JSON_REMOVE(
        CASE
          WHEN JSON_VALID(content) THEN CAST(content AS JSON)
          ELSE JSON_OBJECT()
        END,
        '$.doctorName',
        '$.doctorCode',
        '$.doctorCodes',
        '$.doctorNames',
        '$.signatures.doctor',
        '$.serviceCode',
        '$.serviceCodes',
        '$.serviceSheetTypeByCode',
        '$.mssqlBackfill',
        '$.syncLockManual',
        '$.manualEditedAt'
      ) AS CHAR
    )
  `);
    await db.execute((0, drizzle_orm_1.sql) `
    UPDATE patientPageStates
    SET data = JSON_REMOVE(
      COALESCE(data, JSON_OBJECT()),
      '$.doctorName',
      '$.doctorCode',
      '$.doctorCodes',
      '$.doctorNames',
      '$.signatures.doctor',
      '$.serviceCode',
      '$.serviceCodes',
      '$.serviceSheetTypeByCode',
      '$.mssqlBackfill',
      '$.syncLockManual',
      '$.manualEditedAt'
    )
  `);
    const result = await db.update(schema_1.patients).set({
        doctorCode: null,
        doctorId: null,
        serviceCode: null,
    });
    // Also reset MSSQL sync markers so the next run can backfill from the start.
    await updateSystemSettings("mssql_sync_state_v1", {
        lastSuccessAt: null,
        lastMarker: null,
        lastMode: null,
        lastResult: null,
    });
    await updateSystemSettings("mssql_sync_runtime_status_v1", {
        running: false,
        lastRunStartedAt: null,
        lastRunFinishedAt: null,
        lastError: null,
        nextRunAt: null,
        lastChangeCount: null,
    });
    return Number(result?.[0]?.affectedRows ?? 0);
}
async function updatePatient(patientId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const nextUpdates = { ...(updates ?? {}) };
    // Convert empty strings to null for optional fields
    for (const [key, value] of Object.entries(nextUpdates)) {
        if (typeof value === 'string' && value.trim() === '') {
            nextUpdates[key] = null;
        }
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
        const rawDob = nextUpdates.dateOfBirth;
        const parseLooseDate = (value) => {
            if (value == null)
                return null;
            if (value instanceof Date && !Number.isNaN(value.valueOf()))
                return value.toISOString().slice(0, 10);
            const raw = String(value).trim();
            if (!raw)
                return null;
            const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (ymd) {
                const normalized = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
                const strict = normalizeIsoDate(normalized);
                if (strict)
                    return strict;
            }
            const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (dmy) {
                const dd = dmy[1].padStart(2, "0");
                const mm = dmy[2].padStart(2, "0");
                const normalized = `${dmy[3]}-${mm}-${dd}`;
                const strict = normalizeIsoDate(normalized);
                if (strict)
                    return strict;
            }
            const sanitized = raw
                .replace(/\bGM\b/g, "GMT")
                .replace(/\s+\([^)]+\)\s*$/, "")
                .trim();
            const parsed = new Date(sanitized);
            if (!Number.isNaN(parsed.valueOf()))
                return parsed.toISOString().slice(0, 10);
            return null;
        };
        if (rawDob == null || String(rawDob).trim() === "") {
            nextUpdates.dateOfBirth = null;
        }
        else {
            const parsedDob = parseLooseDate(rawDob);
            if (parsedDob) {
                nextUpdates.dateOfBirth = parsedDob;
            }
            else {
                delete nextUpdates.dateOfBirth;
            }
        }
    }
    // Final guard: never send empty/invalid date strings to SQL date column.
    if (Object.prototype.hasOwnProperty.call(nextUpdates, "dateOfBirth")) {
        const raw = nextUpdates.dateOfBirth;
        if (raw == null) {
            nextUpdates.dateOfBirth = null;
        }
        else {
            const parsed = normalizeIsoDate(String(raw).trim());
            nextUpdates.dateOfBirth = parsed ?? null;
        }
    }
    try {
        await db.update(schema_1.patients).set(nextUpdates).where((0, drizzle_orm_1.eq)(schema_1.patients.id, patientId));
    }
    catch (error) {
        const hasDoctorId = Object.prototype.hasOwnProperty.call(nextUpdates, "doctorId");
        const doctorIdRaw = String(nextUpdates.doctorId ?? "").trim();
        const doctorIdLooksLegacyString = !!doctorIdRaw && !/^\d+$/.test(doctorIdRaw);
        // Backward-compat fallback for DBs where patients.doctorId is still numeric.
        // Retry update without doctorId whenever payload carries non-numeric doctorId.
        if (hasDoctorId && doctorIdLooksLegacyString) {
            const retryUpdates = { ...nextUpdates };
            delete retryUpdates.doctorId;
            await db.update(schema_1.patients).set(retryUpdates).where((0, drizzle_orm_1.eq)(schema_1.patients.id, patientId));
            return;
        }
        throw error;
    }
}
async function deletePatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.patients).where((0, drizzle_orm_1.eq)(schema_1.patients.id, patientId));
}
/**
 * Delete all patients but keep their exam data for archival
 * This deletes patient records and personal data but preserves all medical exam results
 */
async function deleteAllPatientsData() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Delete patient personal records and dependent data
    await db.delete(schema_1.testRequestItems);
    await db.delete(schema_1.prescriptionItems);
    await db.delete(schema_1.postOpFollowups);
    await db.delete(schema_1.consentForms);
    await db.delete(schema_1.medicalHistoryChecklist);
    await db.delete(schema_1.patientPageStates);
    await db.delete(schema_1.patientServiceEntries);
    await db.delete(schema_1.testRequests);
    await db.delete(schema_1.prescriptions);
    await db.delete(schema_1.surgeries);
    await db.delete(schema_1.appointments);
    await db.delete(schema_1.examinations);
    // Keep the detailed exam data for archival: autorefractometryData, glassesRecords, pentacamResults, doctorReports
    // Delete visits and patients last (these have FKs to them)
    await db.delete(schema_1.visits);
    await db.delete(schema_1.patients);
    // Note: The following tables are preserved for historical/reporting purposes:
    // - autorefractometryData (refraction measurements)
    // - glassesRecords (glasses prescriptions)
    // - pentacamResults (corneal topography)
    // - doctorReports (clinical reports)
    // - sheetEntries (exam sheets) - commented out to preserve
}
/**
 * Delete all medical data for a patient but keep the patient record
 */
async function deletePatientWithAllData(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Get all visits for this patient to delete related data
    const patientVisits = await db.select({ id: schema_1.visits.id }).from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.patientId, patientId));
    const visitIds = patientVisits.map(v => v.id);
    if (visitIds.length > 0) {
        // Delete data related to visits
        await db.delete(schema_1.testRequestItems).where((0, drizzle_orm_1.inArray)(schema_1.testRequestItems.testRequestId, db.select({ id: schema_1.testRequests.id }).from(schema_1.testRequests).where((0, drizzle_orm_1.inArray)(schema_1.testRequests.visitId, visitIds)))).catch(() => { }); // Ignore errors if no related items
        await db.delete(schema_1.examinations).where((0, drizzle_orm_1.inArray)(schema_1.examinations.visitId, visitIds));
        await db.delete(schema_1.pentacamResults).where((0, drizzle_orm_1.inArray)(schema_1.pentacamResults.visitId, visitIds));
        await db.delete(schema_1.doctorReports).where((0, drizzle_orm_1.inArray)(schema_1.doctorReports.visitId, visitIds));
    }
    // Delete test requests and their items (handle both visit-based and patient-based)
    // First delete testRequestItems for all testRequests belonging to this patient
    await db.delete(schema_1.testRequestItems).where((0, drizzle_orm_1.inArray)(schema_1.testRequestItems.testRequestId, db.select({ id: schema_1.testRequests.id }).from(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.patientId, patientId)))).catch(() => { });
    // Then delete all testRequests for this patient (both with and without visitId)
    await db.delete(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.patientId, patientId));
    // Delete prescription items before prescriptions
    await db.delete(schema_1.prescriptionItems).where((0, drizzle_orm_1.inArray)(schema_1.prescriptionItems.prescriptionId, db.select({ id: schema_1.prescriptions.id }).from(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.patientId, patientId)))).catch(() => { });
    await db.delete(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.patientId, patientId));
    // Delete surgeries first (before postOpFollowups since it references surgeryId)
    await db.delete(schema_1.surgeries).where((0, drizzle_orm_1.eq)(schema_1.surgeries.patientId, patientId));
    // Delete post-op followups and consent forms
    await db.delete(schema_1.postOpFollowups).where((0, drizzle_orm_1.eq)(schema_1.postOpFollowups.patientId, patientId));
    await db.delete(schema_1.consentForms).where((0, drizzle_orm_1.eq)(schema_1.consentForms.patientId, patientId));
    await db.delete(schema_1.medicalHistoryChecklist).where((0, drizzle_orm_1.eq)(schema_1.medicalHistoryChecklist.patientId, patientId));
    await db.delete(schema_1.sheetEntries).where((0, drizzle_orm_1.eq)(schema_1.sheetEntries.patientId, patientId));
    await db.delete(schema_1.patientServiceEntries).where((0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.patientId, patientId));
    // Delete visits (but NOT the patient record itself)
    await db.delete(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.patientId, patientId));
    // Note: We do NOT delete appointments or patientPageStates as these may be useful to keep
}
/**
 * Delete a visit/examination and all related data
 */
async function deleteVisitWithAllData(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // CRITICAL: Prevent deletion of visits with invalid IDs (0 or negative)
    if (!visitId || visitId <= 0) {
        throw new Error(`CRITICAL: Attempted to delete visit with invalid ID: ${visitId}. This would delete all visits with visitId=0 or less!`);
    }
    // SAFETY CHECK: Verify the visit exists before deleting
    const visitToDelete = await db.select({ id: schema_1.visits.id }).from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.id, visitId)).limit(1);
    if (visitToDelete.length === 0) {
        throw new Error(`CRITICAL: Visit with ID ${visitId} does not exist. Deletion aborted to prevent accidental deletion of other visits.`);
    }
    console.log(`[DELETE] Starting deletion of visit ${visitId}`);
    // Get prescriptions for this visit
    const visitPrescriptions = await db.select({ id: schema_1.prescriptions.id }).from(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.visitId, visitId));
    const prescriptionIds = visitPrescriptions.map(p => p.id);
    // Get test requests for this visit
    const visitTestRequests = await db.select({ id: schema_1.testRequests.id }).from(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.visitId, visitId));
    const testRequestIds = visitTestRequests.map(t => t.id);
    // Delete prescription items
    if (prescriptionIds.length > 0) {
        await db.delete(schema_1.prescriptionItems).where((0, drizzle_orm_1.inArray)(schema_1.prescriptionItems.prescriptionId, prescriptionIds));
    }
    // Delete prescriptions
    await db.delete(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.visitId, visitId));
    // Delete test request items
    if (testRequestIds.length > 0) {
        await db.delete(schema_1.testRequestItems).where((0, drizzle_orm_1.inArray)(schema_1.testRequestItems.testRequestId, testRequestIds));
    }
    // Delete test requests
    await db.delete(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.visitId, visitId));
    // Delete examination data
    await db.delete(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, visitId));
    await db.delete(schema_1.pentacamResults).where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, visitId));
    await db.delete(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.visitId, visitId));
    // Finally delete the visit
    console.log(`[DELETE] About to delete visit with ID ${visitId}`);
    const deleteResult = await db.delete(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.id, visitId));
    console.log(`[DELETE] Visit ${visitId} deleted. Result:`, deleteResult);
}
async function deleteExaminationDirect(examinationId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Delete related data for this examination
    const examination = await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.id, examinationId)).limit(1);
    if (examination.length > 0) {
        const visitId = examination[0].visitId;
        // Delete pentacam results for this visit
        await db.delete(schema_1.pentacamResults).where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, visitId));
        // Delete doctor reports for this visit
        await db.delete(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.visitId, visitId));
    }
    // Delete the examination itself
    await db.delete(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.id, examinationId));
}
// Fix orphaned examinations by linking them to visits
async function fixOrphanedExaminations() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Find all examinations with invalid visitIds (0 or null)
    const orphanedExams = await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, 0), (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, null)));
    let fixedCount = 0;
    for (const exam of orphanedExams) {
        // Find visits for this patient, sorted by visitDate
        const patientVisits = await db.select().from(schema_1.visits)
            .where((0, drizzle_orm_1.eq)(schema_1.visits.patientId, exam.patientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate));
        let linkedVisitId = null;
        if (patientVisits.length === 0) {
            // Create a new visit for this examination
            const newVisitResult = await db.insert(schema_1.visits).values({
                patientId: exam.patientId,
                visitDate: exam.createdAt,
                visitType: "examination",
                branch: "examinations",
            });
            if (newVisitResult[0]) {
                linkedVisitId = newVisitResult[0].insertId ?? newVisitResult[0].id ?? newVisitResult[0];
            }
        }
        else {
            // Link to the most recent visit for this patient
            linkedVisitId = patientVisits[0].id;
        }
        // Update the examination with the valid visitId
        if (linkedVisitId) {
            await db.update(schema_1.examinations).set({ visitId: linkedVisitId }).where((0, drizzle_orm_1.eq)(schema_1.examinations.id, exam.id));
            fixedCount++;
        }
    }
    return { fixed: fixedCount, total: orphanedExams.length };
}
// COMPREHENSIVE AUTO-FIX: Run all fixes in sequence
async function autoFixAllDataIssues() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const results = {
        fixExamsWithVisitId0: { fixed: 0, total: 0 },
        fixOrphanedExaminations: { fixed: 0, total: 0 },
        fixVisitsWithoutAppointmentId: { fixed: 0, total: 0 },
        totalFixed: 0,
        timestamp: new Date().toISOString(),
    };
    try {
        // 1. Fix exams with visitId = 0 (CRITICAL)
        console.log("Step 1: Fixing exams with visitId = 0...");
        const result1 = await fixExamsWithVisitId0();
        results.fixExamsWithVisitId0 = result1;
        results.totalFixed += result1.fixed;
        // 2. Fix orphaned examinations
        console.log("Step 2: Fixing orphaned examinations...");
        const result2 = await fixOrphanedExaminations();
        results.fixOrphanedExaminations = result2;
        results.totalFixed += result2.fixed;
        // 3. Fix visits without appointmentId
        console.log("Step 3: Fixing visits without appointmentId...");
        const result3 = await fixVisitsWithoutAppointmentId();
        results.fixVisitsWithoutAppointmentId = result3;
        results.totalFixed += result3.fixed;
        console.log("Auto-fix completed:", results);
    }
    catch (error) {
        console.error("Auto-fix error:", error);
        throw error;
    }
    return results;
}
// Diagnostic: Check for visits and exams with invalid visitId
async function checkInvalidVisitIds() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Find all visits with visitId = 0 or null (in visits table)
    const visitsWithId0 = await db.select().from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.id, 0));
    // Find all exams with visitId = 0 or null
    const examsWithId0 = await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, 0), (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, null)));
    // Find all exams with visitId that doesn't exist in visits table
    const allExams = await db.select({ visitId: schema_1.examinations.visitId }).from(schema_1.examinations);
    const allVisitIds = await db.select({ id: schema_1.visits.id }).from(schema_1.visits);
    const validVisitIds = new Set(allVisitIds.map(v => v.id));
    const orphanedExams = allExams.filter(e => e.visitId && !validVisitIds.has(e.visitId));
    return {
        visitsWithId0: visitsWithId0.length,
        examsWithInvalidVisitId: examsWithId0.length,
        orphanedExamsWithBadReference: orphanedExams.length,
        details: {
            visitsWithId0,
            examsWithInvalidVisitId: examsWithId0.slice(0, 10), // First 10
            orphanedExamsCount: orphanedExams.length
        }
    };
}
// CRITICAL: Fix exams with visitId = 0 (the root cause of bulk deletion bug)
// OPTIMIZED: Use SQL batch update instead of looping
async function fixExamsWithVisitId0() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Count exams with visitId = 0 before fixing
    const examsWithId0 = await db.select({ count: (0, drizzle_orm_1.sql) `COUNT(*) as count` }).from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, 0));
    const totalBefore = examsWithId0[0]?.count ?? 0;
    if (totalBefore === 0) {
        return { fixed: 0, total: 0, message: "No exams found with visitId = 0" };
    }
    // Strategy: Link all exams with visitId=0 to the most recent visit for each patient
    // This is faster than creating individual visits
    const examsData = await db.select({
        id: schema_1.examinations.id,
        patientId: schema_1.examinations.patientId,
        createdAt: schema_1.examinations.createdAt,
    }).from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, 0)).limit(1000); // Process in batches
    let fixedCount = 0;
    // For each unique patient, create one visit and link all their exams to it
    const patientVisits = new Map();
    for (const exam of examsData) {
        let visitId = patientVisits.get(exam.patientId);
        if (!visitId) {
            // Create one visit per patient
            const newVisitResult = await db.insert(schema_1.visits).values({
                patientId: exam.patientId,
                visitDate: exam.createdAt,
                visitType: "examination",
                branch: "examinations",
            });
            visitId = newVisitResult?.insertId;
            if (visitId) {
                patientVisits.set(exam.patientId, visitId);
            }
        }
        if (visitId) {
            // Update this exam
            await db.update(schema_1.examinations)
                .set({ visitId })
                .where((0, drizzle_orm_1.eq)(schema_1.examinations.id, exam.id));
            fixedCount++;
        }
    }
    // Update pentacam results with visitId = 0
    const pentacamData = await db.select({
        id: schema_1.pentacamResults.id,
        patientId: schema_1.pentacamResults.patientId,
    }).from(schema_1.pentacamResults).where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, 0)).limit(1000);
    for (const pentacam of pentacamData) {
        const visitId = patientVisits.get(pentacam.patientId);
        if (visitId) {
            await db.update(schema_1.pentacamResults)
                .set({ visitId })
                .where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.id, pentacam.id));
        }
    }
    // Update doctor reports with visitId = 0
    const reportData = await db.select({
        id: schema_1.doctorReports.id,
        patientId: schema_1.doctorReports.patientId,
    }).from(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.visitId, 0)).limit(1000);
    for (const report of reportData) {
        const visitId = patientVisits.get(report.patientId);
        if (visitId) {
            await db.update(schema_1.doctorReports)
                .set({ visitId })
                .where((0, drizzle_orm_1.eq)(schema_1.doctorReports.id, report.id));
        }
    }
    return {
        fixed: fixedCount,
        total: totalBefore,
        message: `Fixed ${fixedCount} exams with visitId = 0 by linking to patient visits.`
    };
}
// Fix visits without appointmentId by linking to matching appointments
// OPTIMIZED: Process in batches instead of one-by-one
async function fixVisitsWithoutAppointmentId() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Get visits without appointmentId (limit to avoid timeout)
    const visitsWithoutAppointment = await db.select({
        id: schema_1.visits.id,
        patientId: schema_1.visits.patientId,
        visitDate: schema_1.visits.visitDate,
    }).from(schema_1.visits).where((0, drizzle_orm_1.isNull)(schema_1.visits.appointmentId)).limit(500); // Process in batches
    const totalCount = visitsWithoutAppointment.length;
    let fixedCount = 0;
    // Get all appointments once
    const allAppointments = await db.select().from(schema_1.appointments);
    const appointmentsByPatient = new Map();
    for (const apt of allAppointments) {
        if (!appointmentsByPatient.has(apt.patientId)) {
            appointmentsByPatient.set(apt.patientId, []);
        }
        appointmentsByPatient.get(apt.patientId).push(apt);
    }
    // Link visits to appointments
    for (const visit of visitsWithoutAppointment) {
        const patientAppointments = appointmentsByPatient.get(visit.patientId) || [];
        if (patientAppointments.length > 0) {
            // Use the first (or most recent) appointment
            const appointmentId = patientAppointments[0].id;
            await db.update(schema_1.visits)
                .set({ appointmentId })
                .where((0, drizzle_orm_1.eq)(schema_1.visits.id, visit.id));
            fixedCount++;
        }
    }
    return { fixed: fixedCount, total: totalCount };
}
// Diagnostic: Show which visits are missing appointments
async function checkVisitsWithoutAppointments() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Get all visits without appointmentId
    const visitsWithoutAppointment = await db.select({
        id: schema_1.visits.id,
        patientId: schema_1.visits.patientId,
        visitDate: schema_1.visits.visitDate,
    }).from(schema_1.visits).where((0, drizzle_orm_1.isNull)(schema_1.visits.appointmentId));
    // For each visit, check if there's an appointment available for that patient
    const results = [];
    for (const visit of visitsWithoutAppointment) {
        const patientAppointments = await db.select().from(schema_1.appointments)
            .where((0, drizzle_orm_1.eq)(schema_1.appointments.patientId, visit.patientId));
        results.push({
            visitId: visit.id,
            patientId: visit.patientId,
            visitDate: visit.visitDate,
            availableAppointmentsForPatient: patientAppointments.length,
            canBeLinked: patientAppointments.length > 0,
        });
    }
    const canBeLinked = results.filter(r => r.canBeLinked).length;
    const cannotBeLinked = results.filter(r => !r.canBeLinked).length;
    return {
        total: visitsWithoutAppointment.length,
        canBeLinked,
        cannotBeLinked,
        details: results.slice(0, 20), // First 20 for review
    };
}
function buildPatientFilterClauses(filters) {
    const whereClauses = [];
    const normalizedBranch = String(filters?.branch ?? "").trim();
    if (normalizedBranch) {
        whereClauses.push((0, drizzle_orm_1.eq)(schema_1.patients.branch, normalizedBranch));
    }
    const normalizedSearch = String(filters?.searchTerm ?? "").trim();
    if (normalizedSearch) {
        const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);
        const effectiveSearchTokens = searchTokens.length > 0 ? searchTokens : [normalizedSearch];
        for (const token of effectiveSearchTokens) {
            const legacyToken = encodeForLegacySearch(token);
            const tokenTerm = `%${token}%`;
            const legacyTokenTerm = `%${legacyToken}%`;
            whereClauses.push((0, drizzle_orm_1.sql) `
        (
          ${schema_1.patients.fullName} LIKE ${tokenTerm}
          OR ${schema_1.patients.fullName} LIKE ${legacyTokenTerm}
          OR ${schema_1.patients.patientCode} LIKE ${tokenTerm}
          OR ${schema_1.patients.phone} LIKE ${tokenTerm}
          OR ${schema_1.patients.alternatePhone} LIKE ${tokenTerm}
          OR EXISTS (
            SELECT 1
            FROM patientPageStates pps
            WHERE pps.patientId = ${schema_1.patients.id}
              AND pps.page = 'examination'
              AND (
                TRIM(COALESCE(
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
                )) LIKE ${tokenTerm}
                OR TRIM(COALESCE(
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
                )) LIKE ${legacyTokenTerm}
              )
          )
        )
      `);
        }
    }
    const normalizedDateFrom = String(filters?.dateFrom ?? "").trim();
    if (normalizedDateFrom) {
        whereClauses.push((0, drizzle_orm_1.gte)(schema_1.patients.lastVisit, normalizedDateFrom));
    }
    const normalizedDateTo = String(filters?.dateTo ?? "").trim();
    if (normalizedDateTo) {
        whereClauses.push((0, drizzle_orm_1.lte)(schema_1.patients.lastVisit, normalizedDateTo));
    }
    const normalizedServiceType = String(filters?.serviceType ?? "").trim();
    if (normalizedServiceType) {
        // Map legacy/old service types to modern ones for backward compatibility
        const serviceTypeVariants = [normalizedServiceType];
        if (normalizedServiceType === "consultant") {
            // Consultant should also match old pentacam_center and surgery
            serviceTypeVariants.push("pentacam_center", "surgery");
        }
        else if (normalizedServiceType === "lasik") {
            // Lasik should also match pentacam center aliases.
            serviceTypeVariants.push("pentacam_center", "pentacam_c");
        }
        else if (normalizedServiceType === "external") {
            // External should also match pentacam_external and surgery_external
            serviceTypeVariants.push("pentacam_external", "pentacam_ex", "pentacam_ex_c", "surgery_external");
        }
        // For lasik, also filter by service codes 1501, 1502 (in addition to serviceType)
        if (normalizedServiceType === "lasik") {
            whereClauses.push((0, drizzle_orm_1.sql) `(
          ${(0, drizzle_orm_1.inArray)(schema_1.patients.serviceType, serviceTypeVariants)}
          OR EXISTS (
            SELECT 1
            FROM patientServiceEntries pse
            WHERE pse.patientId = ${schema_1.patients.id}
              AND LOWER(TRIM(pse.serviceCode)) IN ('1501', '1502')
          )
        )`);
        }
        else {
            whereClauses.push((0, drizzle_orm_1.inArray)(schema_1.patients.serviceType, serviceTypeVariants));
        }
    }
    const normalizedLocationType = String(filters?.locationType ?? "").trim();
    if (normalizedLocationType) {
        whereClauses.push((0, drizzle_orm_1.eq)(schema_1.patients.locationType, normalizedLocationType));
    }
    const normalizedDoctor = String(filters?.doctorName ?? "").trim();
    if (normalizedDoctor) {
        const doctorTokens = normalizedDoctor.split(/\s+/).filter(Boolean);
        const effectiveDoctorTokens = doctorTokens.length > 0 ? doctorTokens : [normalizedDoctor];
        for (const token of effectiveDoctorTokens) {
            const legacyDoctorToken = encodeForLegacySearch(token);
            const doctorTokenTerm = `%${token}%`;
            const legacyDoctorTokenTerm = `%${legacyDoctorToken}%`;
            whereClauses.push((0, drizzle_orm_1.sql) `
        (
          EXISTS (
            SELECT 1
            FROM patientPageStates pps
            WHERE pps.patientId = ${schema_1.patients.id}
              AND pps.page = 'examination'
              AND (
                TRIM(COALESCE(
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
                )) LIKE ${doctorTokenTerm}
                OR TRIM(COALESCE(
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.doctorName')), ''),
                  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(pps.data, '$.signatures.doctor')), '')
                )) LIKE ${legacyDoctorTokenTerm}
              )
          )
        )
      `);
        }
    }
    return whereClauses;
}
async function getAllPatients(options) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const whereClauses = buildPatientFilterClauses(options);
    const limitValue = Math.max(1, Math.min(500, Number(options?.limit ?? 120)));
    const cursor = options?.cursor;
    if (cursor &&
        Number.isFinite(Number(cursor.codeNum)) &&
        Number.isFinite(Number(cursor.id))) {
        whereClauses.push((0, drizzle_orm_1.sql) `(
        CAST(${schema_1.patients.patientCode} AS UNSIGNED) > ${Number(cursor.codeNum)}
        OR (
          CAST(${schema_1.patients.patientCode} AS UNSIGNED) = ${Number(cursor.codeNum)}
          AND ${schema_1.patients.patientCode} > ${String(cursor.patientCode ?? "")}
        )
        OR (
          CAST(${schema_1.patients.patientCode} AS UNSIGNED) = ${Number(cursor.codeNum)}
          AND ${schema_1.patients.patientCode} = ${String(cursor.patientCode ?? "")}
          AND ${schema_1.patients.id} > ${Number(cursor.id)}
        )
      )`);
    }
    const whereExpr = whereClauses.length > 0 ? (0, drizzle_orm_1.and)(...whereClauses) : undefined;
    let query = db
        .select()
        .from(schema_1.patients)
        .orderBy((0, drizzle_orm_1.sql) `CAST(${schema_1.patients.patientCode} AS UNSIGNED) ASC, ${schema_1.patients.patientCode} ASC`)
        .limit(limitValue + 1);
    if (whereExpr) {
        query = query.where(whereExpr);
    }
    const patientRows = await query;
    const enriched = await attachTreatingDoctor(patientRows);
    const decoded = enriched.map((row) => decodePatientRow(row));
    const hasMore = decoded.length > limitValue;
    const rows = hasMore ? decoded.slice(0, limitValue) : decoded;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    const leadingCodeNum = (value) => {
        const raw = String(value ?? "").trim();
        const m = raw.match(/^\d+/);
        return m ? Number(m[0]) : 0;
    };
    const nextCursor = last
        ? {
            codeNum: leadingCodeNum(last.patientCode),
            patientCode: String(last.patientCode ?? ""),
            id: Number(last.id),
        }
        : null;
    return { rows, hasMore, nextCursor, limit: limitValue };
}
async function getPatientStats(year, month, filters) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const safeYear = Number.isFinite(year) ? Math.trunc(year) : 0;
    const safeMonth = Number.isFinite(month) ? Math.trunc(month) : undefined;
    if (safeYear < 1900 || safeYear > 3000) {
        return { total: 0, center: 0, external: 0, lasik: 0 };
    }
    const normalizeServiceType = (value) => {
        const raw = String(value ?? "").trim().toLowerCase();
        if (raw === "specialist" || raw === "اخصائي" || raw === "أخصائي")
            return "specialist";
        if (raw === "external" || raw === "خارجي" || raw === "outside" || raw === "out")
            return "external";
        if (raw === "lasik" || raw === "ليزك")
            return "lasik";
        if (raw === "surgery" || raw === "عمليات" || raw === "عملية")
            return "surgery";
        return "consultant";
    };
    const defaultCodesByType = {
        consultant: ["1589"],
        specialist: ["1586", "1562"],
        // Lasik stats must be based on Lasik examination services only (not operations).
        lasik: ["1501", "1502"],
        surgery: [
            "1503",
            "1504",
            "1509",
            "1510",
            "1511",
            "1512",
            "1514",
            "1515",
            "1516",
            "1517",
            "1518",
            "1519",
            "1578",
            "1579",
            "1580",
            "1581",
            "1585",
            "1587",
            "1593",
            "1599",
            "1607",
            "1567",
            "1568",
        ],
        external: [
            "1613",
            "1590",
            "1572",
            "1600",
            "1505",
            "1506",
            "1507",
            "1508",
            "1520",
            "1521",
            "1563",
            "1564",
            "1565",
            "1566",
            "1569",
            "1570",
            "1571",
            "1573",
            "1574",
            "1598",
            "1595",
            "1596",
            "1597",
            "1601",
            "1603",
            "1610",
            "1611",
            "1612",
            "1614",
        ],
    };
    const serviceCodesByType = new Map();
    Object.entries(defaultCodesByType).forEach(([type, codes]) => {
        serviceCodesByType.set(type, new Set(codes.map((code) => code.toLowerCase())));
    });
    const serviceDirectoryRow = await getSystemSetting("service_directory");
    if (serviceDirectoryRow?.value) {
        try {
            const parsed = JSON.parse(serviceDirectoryRow.value);
            for (const entry of parsed ?? []) {
                const code = String(entry?.code ?? "").trim().toLowerCase();
                const mappedType = normalizeServiceType(entry?.serviceType);
                if (!code)
                    continue;
                if (!serviceCodesByType.has(mappedType))
                    serviceCodesByType.set(mappedType, new Set());
                serviceCodesByType.get(mappedType).add(code);
            }
        }
        catch {
            // Ignore malformed setting and keep defaults.
        }
    }
    // These service codes are center-only by business rule and must never be classified as external.
    const centerOnlyServiceCodes = new Set([
        "1503",
        "1504",
        "1509",
        "1510",
        "1511",
        "1512",
        "1514",
        "1515",
        "1516",
        "1517",
        "1518",
        "1519",
        "1567",
        "1568",
        "1578",
        "1579",
        "1580",
        "1581",
        "1585",
        "1587",
        "1593",
        "1599",
        "1607",
    ]);
    const externalCodes = serviceCodesByType.get("external");
    if (externalCodes) {
        centerOnlyServiceCodes.forEach((code) => externalCodes.delete(code));
    }
    const buildServiceCodeMatchExpr = (serviceType) => {
        const codes = Array.from(serviceCodesByType.get(serviceType) ?? []);
        if (!codes.length)
            return (0, drizzle_orm_1.sql) `0 = 1`;
        return (0, drizzle_orm_1.sql) `LOWER(TRIM(${schema_1.patientServiceEntries.serviceCode})) IN (${drizzle_orm_1.sql.join(codes.map((code) => (0, drizzle_orm_1.sql) `${code}`), (0, drizzle_orm_1.sql) `, `)})`;
    };
    const effectiveServiceDate = (0, drizzle_orm_1.sql) `COALESCE(${schema_1.patientServiceEntries.serviceDate}, DATE(${schema_1.patientServiceEntries.updatedAt}))`;
    const whereClauses = [(0, drizzle_orm_1.sql) `YEAR(${effectiveServiceDate}) = ${safeYear}`];
    if (safeMonth && safeMonth >= 1 && safeMonth <= 12) {
        whereClauses.push((0, drizzle_orm_1.sql) `MONTH(${effectiveServiceDate}) = ${safeMonth}`);
    }
    const normalizedDateFrom = String(filters?.dateFrom ?? "").trim();
    if (normalizedDateFrom) {
        whereClauses.push((0, drizzle_orm_1.sql) `${effectiveServiceDate} >= ${normalizedDateFrom}`);
    }
    const normalizedDateTo = String(filters?.dateTo ?? "").trim();
    if (normalizedDateTo) {
        whereClauses.push((0, drizzle_orm_1.sql) `${effectiveServiceDate} <= ${normalizedDateTo}`);
    }
    const normalizedServiceType = String(filters?.serviceType ?? "").trim().toLowerCase();
    if (normalizedServiceType) {
        const matchExpr = normalizedServiceType === "lasik"
            ? (0, drizzle_orm_1.sql) `LOWER(TRIM(${schema_1.patientServiceEntries.serviceCode})) IN ('1501', '1502')`
            : buildServiceCodeMatchExpr(normalizedServiceType);
        whereClauses.push((0, drizzle_orm_1.sql) `(${matchExpr})`);
    }
    whereClauses.push(...buildPatientFilterClauses({
        ...filters,
        serviceType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
    }));
    // When a serviceType filter is active, we must join patientServiceEntries to filter by code.
    // When no serviceType filter is active, count ALL patients directly so patients without
    // service entries (no PAPAT_SRV record) are still included in the total.
    if (normalizedServiceType) {
        const whereClause = (0, drizzle_orm_1.and)(...whereClauses);
        const lasikExpr = (0, drizzle_orm_1.sql) `LOWER(TRIM(${schema_1.patientServiceEntries.serviceCode})) IN ('1501', '1502')`;
        const rows = await db
            .select({
            total: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.patients.id})`,
            center: (0, drizzle_orm_1.sql) `COUNT(DISTINCT CASE WHEN ${schema_1.patients.locationType} = 'center' THEN ${schema_1.patients.id} END)`,
            external: (0, drizzle_orm_1.sql) `COUNT(DISTINCT CASE WHEN ${schema_1.patients.locationType} = 'external' THEN ${schema_1.patients.id} END)`,
            lasik: (0, drizzle_orm_1.sql) `COUNT(DISTINCT CASE WHEN ${lasikExpr} THEN ${schema_1.patients.id} END)`,
        })
            .from(schema_1.patientServiceEntries)
            .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.patientId, schema_1.patients.id))
            .where(whereClause);
        const row = rows[0] ?? { total: 0, center: 0, external: 0, lasik: 0 };
        return {
            total: Number(row.total ?? 0),
            center: Number(row.center ?? 0),
            external: Number(row.external ?? 0),
            lasik: Number(row.lasik ?? 0),
        };
    }
    // No serviceType filter: count patients on the patients table itself.
    // Only apply date filters when a specific month or explicit date range is requested.
    // For plain yearly totals (no month, no dateFrom/dateTo) count ALL patients so that
    // patients imported from MSSQL with old createdAt values are still included.
    const effectivePatientDate = (0, drizzle_orm_1.sql) `COALESCE(${schema_1.patients.lastVisit}, DATE(${schema_1.patients.createdAt}))`;
    const patientWhereClauses = [];
    const hasDateFilter = Boolean((safeMonth && safeMonth >= 1 && safeMonth <= 12) || normalizedDateFrom || normalizedDateTo);
    if (hasDateFilter) {
        patientWhereClauses.push((0, drizzle_orm_1.sql) `YEAR(${effectivePatientDate}) = ${safeYear}`);
        if (safeMonth && safeMonth >= 1 && safeMonth <= 12) {
            patientWhereClauses.push((0, drizzle_orm_1.sql) `MONTH(${effectivePatientDate}) = ${safeMonth}`);
        }
        if (normalizedDateFrom) {
            patientWhereClauses.push((0, drizzle_orm_1.sql) `${effectivePatientDate} >= ${normalizedDateFrom}`);
        }
        if (normalizedDateTo) {
            patientWhereClauses.push((0, drizzle_orm_1.sql) `${effectivePatientDate} <= ${normalizedDateTo}`);
        }
    }
    // Apply patient-level filters (search, doctor, locationType) if present.
    patientWhereClauses.push(...buildPatientFilterClauses({
        ...filters,
        serviceType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
    }));
    const patientWhereClause = patientWhereClauses.length > 0 ? (0, drizzle_orm_1.and)(...patientWhereClauses) : undefined;
    const rawCount = await db.execute((0, drizzle_orm_1.sql) `
    SELECT
      COUNT(*) AS total,
      SUM(locationType = 'center') AS center,
      SUM(locationType = 'external') AS external
    FROM patients
    ${patientWhereClause ? (0, drizzle_orm_1.sql) `WHERE ${patientWhereClause}` : (0, drizzle_orm_1.sql) ``}
  `);
    const rawRow = Array.isArray(rawCount) ? rawCount[0]?.[0] : rawCount?.rows?.[0];
    const lasikRows = await db
        .select({ lasik: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.patientServiceEntries.patientId})` })
        .from(schema_1.patientServiceEntries)
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.patientId, schema_1.patients.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `LOWER(TRIM(${schema_1.patientServiceEntries.serviceCode})) IN ('1501', '1502')`, (0, drizzle_orm_1.sql) `YEAR(COALESCE(${schema_1.patientServiceEntries.serviceDate}, DATE(${schema_1.patientServiceEntries.updatedAt}))) = ${safeYear}`, ...(patientWhereClause ? [patientWhereClause] : [])));
    const patientRows = [rawRow ?? { total: 0, center: 0, external: 0 }];
    const pr = patientRows[0] ?? { total: 0, center: 0, external: 0 };
    const lr = lasikRows[0] ?? { lasik: 0 };
    return {
        total: Number(pr.total ?? 0),
        center: Number(pr.center ?? 0),
        external: Number(pr.external ?? 0),
        lasik: Number(lr.lasik ?? 0),
    };
}
async function populatePatientNamesFromSheets() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Get all sheet entries that have patientId and content
    const sheets = await db.select().from(schema_1.sheetEntries).limit(5000);
    console.log(`[populatePatientNamesFromSheets] Found ${sheets.length} sheet entries`);
    let updated = 0;
    let skipped = 0;
    let processed = 0;
    for (const sheet of sheets) {
        processed++;
        try {
            if (!sheet.patientId) {
                skipped++;
                continue;
            }
            const patient = await db.select().from(schema_1.patients).where((0, drizzle_orm_1.eq)(schema_1.patients.id, sheet.patientId));
            if (!patient.length) {
                skipped++;
                continue;
            }
            // If patient already has fullName, skip
            if (patient[0].fullName && String(patient[0].fullName).trim()) {
                skipped++;
                continue;
            }
            // Try to extract patient name from sheet content
            let content = sheet.content;
            if (typeof content === "string") {
                try {
                    content = JSON.parse(content);
                }
                catch (e) {
                    skipped++;
                    continue;
                }
            }
            if (!content || typeof content !== "object") {
                skipped++;
                continue;
            }
            const patientName = String(content.patient?.name ?? "").trim() ||
                String(content.patientName ?? "").trim() ||
                String(content.formData?.patientName ?? "").trim();
            if (patientName && patientName.length > 2) {
                await db.update(schema_1.patients).set({ fullName: patientName }).where((0, drizzle_orm_1.eq)(schema_1.patients.id, sheet.patientId));
                updated += 1;
            }
            else {
                skipped++;
            }
        }
        catch (e) {
            console.error(`[populatePatientNamesFromSheets] Error processing sheet ${sheet.id}:`, e);
            skipped++;
        }
    }
    const message = `[populatePatientNamesFromSheets] Processed ${processed}, Updated ${updated}, Skipped ${skipped}`;
    console.log(message);
    return { updated, skipped, processed, sheets: sheets.length };
}
async function getTodayPatientsBySheet(dateIso) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const localToday = (() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    })();
    const target = String(dateIso ?? "").trim() || localToday;
    const rows = await db
        .select({
        id: schema_1.patients.id,
        patientCode: schema_1.patients.patientCode,
        fullName: schema_1.patients.fullName,
        serviceType: schema_1.patients.serviceType,
        lastVisit: schema_1.patients.lastVisit,
    })
        .from(schema_1.patients)
        .where((0, drizzle_orm_1.sql) `(
        DATE(${schema_1.patients.lastVisit}) = ${target}
        OR EXISTS (
          SELECT 1 FROM ${schema_1.visits}
          WHERE ${schema_1.visits.patientId} = ${schema_1.patients.id}
            AND DATE(${schema_1.visits.visitDate}) = ${target}
        )
      )`)
        .orderBy((0, drizzle_orm_1.sql) `CAST(${schema_1.patients.patientCode} AS UNSIGNED) ASC, ${schema_1.patients.patientCode} ASC`);
    const groups = {
        consultant: { serviceType: "consultant", total: 0, patients: [] },
        specialist: { serviceType: "specialist", total: 0, patients: [] },
        lasik: { serviceType: "lasik", total: 0, patients: [] },
        external: { serviceType: "external", total: 0, patients: [] },
        surgery: { serviceType: "surgery", total: 0, patients: [] },
    };
    for (const raw of rows) {
        const row = decodePatientRow(raw);
        const key = String(row.serviceType ?? "").toLowerCase();
        const bucket = groups[key] ?? groups.consultant;
        bucket.total += 1;
        bucket.patients.push({
            id: Number(row.id),
            patientCode: String(row.patientCode ?? ""),
            fullName: String(row.fullName ?? ""),
        });
    }
    const result = {
        date: target,
        total: rows.length,
        groups: [groups.consultant, groups.specialist, groups.lasik, groups.external, groups.surgery],
    };
    // Debug logging
    const withNames = rows.filter(r => r.fullName && String(r.fullName).trim());
    const withoutNames = rows.filter(r => !r.fullName || !String(r.fullName).trim());
    console.log(`[getTodayPatientsBySheet] Date: ${target}, Total: ${rows.length}, With fullName: ${withNames.length}, Without fullName: ${withoutNames.length}`);
    if (rows.length > 0) {
        console.log(`[getTodayPatientsBySheet] Sample WITH name:`, JSON.stringify(withNames[0], null, 2));
        console.log(`[getTodayPatientsBySheet] Sample WITHOUT name:`, JSON.stringify(withoutNames[0], null, 2));
    }
    try {
        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] Total: ${rows.length}, With: ${withNames.length}, Without: ${withoutNames.length}, Sample: ${JSON.stringify({ id: rows[0]?.id, code: rows[0]?.patientCode, name: rows[0]?.fullName })}\n`;
        fs.appendFileSync('/tmp/today_patients_debug.log', logMsg, 'utf-8');
    }
    catch (e) { }
    return result;
}
async function attachTreatingDoctor(patientRows) {
    const db = await getDb();
    if (!db)
        return patientRows;
    if (!patientRows.length)
        return patientRows;
    const normalizeDoctorDisplay = (value) => {
        const raw = String(value ?? "").trim();
        if (!raw)
            return "";
        // Strip trailing numeric code patterns like "Dr Name / 230794"
        return raw.replace(/\s*\/\s*\d{3,}\s*$/g, "").trim();
    };
    const patientIds = patientRows.map((p) => p.id).filter((id) => typeof id === "number");
    if (!patientIds.length)
        return patientRows;
    const stateRows = await db
        .select({
        patientId: schema_1.patientPageStates.patientId,
        data: schema_1.patientPageStates.data,
        updatedAt: schema_1.patientPageStates.updatedAt,
    })
        .from(schema_1.patientPageStates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientPageStates.page, "examination"), (0, drizzle_orm_1.inArray)(schema_1.patientPageStates.patientId, patientIds)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patientPageStates.updatedAt));
    const latestExamDoctorByPatient = new Map();
    const latestExamDoctorsByPatient = new Map();
    const latestExamServiceCodeByPatient = new Map();
    const latestExamServiceCodesByPatient = new Map();
    const latestSheetTypeByServiceCodeByPatient = new Map();
    const latestSyncLockManualByPatient = new Map();
    const latestManualEditedAtByPatient = new Map();
    for (const row of stateRows) {
        if (latestExamDoctorByPatient.has(row.patientId) &&
            latestExamServiceCodesByPatient.has(row.patientId) &&
            latestSheetTypeByServiceCodeByPatient.has(row.patientId)) {
            continue;
        }
        const payload = (() => {
            if (!row.data)
                return null;
            if (typeof row.data === "string") {
                try {
                    return JSON.parse(row.data);
                }
                catch {
                    return null;
                }
            }
            return row.data;
        })();
        if (!payload || typeof payload !== "object")
            continue;
        const directDoctor = normalizeDoctorDisplay(payload.doctorName);
        const signatureDoctor = normalizeDoctorDisplay(payload.signatures?.doctor);
        const doctorNames = Array.isArray(payload.doctorNames)
            ? payload.doctorNames.map((v) => normalizeDoctorDisplay(v)).filter(Boolean)
            : [];
        const mergedDoctors = Array.from(new Set([directDoctor, signatureDoctor, ...doctorNames].filter(Boolean)));
        if (mergedDoctors.length > 0 && !latestExamDoctorsByPatient.has(row.patientId)) {
            latestExamDoctorsByPatient.set(row.patientId, mergedDoctors);
        }
        const serviceCode = String(payload.serviceCode ??
            payload.srvCode ??
            payload.srv_cd ??
            "").trim();
        const serviceCodes = Array.isArray(payload.serviceCodes)
            ? payload.serviceCodes.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [];
        const mergedServiceCodes = Array.from(new Set([serviceCode, ...serviceCodes].filter(Boolean)));
        if (mergedServiceCodes.length > 0 && !latestExamServiceCodesByPatient.has(row.patientId)) {
            latestExamServiceCodesByPatient.set(row.patientId, mergedServiceCodes);
        }
        if (serviceCode && !latestExamServiceCodeByPatient.has(row.patientId)) {
            latestExamServiceCodeByPatient.set(row.patientId, serviceCode);
        }
        else if (mergedServiceCodes.length > 0 && !latestExamServiceCodeByPatient.has(row.patientId)) {
            latestExamServiceCodeByPatient.set(row.patientId, mergedServiceCodes[0]);
        }
        const rawSheetMap = payload.serviceSheetTypeByCode;
        if (rawSheetMap && typeof rawSheetMap === "object" && !latestSheetTypeByServiceCodeByPatient.has(row.patientId)) {
            const normalized = {};
            for (const [k, v] of Object.entries(rawSheetMap)) {
                const key = String(k ?? "").trim();
                const value = String(v ?? "").trim().toLowerCase();
                if (!key || !value)
                    continue;
                normalized[key] = value;
            }
            if (Object.keys(normalized).length > 0) {
                latestSheetTypeByServiceCodeByPatient.set(row.patientId, normalized);
            }
        }
        if (!latestSyncLockManualByPatient.has(row.patientId)) {
            latestSyncLockManualByPatient.set(row.patientId, Boolean(payload.syncLockManual));
        }
        if (!latestManualEditedAtByPatient.has(row.patientId)) {
            latestManualEditedAtByPatient.set(row.patientId, String(payload.manualEditedAt ?? "").trim());
        }
        const doctorName = directDoctor || signatureDoctor;
        if (!doctorName)
            continue;
        latestExamDoctorByPatient.set(row.patientId, doctorName);
    }
    // Build serviceCode → (serviceType, locationType) map from service_directory
    const serviceCodeMetaMap = new Map();
    try {
        const svcDir = await getSystemSetting("service_directory");
        if (svcDir?.value) {
            const parsed = JSON.parse(String(svcDir.value));
            if (Array.isArray(parsed)) {
                for (const entry of parsed) {
                    const code = String(entry?.code ?? "").trim();
                    const type = String(entry?.serviceType ?? "").trim();
                    const locationType = String(entry?.locationType ?? "").trim();
                    if (code) {
                        serviceCodeMetaMap.set(code, { serviceType: type, locationType });
                    }
                }
            }
        }
    }
    catch { /* fall back silently */ }
    // Build doctor name map from the `doctors` table via patients.doctorCode
    const doctorCodes = patientRows
        .map((p) => String(p.doctorCode ?? "").trim().toLowerCase())
        .filter(Boolean);
    const doctorNameByCode = new Map();
    if (doctorCodes.length > 0) {
        try {
            const uniqueCodes = Array.from(new Set(doctorCodes));
            const drRows = await db
                .select({ code: schema_1.doctorsLookup.code, name: schema_1.doctorsLookup.name })
                .from(schema_1.doctorsLookup)
                .where((0, drizzle_orm_1.inArray)(schema_1.doctorsLookup.code, uniqueCodes));
            for (const dr of drRows) {
                const code = String(dr.code ?? "").trim().toLowerCase();
                const name = decodeMojibake(String(dr.name ?? "").trim());
                if (code && name)
                    doctorNameByCode.set(code, name);
            }
        }
        catch {
            // fall back silently
        }
    }
    const serviceEntryRows = await getPatientServiceEntriesByPatients(patientIds).catch(() => []);
    const serviceCodesByPatient = new Map();
    const mssqlServiceCodesByPatient = new Map();
    for (const row of serviceEntryRows) {
        const pid = Number(row.patientId ?? 0);
        const code = String(row.serviceCode ?? "").trim();
        const source = String(row.source ?? "").trim().toLowerCase();
        if (!pid || !code)
            continue;
        const existing = serviceCodesByPatient.get(pid) ?? [];
        if (!existing.includes(code))
            existing.push(code);
        serviceCodesByPatient.set(pid, existing);
        if (source === "mssql") {
            const mssqlExisting = mssqlServiceCodesByPatient.get(pid) ?? [];
            if (!mssqlExisting.includes(code))
                mssqlExisting.push(code);
            mssqlServiceCodesByPatient.set(pid, mssqlExisting);
        }
    }
    const reportRows = await db
        .select({
        patientId: schema_1.doctorReports.patientId,
        doctorName: schema_1.users.name,
        doctorUsername: schema_1.users.username,
        createdAt: schema_1.doctorReports.createdAt,
    })
        .from(schema_1.doctorReports)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.doctorReports.doctorId, schema_1.users.id))
        .where((0, drizzle_orm_1.inArray)(schema_1.doctorReports.patientId, patientIds))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.doctorReports.createdAt));
    const latestDoctorByPatient = new Map();
    for (const row of reportRows) {
        if (latestDoctorByPatient.has(row.patientId))
            continue;
        const doctorName = normalizeDoctorDisplay(row.doctorName || row.doctorUsername || "");
        if (!doctorName)
            continue;
        latestDoctorByPatient.set(row.patientId, doctorName);
    }
    const result = patientRows.map((patient) => ({
        ...patient,
        treatingDoctor: (() => {
            const fromDoctorCode = doctorNameByCode.get(String(patient.doctorCode ?? "").trim().toLowerCase());
            const fromStored = String(patient.treatingDoctor ?? "").trim();
            return normalizeDoctorDisplay(fromDoctorCode || fromStored) || "";
        })(),
        treatingDoctors: latestExamDoctorsByPatient.get(patient.id) ?? [],
        serviceCode: (() => {
            const dbSynced = String(patient.serviceCode ?? "").trim();
            const fromEntries = mssqlServiceCodesByPatient.get(patient.id)?.[0] ?? serviceCodesByPatient.get(patient.id)?.[0];
            return fromEntries || dbSynced || "";
        })(),
        serviceType: (() => {
            const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
            const dbSynced = String(patient.serviceCode ?? "").trim();
            const resolvedCode = String(fromEntries[0] ?? dbSynced).trim();
            return serviceCodeMetaMap.get(resolvedCode)?.serviceType ?? "";
        })(),
        locationType: (() => {
            const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
            const dbSynced = String(patient.serviceCode ?? "").trim();
            const resolvedCode = String(fromEntries[0] ?? dbSynced).trim();
            return serviceCodeMetaMap.get(resolvedCode)?.locationType ?? "";
        })(),
        serviceCodes: (() => {
            const fromEntries = mssqlServiceCodesByPatient.get(patient.id) ?? serviceCodesByPatient.get(patient.id) ?? [];
            if (fromEntries.length > 0)
                return fromEntries;
            const dbSynced = String(patient.serviceCode ?? "").trim();
            return dbSynced ? [dbSynced] : [];
        })(),
        serviceSheetTypeByCode: latestSheetTypeByServiceCodeByPatient.get(patient.id) ?? {},
        syncLockManual: latestSyncLockManualByPatient.get(patient.id) ?? false,
        manualEditedAt: latestManualEditedAtByPatient.get(patient.id) ?? "",
    }));
    return result;
}
// ============ APPOINTMENT OPERATIONS ============
async function createAppointment(appointmentData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.appointments).values(appointmentData);
    let insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? result?.id ?? 0);
    // Some mysql2/drizzle paths don't surface insertId consistently.
    if (!Number.isFinite(insertId) || insertId <= 0) {
        const [latest] = await db
            .select({ id: schema_1.appointments.id })
            .from(schema_1.appointments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.appointments.patientId, Number(appointmentData?.patientId ?? 0)), (0, drizzle_orm_1.eq)(schema_1.appointments.appointmentDate, appointmentData?.appointmentDate), (0, drizzle_orm_1.eq)(schema_1.appointments.appointmentType, String(appointmentData?.appointmentType ?? "")), (0, drizzle_orm_1.eq)(schema_1.appointments.branch, String(appointmentData?.branch ?? ""))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.appointments.id))
            .limit(1);
        insertId = Number(latest?.id ?? 0);
    }
    return {
        ...(result && typeof result === "object" ? result : {}),
        insertId,
        id: insertId,
    };
}
async function getAppointmentsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.appointments).where((0, drizzle_orm_1.eq)(schema_1.appointments.patientId, patientId));
}
async function getAllAppointments(branch) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const baseQuery = db
        .select({
        id: schema_1.appointments.id,
        patientId: schema_1.appointments.patientId,
        doctorId: schema_1.appointments.doctorId,
        appointmentDate: schema_1.appointments.appointmentDate,
        appointmentType: schema_1.appointments.appointmentType,
        branch: schema_1.appointments.branch,
        status: schema_1.appointments.status,
        notes: schema_1.appointments.notes,
        createdAt: schema_1.appointments.createdAt,
        updatedAt: schema_1.appointments.updatedAt,
        patientName: schema_1.patients.fullName,
        patientCode: schema_1.patients.patientCode,
        patientPhone: schema_1.patients.phone,
    })
        .from(schema_1.appointments)
        .leftJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.appointments.patientId, schema_1.patients.id));
    let result;
    if (branch) {
        result = await baseQuery
            .where((0, drizzle_orm_1.eq)(schema_1.appointments.branch, branch))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.appointments.appointmentDate));
    }
    else {
        result = await baseQuery.orderBy((0, drizzle_orm_1.desc)(schema_1.appointments.appointmentDate));
    }
    const withPatientInfo = result.filter((r) => r.patientName !== null);
    const withoutPatientInfo = result.filter((r) => r.patientName === null);
    const logMsg = `[getAllAppointments] Total: ${result.length}, With patient info: ${withPatientInfo.length}, Without patient info: ${withoutPatientInfo.length}\nSample: ${JSON.stringify((withPatientInfo[0] || result[0]), null, 2)}`;
    console.log(logMsg);
    // Also write to file for debugging
    try {
        const fs = require('fs');
        fs.appendFileSync('/tmp/appointments_debug.log', logMsg + '\n\n', 'utf-8');
    }
    catch (e) { }
    return result;
}
async function deleteAppointment(appointmentId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.appointments).where((0, drizzle_orm_1.eq)(schema_1.appointments.id, appointmentId));
}
async function updateAppointment(appointmentId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.appointments).set(updates).where((0, drizzle_orm_1.eq)(schema_1.appointments.id, appointmentId));
}
async function getAppointmentsByDate(date, branch) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    if (branch) {
        return await db.select().from(schema_1.appointments).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.appointments.branch, branch)));
    }
    return await db.select().from(schema_1.appointments);
}
// ============ VISIT OPERATIONS ============
async function createVisit(visitData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.insert(schema_1.visits).values(visitData);
    // Query back the created visit by patientId and visitDate
    const createdVisits = await db
        .select()
        .from(schema_1.visits)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.patientId, visitData.patientId), (0, drizzle_orm_1.eq)(schema_1.visits.visitDate, visitData.visitDate)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.id))
        .limit(1);
    if (createdVisits.length === 0) {
        return { insertId: null };
    }
    return { insertId: createdVisits[0].id, ...createdVisits[0] };
}
async function getVisitsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.visits).where((0, drizzle_orm_1.eq)(schema_1.visits.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate));
}
async function getAllVisits() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db
        .select({
        id: schema_1.visits.id,
        patientId: schema_1.visits.patientId,
        appointmentId: schema_1.visits.appointmentId,
        visitDate: schema_1.visits.visitDate,
        visitType: schema_1.visits.visitType,
        chiefComplaint: schema_1.visits.chiefComplaint,
        branch: schema_1.visits.branch,
        receptionSignature: schema_1.visits.receptionSignature,
        createdAt: schema_1.visits.createdAt,
        updatedAt: schema_1.visits.updatedAt,
        patientName: schema_1.patients.fullName,
        examId: schema_1.examinations.id,
        examPatientId: schema_1.examinations.patientId,
        ucvaOD: schema_1.examinations.ucvaOD,
        ucvaOS: schema_1.examinations.ucvaOS,
        bcvaOD: schema_1.examinations.bcvaOD,
        bcvaOS: schema_1.examinations.bcvaOS,
        sphereOD: schema_1.examinations.sphereOD,
        sphereOS: schema_1.examinations.sphereOS,
        cylinderOD: schema_1.examinations.cylinderOD,
        cylinderOS: schema_1.examinations.cylinderOS,
        axisOD: schema_1.examinations.axisOD,
        axisOS: schema_1.examinations.axisOS,
        iopOD: schema_1.examinations.iopOD,
        iopOS: schema_1.examinations.iopOS,
        glassesData: schema_1.examinations.glassesData,
        radiologyLabsNotes: schema_1.examinations.radiologyLabsNotes,
        airPuffOD: schema_1.examinations.airPuffOD,
        airPuffOS: schema_1.examinations.airPuffOS,
    })
        .from(schema_1.visits)
        .innerJoin(schema_1.examinations, (0, drizzle_orm_1.eq)(schema_1.visits.id, schema_1.examinations.visitId))
        .leftJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate));
    return result;
}
async function getFollowupVisitsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.visits).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.visits.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.visits.visitType, "followup"))).orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate));
}
async function updateVisit(visitId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.visits).set(updates).where((0, drizzle_orm_1.eq)(schema_1.visits.id, visitId));
}
// ============ FOLLOWUP SHEET OPERATIONS ============
async function createFollowupSheet(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.followupSheets).values(data);
    return result;
}
async function getFollowupSheetsByPatient(patientId, sheetType) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const condition = sheetType
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.followupSheets.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.followupSheets.sheetType, sheetType))
        : (0, drizzle_orm_1.eq)(schema_1.followupSheets.patientId, patientId);
    return db.select().from(schema_1.followupSheets).where(condition).orderBy((0, drizzle_orm_1.desc)(schema_1.followupSheets.version));
}
async function getLatestFollowupSheet(patientId, sheetType) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.select().from(schema_1.followupSheets)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.followupSheets.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.followupSheets.sheetType, sheetType)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.followupSheets.version))
        .limit(1);
    return result[0] || null;
}
async function createFollowupItem(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.followupItems).values(data);
    return result;
}
async function getFollowupItemsBySheet(followupSheetId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.followupItems)
        .where((0, drizzle_orm_1.eq)(schema_1.followupItems.followupSheetId, followupSheetId))
        .orderBy((0, drizzle_orm_1.sql) `tableIndex ASC`);
}
async function updateFollowupItem(itemId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.followupItems).set(updates).where((0, drizzle_orm_1.eq)(schema_1.followupItems.id, itemId));
}
async function deleteFollowupSheet(sheetId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Delete items first
    await db.delete(schema_1.followupItems).where((0, drizzle_orm_1.eq)(schema_1.followupItems.followupSheetId, sheetId));
    // Then delete sheet
    await db.delete(schema_1.followupSheets).where((0, drizzle_orm_1.eq)(schema_1.followupSheets.id, sheetId));
}
// ============ EXAMINATION OPERATIONS ============
async function createExamination(examinationData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.examinations).values(examinationData);
    let insertId = Number(result?.insertId ?? result?.[0]?.insertId ?? result?.id ?? 0);
    // Some mysql2/drizzle paths don't surface insertId consistently.
    if (!Number.isFinite(insertId) || insertId <= 0) {
        const [latest] = await db
            .select({ id: schema_1.examinations.id })
            .from(schema_1.examinations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.examinations.patientId, Number(examinationData?.patientId ?? 0)), (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, Number(examinationData?.visitId ?? 0))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.examinations.id))
            .limit(1);
        insertId = Number(latest?.id ?? 0);
    }
    return {
        ...(result && typeof result === "object" ? result : {}),
        insertId,
        id: insertId,
    };
}
async function getExaminationById(id) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const [row] = await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.id, id)).limit(1);
    return row ?? null;
}
async function getExaminationsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.visitId, visitId));
}
async function getExaminationsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.examinations).where((0, drizzle_orm_1.eq)(schema_1.examinations.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.examinations.createdAt));
}
async function getAllExaminations() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db
        .select({
        ...(0, drizzle_orm_1.getTableColumns)(schema_1.examinations),
        patientName: (0, drizzle_orm_1.sql) `JSON_UNQUOTE(JSON_EXTRACT(${schema_1.sheetEntries.content}, '$.patient.name'))`,
    })
        .from(schema_1.examinations)
        .leftJoin(schema_1.sheetEntries, (0, drizzle_orm_1.eq)(schema_1.examinations.patientId, schema_1.sheetEntries.patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.examinations.createdAt));
    return result;
}
async function updateExamination(examinationId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.examinations).set(updates).where((0, drizzle_orm_1.eq)(schema_1.examinations.id, examinationId));
}
// ============ AUTOREFRACTOMETRY OPERATIONS ============
async function getAutorefractometryByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db
        .select({
        ...(0, drizzle_orm_1.getTableColumns)(schema_1.autorefractometryData),
        visitDate: schema_1.visits.visitDate,
    })
        .from(schema_1.autorefractometryData)
        .leftJoin(schema_1.examinations, (0, drizzle_orm_1.eq)(schema_1.autorefractometryData.examinationId, schema_1.examinations.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, schema_1.visits.id))
        .where((0, drizzle_orm_1.eq)(schema_1.autorefractometryData.patientId, patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate ?? schema_1.autorefractometryData.createdAt));
}
async function getGlassesRecordsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db
        .select({
        ...(0, drizzle_orm_1.getTableColumns)(schema_1.glassesRecords),
        visitDate: schema_1.visits.visitDate,
    })
        .from(schema_1.glassesRecords)
        .leftJoin(schema_1.examinations, (0, drizzle_orm_1.eq)(schema_1.glassesRecords.examinationId, schema_1.examinations.id))
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, schema_1.visits.id))
        .where((0, drizzle_orm_1.eq)(schema_1.glassesRecords.patientId, patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate ?? schema_1.glassesRecords.createdAt));
}
async function getAfterRefractionByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    try {
        return await db
            .select({
            ...(0, drizzle_orm_1.getTableColumns)(schema_1.afterRefractionData),
            visitDate: schema_1.visits.visitDate,
        })
            .from(schema_1.afterRefractionData)
            .leftJoin(schema_1.examinations, (0, drizzle_orm_1.eq)(schema_1.afterRefractionData.examinationId, schema_1.examinations.id))
            .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.examinations.visitId, schema_1.visits.id))
            .where((0, drizzle_orm_1.eq)(schema_1.afterRefractionData.patientId, patientId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate ?? schema_1.afterRefractionData.createdAt));
    }
    catch (error) {
        const message = String(error?.message ?? "");
        if (message.includes("doesn't exist"))
            return [];
        throw error;
    }
}
// ============ PENTACAM OPERATIONS ============
async function createPentacamResult(pentacamData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Map input parameters to database columns
    const dbRecord = {
        visitId: pentacamData.visitId,
        patientId: pentacamData.patientId,
        recordedBy: pentacamData.recordedBy,
        pachymetryOD: pentacamData.pachymetryOD,
        pachymetryOS: pentacamData.pachymetryOS,
        // Right eye (OD) data
        k1OD: pentacamData.rtK1, // rtK1 = right K1 = OD K1
        k2OD: pentacamData.rtK2, // rtK2 = right K2 = OD K2
        axisOD: pentacamData.rtAX,
        thinnestPointOD: pentacamData.rtThinnestPoint,
        apexOD: pentacamData.rtApex,
        residualOD: pentacamData.rtResidual,
        tttOD: pentacamData.rtTTT,
        ablationOD: pentacamData.rtAblation,
        // Left eye (OS) data
        k1OS: pentacamData.ltK1, // ltK1 = left K1 = OS K1
        k2OS: pentacamData.ltK2,
        axisOS: pentacamData.ltAX,
        thinnestPointOS: pentacamData.ltThinnestPoint,
        apexOS: pentacamData.ltApex,
        residualOS: pentacamData.ltResidual,
        tttOS: pentacamData.ltTTT,
        ablationOS: pentacamData.ltAblation,
        notes: pentacamData.techniciansNotes,
    };
    const result = await db.insert(schema_1.pentacamResults).values(dbRecord);
    return result;
}
async function updatePentacamResult(resultId, pentacamData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    // Map input parameters to database columns
    const dbRecord = {};
    if (pentacamData.pachymetryOD)
        dbRecord.pachymetryOD = pentacamData.pachymetryOD;
    if (pentacamData.pachymetryOS)
        dbRecord.pachymetryOS = pentacamData.pachymetryOS;
    // Right eye (OD) data
    if (pentacamData.k1OD)
        dbRecord.k1OD = pentacamData.k1OD;
    if (pentacamData.k2OD)
        dbRecord.k2OD = pentacamData.k2OD;
    if (pentacamData.axisOD)
        dbRecord.axisOD = pentacamData.axisOD;
    if (pentacamData.thinnestPointOD)
        dbRecord.thinnestPointOD = pentacamData.thinnestPointOD;
    if (pentacamData.apexOD)
        dbRecord.apexOD = pentacamData.apexOD;
    if (pentacamData.residualOD)
        dbRecord.residualOD = pentacamData.residualOD;
    if (pentacamData.tttOD)
        dbRecord.tttOD = pentacamData.tttOD;
    if (pentacamData.ablationOD)
        dbRecord.ablationOD = pentacamData.ablationOD;
    // Left eye (OS) data
    if (pentacamData.k1OS)
        dbRecord.k1OS = pentacamData.k1OS;
    if (pentacamData.k2OS)
        dbRecord.k2OS = pentacamData.k2OS;
    if (pentacamData.axisOS)
        dbRecord.axisOS = pentacamData.axisOS;
    if (pentacamData.thinnestPointOS)
        dbRecord.thinnestPointOS = pentacamData.thinnestPointOS;
    if (pentacamData.apexOS)
        dbRecord.apexOS = pentacamData.apexOS;
    if (pentacamData.residualOS)
        dbRecord.residualOS = pentacamData.residualOS;
    if (pentacamData.tttOS)
        dbRecord.tttOS = pentacamData.tttOS;
    if (pentacamData.ablationOS)
        dbRecord.ablationOS = pentacamData.ablationOS;
    if (pentacamData.techniciansNotes)
        dbRecord.notes = pentacamData.techniciansNotes;
    if (pentacamData.recordedBy)
        dbRecord.recordedBy = pentacamData.recordedBy;
    await db.update(schema_1.pentacamResults).set(dbRecord).where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.id, resultId));
}
async function getPentacamResultsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.pentacamResults).where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, visitId));
}
/**
 * Create or update autorefraction data
 * Accepts either flattened object (from ExaminationForm) or nested object (from MedicalFilePanel)
 */
async function saveAutorefractometryData(dataInput) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const examinationId = Number(dataInput.examinationId ?? 0);
    const patientId = Number(dataInput.patientId ?? 0);
    if (!Number.isFinite(examinationId) || examinationId <= 0) {
        throw new Error("saveAutorefractometryData: missing valid examinationId");
    }
    if (!Number.isFinite(patientId) || patientId <= 0) {
        throw new Error("saveAutorefractometryData: missing valid patientId");
    }
    // Check if record already exists
    const existing = await db.select().from(schema_1.autorefractometryData)
        .where((0, drizzle_orm_1.eq)(schema_1.autorefractometryData.examinationId, examinationId))
        .limit(1);
    const dbRecord = {
        examinationId,
        patientId,
    };
    // Handle both flattened format (from ExaminationForm) and nested format (from MedicalFilePanel)
    if (dataInput.sphereOD)
        dbRecord.sphereOD = dataInput.sphereOD;
    else if (dataInput.od?.s)
        dbRecord.sphereOD = dataInput.od.s;
    if (dataInput.cylinderOD)
        dbRecord.cylinderOD = dataInput.cylinderOD;
    else if (dataInput.od?.c)
        dbRecord.cylinderOD = dataInput.od.c;
    if (dataInput.axisOD)
        dbRecord.axisOD = dataInput.axisOD;
    else if (dataInput.od?.axis)
        dbRecord.axisOD = dataInput.od.axis;
    if (dataInput.ucvaOD)
        dbRecord.ucvaOD = dataInput.ucvaOD;
    else if (dataInput.od?.ucva)
        dbRecord.ucvaOD = dataInput.od.ucva;
    if (dataInput.bcvaOD)
        dbRecord.bcvaOD = dataInput.bcvaOD;
    else if (dataInput.od?.bcva)
        dbRecord.bcvaOD = dataInput.od.bcva;
    if (dataInput.sphereOS)
        dbRecord.sphereOS = dataInput.sphereOS;
    else if (dataInput.os?.s)
        dbRecord.sphereOS = dataInput.os.s;
    if (dataInput.cylinderOS)
        dbRecord.cylinderOS = dataInput.cylinderOS;
    else if (dataInput.os?.c)
        dbRecord.cylinderOS = dataInput.os.c;
    if (dataInput.axisOS)
        dbRecord.axisOS = dataInput.axisOS;
    else if (dataInput.os?.axis)
        dbRecord.axisOS = dataInput.os.axis;
    if (dataInput.ucvaOS)
        dbRecord.ucvaOS = dataInput.ucvaOS;
    else if (dataInput.os?.ucva)
        dbRecord.ucvaOS = dataInput.os.ucva;
    if (dataInput.bcvaOS)
        dbRecord.bcvaOS = dataInput.bcvaOS;
    else if (dataInput.os?.bcva)
        dbRecord.bcvaOS = dataInput.os.bcva;
    // IOP
    if (dataInput.iopOD)
        dbRecord.iopOD = dataInput.iopOD;
    else if (dataInput.iop?.od)
        dbRecord.iopOD = dataInput.iop.od;
    else if (dataInput.od?.airPuff1)
        dbRecord.iopOD = dataInput.od.airPuff1;
    else if (dataInput.od?.airPuff2)
        dbRecord.iopOD = dataInput.od.airPuff2;
    else if (dataInput.od?.airPuff3)
        dbRecord.iopOD = dataInput.od.airPuff3;
    if (dataInput.iopOS)
        dbRecord.iopOS = dataInput.iopOS;
    else if (dataInput.iop?.os)
        dbRecord.iopOS = dataInput.iop.os;
    else if (dataInput.os?.airPuff1)
        dbRecord.iopOS = dataInput.os.airPuff1;
    else if (dataInput.os?.airPuff2)
        dbRecord.iopOS = dataInput.os.airPuff2;
    else if (dataInput.os?.airPuff3)
        dbRecord.iopOS = dataInput.os.airPuff3;
    if (existing.length > 0) {
        await db.update(schema_1.autorefractometryData)
            .set(dbRecord)
            .where((0, drizzle_orm_1.eq)(schema_1.autorefractometryData.examinationId, examinationId));
        return existing[0];
    }
    else {
        await db.insert(schema_1.autorefractometryData).values(dbRecord);
        const [newRecord] = await db.select().from(schema_1.autorefractometryData)
            .where((0, drizzle_orm_1.eq)(schema_1.autorefractometryData.examinationId, examinationId));
        return newRecord;
    }
}
/**
 * Create or update glasses records
 * Accepts either flattened object (from ExaminationForm) or nested object (from MedicalFilePanel)
 */
async function saveGlassesRecord(dataInput) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const examinationId = dataInput.examinationId;
    const patientId = dataInput.patientId;
    // Check if record already exists
    const existing = await db.select().from(schema_1.glassesRecords)
        .where((0, drizzle_orm_1.eq)(schema_1.glassesRecords.examinationId, examinationId))
        .limit(1);
    const dbRecord = {
        examinationId,
        patientId,
    };
    // Handle both flattened format (from ExaminationForm) and nested format (from MedicalFilePanel)
    if (dataInput.sOD)
        dbRecord.sOD = dataInput.sOD;
    else if (dataInput.od?.s)
        dbRecord.sOD = dataInput.od.s;
    if (dataInput.cOD)
        dbRecord.cOD = dataInput.cOD;
    else if (dataInput.od?.c)
        dbRecord.cOD = dataInput.od.c;
    if (dataInput.axisOD)
        dbRecord.axisOD = dataInput.axisOD;
    else if (dataInput.od?.axis)
        dbRecord.axisOD = dataInput.od.axis;
    if (dataInput.pdOD)
        dbRecord.pdOD = dataInput.pdOD;
    else if (dataInput.od?.pd)
        dbRecord.pdOD = dataInput.od.pd;
    if (dataInput.addOD)
        dbRecord.addOD = dataInput.addOD;
    else if (dataInput.od?.add)
        dbRecord.addOD = dataInput.od.add;
    if (dataInput.bcvaOD)
        dbRecord.bcvaOD = dataInput.bcvaOD;
    else if (dataInput.od?.bcva)
        dbRecord.bcvaOD = dataInput.od.bcva;
    if (dataInput.sOS)
        dbRecord.sOS = dataInput.sOS;
    else if (dataInput.os?.s)
        dbRecord.sOS = dataInput.os.s;
    if (dataInput.cOS)
        dbRecord.cOS = dataInput.cOS;
    else if (dataInput.os?.c)
        dbRecord.cOS = dataInput.os.c;
    if (dataInput.axisOS)
        dbRecord.axisOS = dataInput.axisOS;
    else if (dataInput.os?.axis)
        dbRecord.axisOS = dataInput.os.axis;
    if (dataInput.pdOS)
        dbRecord.pdOS = dataInput.pdOS;
    else if (dataInput.os?.pd)
        dbRecord.pdOS = dataInput.os.pd;
    if (dataInput.addOS)
        dbRecord.addOS = dataInput.addOS;
    else if (dataInput.os?.add)
        dbRecord.addOS = dataInput.os.add;
    if (dataInput.bcvaOS)
        dbRecord.bcvaOS = dataInput.bcvaOS;
    else if (dataInput.os?.bcva)
        dbRecord.bcvaOS = dataInput.os.bcva;
    if (existing.length > 0) {
        await db.update(schema_1.glassesRecords)
            .set(dbRecord)
            .where((0, drizzle_orm_1.eq)(schema_1.glassesRecords.examinationId, examinationId));
        return existing[0];
    }
    else {
        await db.insert(schema_1.glassesRecords).values(dbRecord);
        const [newRecord] = await db.select().from(schema_1.glassesRecords)
            .where((0, drizzle_orm_1.eq)(schema_1.glassesRecords.examinationId, examinationId));
        return newRecord;
    }
}
async function saveAfterRefractionData(dataInput) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const examinationId = Number(dataInput.examinationId ?? 0);
    const patientId = Number(dataInput.patientId ?? 0);
    if (!Number.isFinite(examinationId) || examinationId <= 0) {
        throw new Error("saveAfterRefractionData: missing valid examinationId");
    }
    if (!Number.isFinite(patientId) || patientId <= 0) {
        throw new Error("saveAfterRefractionData: missing valid patientId");
    }
    let existing = [];
    try {
        existing = await db
            .select()
            .from(schema_1.afterRefractionData)
            .where((0, drizzle_orm_1.eq)(schema_1.afterRefractionData.examinationId, examinationId))
            .limit(1);
    }
    catch (error) {
        const message = String(error?.message ?? "");
        if (message.includes("doesn't exist"))
            return null;
        throw error;
    }
    const dbRecord = {
        examinationId,
        patientId,
        sphereOD: dataInput.sphereOD ?? dataInput.od?.s ?? null,
        cylinderOD: dataInput.cylinderOD ?? dataInput.od?.c ?? null,
        axisOD: dataInput.axisOD ?? dataInput.od?.axis ?? null,
        sphereOS: dataInput.sphereOS ?? dataInput.os?.s ?? null,
        cylinderOS: dataInput.cylinderOS ?? dataInput.os?.c ?? null,
        axisOS: dataInput.axisOS ?? dataInput.os?.axis ?? null,
    };
    if (existing.length > 0) {
        try {
            await db
                .update(schema_1.afterRefractionData)
                .set(dbRecord)
                .where((0, drizzle_orm_1.eq)(schema_1.afterRefractionData.examinationId, examinationId));
        }
        catch (error) {
            const message = String(error?.message ?? "");
            if (message.includes("doesn't exist"))
                return null;
            throw error;
        }
        return existing[0];
    }
    try {
        await db.insert(schema_1.afterRefractionData).values(dbRecord);
        const [newRecord] = await db
            .select()
            .from(schema_1.afterRefractionData)
            .where((0, drizzle_orm_1.eq)(schema_1.afterRefractionData.examinationId, examinationId));
        return newRecord;
    }
    catch (error) {
        const message = String(error?.message ?? "");
        if (message.includes("doesn't exist"))
            return null;
        throw error;
    }
}
async function getPentacamResultsByPatient(patientId, limit = 100) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(500, Number(limit))) : 100;
    return await db
        .select({
        ...(0, drizzle_orm_1.getTableColumns)(schema_1.pentacamResults),
        visitDate: schema_1.visits.visitDate,
    })
        .from(schema_1.pentacamResults)
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, schema_1.visits.id))
        .where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.patientId, patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.visits.visitDate ?? schema_1.pentacamResults.createdAt))
        .limit(safeLimit);
}
/**
 * Pentacam list rows with patient + visit + doctor (lookup) for dashboard UI.
 */
async function getPentacamResultsForDashboard(filters) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const safeLimit = Number.isFinite(Number(filters.limit))
        ? Math.max(1, Math.min(500, Number(filters.limit)))
        : 150;
    const safeOffset = Number.isFinite(Number(filters.offset)) ? Math.max(0, Number(filters.offset)) : 0;
    const clauses = [];
    if (filters.resultId !== undefined && Number.isFinite(Number(filters.resultId)) && Number(filters.resultId) > 0) {
        clauses.push((0, drizzle_orm_1.eq)(schema_1.pentacamResults.id, Number(filters.resultId)));
    }
    if (filters.visitId !== undefined && Number.isFinite(Number(filters.visitId))) {
        clauses.push((0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, Number(filters.visitId)));
    }
    if (filters.patientId !== undefined && Number.isFinite(Number(filters.patientId)) && Number(filters.patientId) > 0) {
        clauses.push((0, drizzle_orm_1.eq)(schema_1.pentacamResults.patientId, Number(filters.patientId)));
    }
    const fromD = String(filters.fromDate ?? "").trim();
    const toD = String(filters.toDate ?? "").trim();
    if (fromD || toD) {
        const fromBound = fromD || "1970-01-01";
        const toBound = toD || "2099-12-31";
        clauses.push((0, drizzle_orm_1.sql) `DATE(COALESCE(${schema_1.visits.visitDate}, ${schema_1.pentacamResults.createdAt})) >= ${fromBound}`);
        clauses.push((0, drizzle_orm_1.sql) `DATE(COALESCE(${schema_1.visits.visitDate}, ${schema_1.pentacamResults.createdAt})) <= ${toBound}`);
    }
    const normalizedSearch = String(filters.search ?? "").trim();
    if (normalizedSearch) {
        const term = `%${normalizedSearch}%`;
        const legacyTerm = `%${encodeForLegacySearch(normalizedSearch)}%`;
        clauses.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.patients.fullName, term), (0, drizzle_orm_1.like)(schema_1.patients.fullName, legacyTerm), (0, drizzle_orm_1.like)(schema_1.doctorsLookup.name, term), (0, drizzle_orm_1.like)(schema_1.doctorsLookup.name, legacyTerm)));
    }
    const whereExpr = clauses.length > 0 ? (0, drizzle_orm_1.and)(...clauses) : undefined;
    const rows = await db
        .select({
        ...(0, drizzle_orm_1.getTableColumns)(schema_1.pentacamResults),
        visitDate: schema_1.visits.visitDate,
        patientFullName: schema_1.patients.fullName,
        doctorDisplayName: schema_1.doctorsLookup.name,
    })
        .from(schema_1.pentacamResults)
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, schema_1.visits.id))
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.pentacamResults.patientId, schema_1.patients.id))
        .leftJoin(schema_1.doctorsLookup, (0, drizzle_orm_1.eq)(schema_1.patients.doctorCode, schema_1.doctorsLookup.code))
        .where(whereExpr)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `COALESCE(${schema_1.visits.visitDate}, ${schema_1.pentacamResults.createdAt})`))
        .limit(safeLimit)
        .offset(safeOffset);
    return rows.map((row) => ({
        ...row,
        patientFullName: decodeMojibake(row.patientFullName),
        doctorDisplayName: decodeMojibake(row.doctorDisplayName),
    }));
}
async function getPentacamDashboardDayStats() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({
        todayCount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN DATE(COALESCE(${schema_1.visits.visitDate}, ${schema_1.pentacamResults.createdAt})) = CURDATE() THEN 1 ELSE 0 END), 0)`,
        yesterdayCount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN DATE(COALESCE(${schema_1.visits.visitDate}, ${schema_1.pentacamResults.createdAt})) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END), 0)`,
    })
        .from(schema_1.pentacamResults)
        .leftJoin(schema_1.visits, (0, drizzle_orm_1.eq)(schema_1.pentacamResults.visitId, schema_1.visits.id));
    const r = rows[0];
    return {
        todayCount: Number(r?.todayCount ?? 0),
        yesterdayCount: Number(r?.yesterdayCount ?? 0),
    };
}
async function getRecentPentacamResultNotes(limit = 50000) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100000, Number(limit))) : 50000;
    const rows = await db
        .select({ notes: schema_1.pentacamResults.notes })
        .from(schema_1.pentacamResults)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.pentacamResults.createdAt))
        .limit(safeLimit);
    return rows.map((row) => String(row.notes ?? ""));
}
async function getRecentPentacamLocalResults(limit = 50000) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(100000, Number(limit))) : 50000;
    return await db
        .select({
        id: schema_1.pentacamResults.id,
        patientId: schema_1.pentacamResults.patientId,
        notes: schema_1.pentacamResults.notes,
        createdAt: schema_1.pentacamResults.createdAt,
        updatedAt: schema_1.pentacamResults.updatedAt,
    })
        .from(schema_1.pentacamResults)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.pentacamResults.createdAt))
        .limit(safeLimit);
}
async function reassignPentacamResultPatient(resultId, patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db
        .update(schema_1.pentacamResults)
        .set({ patientId })
        .where((0, drizzle_orm_1.eq)(schema_1.pentacamResults.id, resultId));
}
async function deletePentacamResultsByIds(ids) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalized = Array.from(new Set((ids ?? [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)));
    if (normalized.length === 0)
        return 0;
    await db.delete(schema_1.pentacamResults).where((0, drizzle_orm_1.inArray)(schema_1.pentacamResults.id, normalized));
    return normalized.length;
}
// ============ DOCTOR REPORT OPERATIONS ============
async function createDoctorReport(reportData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.doctorReports).values(reportData);
    return result;
}
async function updateDoctorReport(reportId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.doctorReports).set(updates).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.id, reportId));
}
async function getDoctorReportsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.visitId, visitId));
}
async function getAllDoctorReports() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.doctorReports).orderBy((0, drizzle_orm_1.desc)(schema_1.doctorReports.createdAt));
}
/** Joined rows for التقارير الطبية hub (جدول + إحصائيات). */
async function getMedicalReportsOverviewRows(limit = 250) {
    const dbConn = await getDb();
    if (!dbConn)
        throw new Error("Database not available");
    const cap = Math.min(Math.max(limit, 1), 500);
    const rows = await dbConn
        .select({
        id: schema_1.doctorReports.id,
        visitId: schema_1.doctorReports.visitId,
        patientId: schema_1.doctorReports.patientId,
        doctorUserId: schema_1.doctorReports.doctorId,
        diagnosis: schema_1.doctorReports.diagnosis,
        diseases: schema_1.doctorReports.diseases,
        treatment: schema_1.doctorReports.treatment,
        recommendations: schema_1.doctorReports.recommendations,
        visitDate: schema_1.doctorReports.visitDate,
        operationType: schema_1.doctorReports.operationType,
        clinicalOpinion: schema_1.doctorReports.clinicalOpinion,
        additionalNotes: schema_1.doctorReports.additionalNotes,
        createdAt: schema_1.doctorReports.createdAt,
        updatedAt: schema_1.doctorReports.updatedAt,
        patientName: schema_1.patients.fullName,
        patientCode: schema_1.patients.patientCode,
        doctorName: schema_1.users.name,
    })
        .from(schema_1.doctorReports)
        .leftJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.doctorReports.patientId, schema_1.patients.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.doctorReports.doctorId, schema_1.users.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.doctorReports.createdAt))
        .limit(cap);
    return rows;
}
async function getDoctorReportsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.doctorReports.createdAt));
}
async function deleteDoctorReport(reportId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.doctorReports).where((0, drizzle_orm_1.eq)(schema_1.doctorReports.id, reportId));
}
// ============ PRESCRIPTION OPERATIONS ============
async function createPrescription(prescriptionData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const { medicationName, dosage, frequency, duration, instructions, ...base } = prescriptionData ?? {};
    const result = await db.insert(schema_1.prescriptions).values({
        ...base,
        prescriptionDate: base.prescriptionDate ?? new Date(),
    });
    if (medicationName) {
        const existing = await db.select().from(schema_1.medications).where((0, drizzle_orm_1.eq)(schema_1.medications.name, medicationName)).limit(1);
        let medicationId;
        if (existing.length > 0) {
            medicationId = existing[0].id;
        }
        else {
            const inserted = await db.insert(schema_1.medications).values({
                name: medicationName,
                type: "other",
            });
            medicationId = inserted.insertId;
        }
        await db.insert(schema_1.prescriptionItems).values({
            prescriptionId: result.insertId,
            medicationId,
            dosage: dosage ?? null,
            frequency: frequency ?? null,
            duration: duration ?? null,
            instructions: instructions ?? null,
        });
    }
    return result;
}
async function getPrescriptionsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.visitId, visitId));
}
async function getPrescriptionsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.prescriptions.prescriptionDate));
}
async function getPrescriptionsWithItemsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({
        prescriptionId: schema_1.prescriptions.id,
        prescriptionDate: schema_1.prescriptions.prescriptionDate,
        notes: schema_1.prescriptions.notes,
        itemId: schema_1.prescriptionItems.id,
        medicationId: schema_1.prescriptionItems.medicationId,
        medicationName: schema_1.medications.name,
        dosage: schema_1.prescriptionItems.dosage,
        frequency: schema_1.prescriptionItems.frequency,
        duration: schema_1.prescriptionItems.duration,
        instructions: schema_1.prescriptionItems.instructions,
    })
        .from(schema_1.prescriptions)
        .leftJoin(schema_1.prescriptionItems, (0, drizzle_orm_1.eq)(schema_1.prescriptions.id, schema_1.prescriptionItems.prescriptionId))
        .leftJoin(schema_1.medications, (0, drizzle_orm_1.eq)(schema_1.prescriptionItems.medicationId, schema_1.medications.id))
        .where((0, drizzle_orm_1.eq)(schema_1.prescriptions.visitId, visitId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.prescriptions.prescriptionDate));
    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.prescriptionId]) {
            grouped[row.prescriptionId] = {
                id: row.prescriptionId,
                prescriptionDate: row.prescriptionDate,
                notes: row.notes ?? "",
                items: [],
            };
        }
        if (row.itemId) {
            grouped[row.prescriptionId].items.push({
                id: row.itemId,
                medicationId: row.medicationId,
                medicationName: row.medicationName ?? "",
                dosage: row.dosage ?? "",
                frequency: row.frequency ?? "",
                duration: row.duration ?? "",
                instructions: row.instructions ?? "",
            });
        }
    }
    return Object.values(grouped);
}
async function getPrescriptionsWithItemsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({
        prescriptionId: schema_1.prescriptions.id,
        prescriptionDate: schema_1.prescriptions.prescriptionDate,
        notes: schema_1.prescriptions.notes,
        itemId: schema_1.prescriptionItems.id,
        medicationName: schema_1.medications.name,
        dosage: schema_1.prescriptionItems.dosage,
        frequency: schema_1.prescriptionItems.frequency,
        duration: schema_1.prescriptionItems.duration,
        instructions: schema_1.prescriptionItems.instructions,
    })
        .from(schema_1.prescriptions)
        .leftJoin(schema_1.prescriptionItems, (0, drizzle_orm_1.eq)(schema_1.prescriptions.id, schema_1.prescriptionItems.prescriptionId))
        .leftJoin(schema_1.medications, (0, drizzle_orm_1.eq)(schema_1.prescriptionItems.medicationId, schema_1.medications.id))
        .where((0, drizzle_orm_1.eq)(schema_1.prescriptions.patientId, patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.prescriptions.prescriptionDate));
    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.prescriptionId]) {
            grouped[row.prescriptionId] = {
                id: row.prescriptionId,
                prescriptionDate: row.prescriptionDate,
                notes: row.notes ?? "",
                items: [],
            };
        }
        if (row.itemId) {
            grouped[row.prescriptionId].items.push({
                id: row.itemId,
                medicationName: row.medicationName ?? "",
                dosage: row.dosage ?? "",
                frequency: row.frequency ?? "",
                duration: row.duration ?? "",
                instructions: row.instructions ?? "",
            });
        }
    }
    return Object.values(grouped);
}
/** Recent prescriptions joined with patient/user for overview table (counts items in-memory). */
async function getPrescriptionsOverviewRows(limit = 250) {
    const dbConn = await getDb();
    if (!dbConn)
        throw new Error("Database not available");
    const cap = Math.min(Math.max(limit, 1), 500);
    const base = await dbConn
        .select({
        id: schema_1.prescriptions.id,
        patientId: schema_1.prescriptions.patientId,
        prescriptionDate: schema_1.prescriptions.prescriptionDate,
        notes: schema_1.prescriptions.notes,
        doctorId: schema_1.prescriptions.doctorId,
        doctorName: schema_1.users.name,
        patientName: schema_1.patients.fullName,
        patientCode: schema_1.patients.patientCode,
    })
        .from(schema_1.prescriptions)
        .leftJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.prescriptions.patientId, schema_1.patients.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.prescriptions.doctorId, schema_1.users.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.prescriptions.prescriptionDate))
        .limit(cap);
    if (base.length === 0)
        return [];
    const ids = base.map((r) => r.id);
    const countRows = await dbConn
        .select({
        prescriptionId: schema_1.prescriptionItems.prescriptionId,
        cnt: (0, drizzle_orm_1.sql) `cast(count(*) as signed)`.mapWith(Number),
    })
        .from(schema_1.prescriptionItems)
        .where((0, drizzle_orm_1.inArray)(schema_1.prescriptionItems.prescriptionId, ids))
        .groupBy(schema_1.prescriptionItems.prescriptionId);
    const countMap = new Map(countRows.map((r) => [r.prescriptionId, r.cnt]));
    return base.map((r) => ({
        ...r,
        itemCount: countMap.get(r.id) ?? 0,
    }));
}
async function createPrescriptionWithItems(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const validItems = data.items.filter((item) => {
        const hasId = typeof item.medicationId === "number" && item.medicationId > 0;
        const hasName = Boolean(item.medicationName && item.medicationName.trim());
        return hasId || hasName;
    });
    console.log("[createPrescriptionWithItems] validItems", {
        total: data.items.length,
        valid: validItems.length,
        first: validItems[0],
    });
    if (validItems.length === 0) {
        throw new Error("Cannot create prescription without items");
    }
    const prescription = await db.insert(schema_1.prescriptions).values({
        patientId: data.patientId,
        visitId: data.visitId ?? null,
        doctorId: data.doctorId ?? null,
        notes: data.notes ?? null,
        prescriptionDate: data.date ? new Date(data.date) : new Date(),
    });
    let prescriptionId = prescription.insertId;
    if (!prescriptionId) {
        const lastIdResult = await db.execute((0, drizzle_orm_1.sql) `select last_insert_id() as id`);
        const rows = lastIdResult?.[0] ?? lastIdResult?.rows ?? lastIdResult;
        const resolvedId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
        prescriptionId = resolvedId ? Number(resolvedId) : undefined;
    }
    if (!prescriptionId)
        return prescription;
    for (const item of validItems) {
        const providedId = typeof item.medicationId === "number" && item.medicationId > 0 ? item.medicationId : undefined;
        let medicationId = providedId;
        if (!medicationId) {
            const name = item.medicationName?.trim();
            if (!name)
                continue;
            const existing = await db.select().from(schema_1.medications).where((0, drizzle_orm_1.eq)(schema_1.medications.name, name)).limit(1);
            if (existing.length > 0) {
                medicationId = existing[0].id;
            }
            else {
                const inserted = await db.insert(schema_1.medications).values({ name, type: "other" });
                medicationId = inserted.insertId;
            }
        }
        await db.insert(schema_1.prescriptionItems).values({
            prescriptionId,
            medicationId,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            duration: item.duration ?? null,
            instructions: item.instructions ?? null,
        });
    }
    return prescription;
}
async function deletePrescription(prescriptionId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.prescriptionItems).where((0, drizzle_orm_1.eq)(schema_1.prescriptionItems.prescriptionId, prescriptionId));
    await db.delete(schema_1.prescriptions).where((0, drizzle_orm_1.eq)(schema_1.prescriptions.id, prescriptionId));
}
// ============ SURGERY OPERATIONS ============
async function createSurgery(surgeryData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.surgeries).values(surgeryData);
    return result;
}
async function getSurgeriesByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.surgeries).where((0, drizzle_orm_1.eq)(schema_1.surgeries.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.surgeries.surgeryDate));
}
async function deleteSurgery(surgeryId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.surgeries).where((0, drizzle_orm_1.eq)(schema_1.surgeries.id, surgeryId));
}
async function updateSurgery(surgeryId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.surgeries).set(updates).where((0, drizzle_orm_1.eq)(schema_1.surgeries.id, surgeryId));
}
// ============ POST-OP FOLLOWUP OPERATIONS ============
async function createPostOpFollowup(followupData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.postOpFollowups).values(followupData);
    return result;
}
async function getPostOpFollowupsBySurgery(surgeryId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.postOpFollowups).where((0, drizzle_orm_1.eq)(schema_1.postOpFollowups.surgeryId, surgeryId)).orderBy((0, drizzle_orm_1.desc)(schema_1.postOpFollowups.followupDate));
}
async function getPostOpFollowupsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.postOpFollowups).where((0, drizzle_orm_1.eq)(schema_1.postOpFollowups.patientId, patientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.postOpFollowups.followupDate));
}
// ============ CONSENT FORM OPERATIONS ============
async function createConsentForm(consentData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.consentForms).values(consentData);
    return result;
}
async function getConsentFormsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.consentForms).where((0, drizzle_orm_1.eq)(schema_1.consentForms.patientId, patientId));
}
// ============ MEDICAL HISTORY OPERATIONS ============
async function createMedicalHistory(historyData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.medicalHistoryChecklist).values(historyData);
    return result;
}
async function getMedicalHistoryByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.medicalHistoryChecklist).where((0, drizzle_orm_1.eq)(schema_1.medicalHistoryChecklist.patientId, patientId));
}
// ============ AUDIT LOG OPERATIONS ============
async function createAuditLog(logData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.auditLogs).values(logData);
    return result;
}
async function getAuditLogs(limit = 100) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.auditLogs).orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.createdAt)).limit(limit);
}
// ============ MEDICATION OPERATIONS ============
async function createMedication(medicationData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.medications).values(medicationData);
    return result;
}
async function getAllMedications() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.medications);
}
async function updateMedication(medicationId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.medications).set(updates).where((0, drizzle_orm_1.eq)(schema_1.medications.id, medicationId));
}
async function deleteMedication(medicationId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.medications).where((0, drizzle_orm_1.eq)(schema_1.medications.id, medicationId));
}
// ============ TEST OPERATIONS ============
async function createTest(testData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.tests).values(testData);
    return result;
}
async function getAllTests() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.tests);
}
async function updateTest(testId, updates) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.tests).set(updates).where((0, drizzle_orm_1.eq)(schema_1.tests.id, testId));
}
async function deleteTest(testId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.tests).where((0, drizzle_orm_1.eq)(schema_1.tests.id, testId));
}
async function getTestFavoritesByUser(userId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.testFavorites).where((0, drizzle_orm_1.eq)(schema_1.testFavorites.userId, userId));
}
async function toggleTestFavorite(userId, testId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const existing = await db
        .select()
        .from(schema_1.testFavorites)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.testFavorites.userId, userId), (0, drizzle_orm_1.eq)(schema_1.testFavorites.testId, testId)))
        .limit(1);
    if (existing.length > 0) {
        await db
            .delete(schema_1.testFavorites)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.testFavorites.userId, userId), (0, drizzle_orm_1.eq)(schema_1.testFavorites.testId, testId)));
        return { favorite: false };
    }
    await db.insert(schema_1.testFavorites).values({
        userId,
        testId,
        createdAt: new Date(),
    });
    return { favorite: true };
}
// ============ TEST REQUEST OPERATIONS ============
async function createTestRequest(requestData) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.testRequests).values(requestData);
    return result;
}
async function createTestRequestItems(items) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    if (items.length === 0)
        return;
    await db.insert(schema_1.testRequestItems).values(items);
}
async function getTestRequestsByVisit(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const requestData = await db.select().from(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.visitId, visitId));
    // Get items for each request with test names
    const withItems = await Promise.all(requestData.map(async (req) => {
        const items = await db
            .select({
            id: schema_1.testRequestItems.id,
            testId: schema_1.testRequestItems.testId,
            testName: schema_1.tests.name,
            result: schema_1.testRequestItems.result,
        })
            .from(schema_1.testRequestItems)
            .innerJoin(schema_1.tests, (0, drizzle_orm_1.eq)(schema_1.testRequestItems.testId, schema_1.tests.id))
            .where((0, drizzle_orm_1.eq)(schema_1.testRequestItems.testRequestId, req.id));
        return { ...req, items };
    }));
    return withItems;
}
async function getTestRequestsByPatient(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const requestData = await db.select().from(schema_1.testRequests).where((0, drizzle_orm_1.eq)(schema_1.testRequests.patientId, patientId));
    // Get items for each request with test names
    const withItems = await Promise.all(requestData.map(async (req) => {
        const items = await db
            .select({
            id: schema_1.testRequestItems.id,
            testId: schema_1.testRequestItems.testId,
            testName: schema_1.tests.name,
            result: schema_1.testRequestItems.result,
        })
            .from(schema_1.testRequestItems)
            .innerJoin(schema_1.tests, (0, drizzle_orm_1.eq)(schema_1.testRequestItems.testId, schema_1.tests.id))
            .where((0, drizzle_orm_1.eq)(schema_1.testRequestItems.testRequestId, req.id));
        return { ...req, items };
    }));
    return withItems;
}
// ============ SYSTEM SETTINGS OPERATIONS ============
async function getSystemSettings() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.systemSettings);
}
async function getSystemSetting(key) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db.select().from(schema_1.systemSettings).where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, key)).limit(1);
    const row = rows[0] ?? null;
    if (!row)
        return null;
    const marker = String(row.value ?? "");
    const chunkPrefix = "__chunked_json_v1__:";
    if (!marker.startsWith(chunkPrefix))
        return row;
    const partCount = Number(marker.slice(chunkPrefix.length));
    if (!Number.isFinite(partCount) || partCount <= 0)
        return row;
    const parts = [];
    for (let i = 0; i < partCount; i += 1) {
        const partKey = `${key}__chunk_${i}`;
        const partRows = await db.select().from(schema_1.systemSettings).where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, partKey)).limit(1);
        parts.push(String(partRows[0]?.value ?? ""));
    }
    return {
        ...row,
        value: parts.join(""),
    };
}
async function updateSystemSettings(key, value) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const chunkPrefix = "__chunked_json_v1__:";
    const maxTextBytes = 60000;
    const chunkBytes = 24000;
    const serialized = JSON.stringify(value);
    const payloadBytes = Buffer.byteLength(serialized, "utf8");
    const upsertRaw = async (settingKey, settingValue) => {
        const existing = await db.select().from(schema_1.systemSettings).where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, settingKey)).limit(1);
        if (existing.length > 0) {
            await db
                .update(schema_1.systemSettings)
                .set({ value: settingValue, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.systemSettings.key, settingKey));
        }
        else {
            await db.insert(schema_1.systemSettings).values({ key: settingKey, value: settingValue });
        }
    };
    const cleanupChunks = async () => {
        const chunkRows = await db
            .select({ key: schema_1.systemSettings.key })
            .from(schema_1.systemSettings)
            .where((0, drizzle_orm_1.like)(schema_1.systemSettings.key, `${key}__chunk_%`));
        if (chunkRows.length > 0) {
            await db
                .delete(schema_1.systemSettings)
                .where((0, drizzle_orm_1.inArray)(schema_1.systemSettings.key, chunkRows.map((row) => String(row.key))));
        }
    };
    if (payloadBytes <= maxTextBytes) {
        await upsertRaw(key, serialized);
        await cleanupChunks();
        return;
    }
    const chunks = [];
    let cursor = 0;
    while (cursor < serialized.length) {
        let end = cursor + Math.min(12000, serialized.length - cursor);
        while (end < serialized.length && Buffer.byteLength(serialized.slice(cursor, end), "utf8") < chunkBytes) {
            end += 1;
        }
        if (end > serialized.length)
            end = serialized.length;
        while (end > cursor && Buffer.byteLength(serialized.slice(cursor, end), "utf8") > chunkBytes) {
            end -= 1;
        }
        if (end <= cursor)
            end = Math.min(serialized.length, cursor + 1);
        chunks.push(serialized.slice(cursor, end));
        cursor = end;
    }
    for (let i = 0; i < chunks.length; i += 1) {
        await upsertRaw(`${key}__chunk_${i}`, chunks[i]);
    }
    await upsertRaw(key, `${chunkPrefix}${chunks.length}`);
    const staleChunkRows = await db
        .select({ key: schema_1.systemSettings.key })
        .from(schema_1.systemSettings)
        .where((0, drizzle_orm_1.like)(schema_1.systemSettings.key, `${key}__chunk_%`));
    const keep = new Set(chunks.map((_, i) => `${key}__chunk_${i}`));
    const stale = staleChunkRows.map((row) => String(row.key)).filter((chunkKey) => !keep.has(chunkKey));
    if (stale.length > 0) {
        await db.delete(schema_1.systemSettings).where((0, drizzle_orm_1.inArray)(schema_1.systemSettings.key, stale));
    }
}
const TEAM_PERMISSION_ROLES = ["admin", "manager", "accountant", "doctor", "nurse", "technician", "reception"];
const TEAM_PERMISSIONS_SETTING_KEY = "team_permissions_v1";
const EMPTY_PERMISSION_OVERRIDE = "__EMPTY_PERMISSION_OVERRIDE__";
/** When present with optional paths, effective permissions = live role defaults ∪ stored paths (extras only). */
const INHERIT_WITH_EXTRAS_MARKER = "__INHERIT_WITH_EXTRAS__";
function normalizePermissionList(value) {
    return Array.from(new Set(Array.from(value)
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0))).sort();
}
function arePermissionListsEqual(left, right) {
    const leftNormalized = normalizePermissionList(left);
    const rightNormalized = normalizePermissionList(right);
    if (leftNormalized.length !== rightNormalized.length)
        return false;
    return leftNormalized.every((entry, index) => entry === rightNormalized[index]);
}
/** Strip :r / :rw suffixes so team defaults (from Admin Permissions) match user rows saved as bare paths (from Admin Users). */
function normalizePermissionPathsForTeamMirror(paths) {
    return normalizePermissionList(Array.from(paths, (p) => String(p ?? "").trim().replace(/:r[w]?$/i, "")));
}
/** True when this user's stored permissions are the same access set as the previous team snapshot for their role (sync target). */
function userPermissionsMirrorTeamSnapshot(userPages, teamPages) {
    return arePermissionListsEqual(normalizePermissionPathsForTeamMirror(userPages), normalizePermissionPathsForTeamMirror(teamPages));
}
async function getUserPermissionState(userId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db.select().from(schema_1.userPermissions).where((0, drizzle_orm_1.eq)(schema_1.userPermissions.userId, userId));
    const rawPageIds = rows
        .map((row) => String(row.pageId ?? "").trim())
        .filter((pageId) => pageId.length > 0);
    const hasExplicitEmptyOverride = rawPageIds.includes(EMPTY_PERMISSION_OVERRIDE);
    const hasInheritExtrasMarker = rawPageIds.includes(INHERIT_WITH_EXTRAS_MARKER);
    const pageIds = rawPageIds.filter((pageId) => pageId !== EMPTY_PERMISSION_OVERRIDE && pageId !== INHERIT_WITH_EXTRAS_MARKER);
    return {
        hasOverride: rawPageIds.length > 0,
        hasExplicitEmptyOverride,
        hasInheritExtrasMarker,
        pageIds,
    };
}
async function getUserPermissions(userId) {
    const state = await getUserPermissionState(userId);
    return state.pageIds;
}
function getDefaultTeamPermissions() {
    return {
        admin: [],
        manager: [],
        accountant: ["/appointments", "/ops/mssql-add"],
        reception: [],
        nurse: [],
        technician: [],
        doctor: ["/prescription"],
    };
}
function normalizeTeamPermissions(raw) {
    const defaults = getDefaultTeamPermissions();
    if (!raw || typeof raw !== "object")
        return defaults;
    const next = { ...defaults };
    for (const role of TEAM_PERMISSION_ROLES) {
        const value = raw[role];
        if (!Array.isArray(value))
            continue;
        next[role] = normalizePermissionList(value);
    }
    return next;
}
async function getTeamPermissions() {
    const row = await getSystemSetting(TEAM_PERMISSIONS_SETTING_KEY);
    if (!row?.value)
        return getDefaultTeamPermissions();
    try {
        return normalizeTeamPermissions(JSON.parse(row.value));
    }
    catch {
        return getDefaultTeamPermissions();
    }
}
async function setTeamPermissions(input) {
    const current = await getTeamPermissions();
    const merged = normalizeTeamPermissions({ ...current, ...input });
    await updateSystemSettings(TEAM_PERMISSIONS_SETTING_KEY, merged);
}
async function getRoleDefaultPermissions(role) {
    const userRole = String(role ?? "").trim().toLowerCase();
    if (!TEAM_PERMISSION_ROLES.includes(userRole)) {
        return [];
    }
    const teamPermissions = await getTeamPermissions();
    const roleKey = userRole;
    return teamPermissions[roleKey] ?? [];
}
async function getEffectiveUserPermissions(userId, role) {
    const directPermissions = await getUserPermissionState(userId);
    const inherited = await getRoleDefaultPermissions(role);
    if (directPermissions.hasExplicitEmptyOverride) {
        return normalizePermissionList([]);
    }
    if (!directPermissions.hasOverride) {
        return normalizePermissionList(inherited);
    }
    if (directPermissions.hasInheritExtrasMarker) {
        return normalizePermissionList([...inherited, ...directPermissions.pageIds]);
    }
    return normalizePermissionList(directPermissions.pageIds);
}
async function setUserPermissions(userId, pageIds, options = {}) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const cleanedPageIds = normalizePermissionList(pageIds);
    await db.delete(schema_1.userPermissions).where((0, drizzle_orm_1.eq)(schema_1.userPermissions.userId, userId));
    if (cleanedPageIds.length === 0) {
        if (options.emptyMode === "explicit") {
            await db.insert(schema_1.userPermissions).values({
                userId,
                pageId: EMPTY_PERMISSION_OVERRIDE,
                createdAt: new Date(),
            });
        }
        return;
    }
    const toPersist = options.nonEmptyMode === "inherit_extras"
        ? [INHERIT_WITH_EXTRAS_MARKER, ...cleanedPageIds]
        : cleanedPageIds;
    await db.insert(schema_1.userPermissions).values(toPersist.map((pageId) => ({
        userId,
        pageId,
        createdAt: new Date(),
    })));
}
// ============ SHEET ENTRIES ============
async function getSheetEntry(patientId, sheetType) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select()
        .from(schema_1.sheetEntries)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sheetEntries.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.sheetEntries.sheetType, sheetType)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sheetEntries.updatedAt))
        .limit(1);
    return rows.length > 0 ? rows[0].content : null;
}
async function getSheet_Entries(patientId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select()
        .from(schema_1.sheetEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.sheetEntries.patientId, patientId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sheetEntries.updatedAt));
    return rows;
}
async function upsertSheetEntry(params) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const existing = await db
        .select()
        .from(schema_1.sheetEntries)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sheetEntries.patientId, params.patientId), (0, drizzle_orm_1.eq)(schema_1.sheetEntries.sheetType, params.sheetType)))
        .limit(1);
    if (existing.length > 0) {
        await db
            .update(schema_1.sheetEntries)
            .set({ content: params.content, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.sheetEntries.id, existing[0].id));
        return { id: existing[0].id };
    }
    const result = await db.insert(schema_1.sheetEntries).values({
        patientId: params.patientId,
        sheetType: params.sheetType,
        content: params.content,
    });
    return { id: result.insertId };
}
// ============ OPERATION LISTS ============
function normalizeListDate(input) {
    if (input instanceof Date) {
        return input.toISOString().split("T")[0];
    }
    const raw = String(input ?? "").trim();
    if (!raw)
        return null;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.valueOf())) {
        return parsed.toISOString().split("T")[0];
    }
    // Handle non-standard timezone like "GM"
    const fixed = raw.replace(/\sGM$/, " GMT");
    const parsedFixed = new Date(fixed);
    if (!Number.isNaN(parsedFixed.valueOf())) {
        return parsedFixed.toISOString().split("T")[0];
    }
    // If already in YYYY-MM-DD, return as-is
    const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd)
        return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    return null;
}
function normalizeOperationTypeKey(value) {
    const normalized = String(value ?? "").trim();
    return normalized.length > 0 ? normalized : null;
}
async function getOperationList(doctorTab, listDate, operationType) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const dateValue = normalizeListDate(listDate);
    if (!dateValue) {
        return { id: null, items: [] };
    }
    const operationTypeKey = normalizeOperationTypeKey(operationType);
    const lists = await db
        .select()
        .from(schema_1.operationLists)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.operationLists.doctorTab, doctorTab), (0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateValue), operationTypeKey === null
        ? (0, drizzle_orm_1.isNull)(schema_1.operationLists.operationType)
        : (0, drizzle_orm_1.eq)(schema_1.operationLists.operationType, operationTypeKey)))
        .limit(1);
    if (lists.length === 0)
        return { id: null, items: [] };
    const rawItems = await db.select().from(schema_1.operationListItems).where((0, drizzle_orm_1.eq)(schema_1.operationListItems.listId, lists[0].id)).orderBy(schema_1.operationListItems.id);
    const items = rawItems.map(item => ({ ...item, payment: item.payment != null ? String(item.payment) : null }));
    return {
        id: lists[0].id,
        items,
        operationType: lists[0].operationType ?? null,
        doctorName: lists[0].doctorName ?? null,
        listTime: lists[0].listTime ?? null,
    };
}
async function getOperationListById(listId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const lists = await db.select().from(schema_1.operationLists).where((0, drizzle_orm_1.eq)(schema_1.operationLists.id, listId)).limit(1);
    if (lists.length === 0)
        return { id: null, items: [] };
    const rawItemsById = await db.select().from(schema_1.operationListItems).where((0, drizzle_orm_1.eq)(schema_1.operationListItems.listId, listId)).orderBy(schema_1.operationListItems.id);
    const items = rawItemsById.map(item => ({ ...item, payment: item.payment != null ? String(item.payment) : null }));
    return {
        id: lists[0].id,
        items,
        operationType: lists[0].operationType ?? null,
        doctorName: lists[0].doctorName ?? null,
        listTime: lists[0].listTime ?? null,
        doctorTab: lists[0].doctorTab,
        listDate: lists[0].listDate,
    };
}
async function saveOperationList(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const receiptNumbers = data.items
        .map((item) => String(item.number ?? "").trim())
        .filter((value) => value.length > 0);
    const duplicateInPayload = receiptNumbers.find((value, idx) => receiptNumbers.indexOf(value) !== idx);
    if (duplicateInPayload) {
        throw new Error(`Duplicate receipt number in list: ${duplicateInPayload}`);
    }
    const patientCodes = data.items
        .map((item) => String(item.code ?? "").trim())
        .filter((value) => value.length > 0);
    const duplicateCodeInPayload = patientCodes.find((value, idx) => patientCodes.indexOf(value) !== idx);
    if (duplicateCodeInPayload) {
        throw new Error(`Patient code cannot be repeated: ${duplicateCodeInPayload}`);
    }
    const dateValue = normalizeListDate(data.listDate);
    if (!dateValue) {
        throw new Error("Invalid listDate");
    }
    const operationTypeKey = normalizeOperationTypeKey(data.operationType);
    let listId = Number.isFinite(Number(data.listId ?? 0)) && Number(data.listId) > 0
        ? Number(data.listId)
        : null;
    if (!listId) {
        const existing = await db
            .select()
            .from(schema_1.operationLists)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.operationLists.doctorTab, data.doctorTab), (0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateValue), operationTypeKey === null
            ? (0, drizzle_orm_1.isNull)(schema_1.operationLists.operationType)
            : (0, drizzle_orm_1.eq)(schema_1.operationLists.operationType, operationTypeKey)))
            .limit(1);
        listId = existing.length > 0 ? existing[0].id : null;
    }
    if (receiptNumbers.length > 0) {
        const conflicts = await db
            .select({
            listId: schema_1.operationListItems.listId,
            number: schema_1.operationListItems.number,
        })
            .from(schema_1.operationListItems)
            .where((0, drizzle_orm_1.inArray)(schema_1.operationListItems.number, receiptNumbers));
        const conflict = conflicts.find((row) => {
            if (!row?.number)
                return false;
            if (!listId)
                return true;
            return Number(row.listId) !== Number(listId);
        });
        if (conflict?.number) {
            throw new Error(`Receipt number already exists: ${conflict.number}`);
        }
    }
    if (patientCodes.length > 0) {
        const codeConflicts = await db
            .select({
            listId: schema_1.operationListItems.listId,
            code: schema_1.operationListItems.code,
        })
            .from(schema_1.operationListItems)
            .where((0, drizzle_orm_1.inArray)(schema_1.operationListItems.code, patientCodes));
        const codeConflict = codeConflicts.find((row) => {
            if (!row?.code)
                return false;
            if (!listId)
                return true;
            return Number(row.listId) !== Number(listId);
        });
        if (codeConflict?.code) {
            throw new Error(`Patient code already exists in another record: ${codeConflict.code}`);
        }
    }
    if (!listId) {
        await db.insert(schema_1.operationLists).values({
            doctorTab: data.doctorTab,
            listDate: dateValue,
            operationType: operationTypeKey,
            doctorName: data.doctorName ?? null,
            listTime: data.listTime ?? null,
        });
        // Query it back to get the ID (Drizzle doesn't return insertId)
        const created = await db
            .select()
            .from(schema_1.operationLists)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.operationLists.doctorTab, data.doctorTab), (0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateValue), operationTypeKey === null
            ? (0, drizzle_orm_1.isNull)(schema_1.operationLists.operationType)
            : (0, drizzle_orm_1.eq)(schema_1.operationLists.operationType, operationTypeKey)))
            .limit(1);
        if (created.length > 0) {
            listId = created[0].id;
        }
        else {
            throw new Error("Failed to create operation list");
        }
    }
    else {
        const duplicateTarget = await db
            .select({ id: schema_1.operationLists.id })
            .from(schema_1.operationLists)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.operationLists.doctorTab, data.doctorTab), (0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateValue), operationTypeKey === null
            ? (0, drizzle_orm_1.isNull)(schema_1.operationLists.operationType)
            : (0, drizzle_orm_1.eq)(schema_1.operationLists.operationType, operationTypeKey)))
            .limit(1);
        if (duplicateTarget.length > 0 && Number(duplicateTarget[0].id) !== Number(listId)) {
            throw new Error("A different list already exists for this doctor/date/type");
        }
        await db.update(schema_1.operationLists).set({
            doctorTab: data.doctorTab,
            listDate: dateValue,
            operationType: operationTypeKey,
            doctorName: data.doctorName ?? null,
            listTime: data.listTime ?? null,
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(schema_1.operationLists.id, listId));
        await db.delete(schema_1.operationListItems).where((0, drizzle_orm_1.eq)(schema_1.operationListItems.listId, listId));
    }
    if (listId) {
        await db.insert(schema_1.operationListItems).values(data.items.map((item) => ({
            listId,
            number: item.number ?? null,
            name: item.name,
            phone: item.phone ?? null,
            doctor: item.doctor ?? null,
            operation: item.operation ?? null,
            eye: item.eye ?? null,
            center: !!(item.center),
            payment: item.payment ?? null,
            hospital: item.hospital ?? null,
            code: item.code ?? null,
        })));
    }
    return { id: listId };
}
async function deleteOperationList(doctorTab, listDate) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const dateValue = normalizeListDate(listDate);
    if (!dateValue)
        return;
    const existing = await db
        .select()
        .from(schema_1.operationLists)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.operationLists.doctorTab, doctorTab), (0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateValue)))
        .limit(1);
    if (existing.length === 0)
        return;
    await db.delete(schema_1.operationListItems).where((0, drizzle_orm_1.eq)(schema_1.operationListItems.listId, existing[0].id));
    await db.delete(schema_1.operationLists).where((0, drizzle_orm_1.eq)(schema_1.operationLists.id, existing[0].id));
}
async function deleteOperationListById(listId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.operationListItems).where((0, drizzle_orm_1.eq)(schema_1.operationListItems.listId, listId));
    await db.delete(schema_1.operationLists).where((0, drizzle_orm_1.eq)(schema_1.operationLists.id, listId));
}
async function getOperationListsHistory() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db
        .select()
        .from(schema_1.operationLists)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.operationLists.listDate), (0, drizzle_orm_1.desc)(schema_1.operationLists.updatedAt), (0, drizzle_orm_1.desc)(schema_1.operationLists.id));
}
async function getOperationListsHistoryWithItems() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const lists = await db
        .select()
        .from(schema_1.operationLists)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.operationLists.listDate), (0, drizzle_orm_1.desc)(schema_1.operationLists.updatedAt), (0, drizzle_orm_1.desc)(schema_1.operationLists.id));
    if (lists.length === 0)
        return [];
    const items = await db
        .select()
        .from(schema_1.operationListItems)
        .orderBy(schema_1.operationListItems.id);
    const byList = new Map();
    items.forEach((item) => {
        if (!byList.has(item.listId))
            byList.set(item.listId, []);
        byList.get(item.listId).push({
            id: item.id,
            number: item.number ?? null,
            name: item.name ?? null,
            phone: item.phone ?? null,
            doctor: item.doctor ?? null,
            operation: item.operation ?? null,
            eye: item.eye ?? null,
            center: item.center,
            payment: item.payment ?? null,
            hospital: item.hospital ?? null,
            code: item.code ?? null,
        });
    });
    return lists.map((list) => ({
        ...list,
        items: byList.get(list.id) ?? [],
    }));
}
async function getOperationListsByDate(dateString) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const lists = await db
        .select()
        .from(schema_1.operationLists)
        .where((0, drizzle_orm_1.eq)(schema_1.operationLists.listDate, dateString))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.operationLists.listDate), (0, drizzle_orm_1.desc)(schema_1.operationLists.updatedAt));
    if (lists.length === 0)
        return [];
    const items = await db
        .select()
        .from(schema_1.operationListItems)
        .orderBy(schema_1.operationListItems.id);
    const byList = new Map();
    items.forEach((item) => {
        if (!byList.has(item.listId))
            byList.set(item.listId, []);
        byList.get(item.listId).push({
            id: item.id,
            number: item.number ?? null,
            name: item.name ?? null,
            phone: item.phone ?? null,
            doctor: item.doctor ?? null,
            operation: item.operation ?? null,
            eye: item.eye ?? null,
            center: item.center,
            payment: item.payment ?? null,
            hospital: item.hospital ?? null,
            code: item.code ?? null,
        });
    });
    return lists.map((list) => ({
        ...list,
        items: byList.get(list.id) ?? [],
    }));
}
async function getAutoOperationListsByDate(dateString) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalizeCode = (value) => String(value ?? "").trim().toLowerCase();
    const dateValue = normalizeListDate(dateString);
    if (!dateValue)
        return [];
    const surgeryCodes = new Set();
    try {
        const setting = await getSystemSetting("service_directory");
        const parsed = setting?.value ? JSON.parse(String(setting.value)) : [];
        if (Array.isArray(parsed)) {
            for (const entry of parsed) {
                const code = normalizeCode(entry?.code);
                const active = entry?.isActive !== false;
                const serviceType = String(entry?.serviceType ?? "").trim().toLowerCase();
                const category = String(entry?.category ?? "").trim().toLowerCase();
                const defaultSheet = String(entry?.defaultSheet ?? "").trim().toLowerCase();
                const isSurgery = serviceType === "surgery" ||
                    category === "operations" ||
                    defaultSheet === "surgery" ||
                    defaultSheet === "surgery_center" ||
                    defaultSheet === "surgery_external";
                if (code && active && isSurgery) {
                    surgeryCodes.add(code);
                }
            }
        }
    }
    catch {
        // best-effort fallback: no auto items when mapping is not readable
    }
    if (surgeryCodes.size === 0)
        return [];
    const rows = await db
        .select({
        entryId: schema_1.patientServiceEntries.id,
        patientId: schema_1.patientServiceEntries.patientId,
        serviceCode: schema_1.patientServiceEntries.serviceCode,
        serviceName: schema_1.patientServiceEntries.serviceName,
        serviceDate: schema_1.patientServiceEntries.serviceDate,
        updatedAt: schema_1.patientServiceEntries.updatedAt,
        fullName: schema_1.patients.fullName,
        patientCode: schema_1.patients.patientCode,
        doctorCode: schema_1.patients.doctorCode,
        doctorName: schema_1.doctorsLookup.name,
    })
        .from(schema_1.patientServiceEntries)
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.patientId, schema_1.patients.id))
        .leftJoin(schema_1.doctorsLookup, (0, drizzle_orm_1.eq)(schema_1.patients.doctorCode, schema_1.doctorsLookup.code))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.source, "mssql"), (0, drizzle_orm_1.sql) `(
          DATE(COALESCE(${schema_1.patientServiceEntries.serviceDate}, ${schema_1.patientServiceEntries.updatedAt})) = ${dateValue}
          OR DATE(DATE_ADD(COALESCE(${schema_1.patientServiceEntries.serviceDate}, ${schema_1.patientServiceEntries.updatedAt}), INTERVAL 2 HOUR)) = ${dateValue}
          OR DATE(DATE_ADD(COALESCE(${schema_1.patientServiceEntries.serviceDate}, ${schema_1.patientServiceEntries.updatedAt}), INTERVAL 3 HOUR)) = ${dateValue}
        )`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patientServiceEntries.updatedAt), (0, drizzle_orm_1.desc)(schema_1.patientServiceEntries.id));
    const filtered = rows.filter((row) => surgeryCodes.has(normalizeCode(row.serviceCode)));
    if (filtered.length === 0)
        return [];
    const byDoctor = new Map();
    for (const row of filtered) {
        const doctor = String(row.doctorName ?? "").trim() ||
            (String(row.doctorCode ?? "").trim() ? `د/${String(row.doctorCode ?? "").trim()}` : "عمليات (MSSQL)");
        if (!byDoctor.has(doctor))
            byDoctor.set(doctor, []);
        byDoctor.get(doctor).push(row);
    }
    let listIdSeed = 900000000;
    const out = [];
    for (const [doctor, doctorRows] of byDoctor.entries()) {
        const items = doctorRows.map((row) => ({
            id: Number(row.entryId),
            number: null,
            name: String(row.fullName ?? "").trim() || `Patient #${row.patientId}`,
            phone: null,
            doctor,
            operation: String(row.serviceName ?? "").trim() || String(row.serviceCode ?? "").trim() || "Surgery Service",
            eye: null,
            center: true,
            payment: null,
            hospital: null,
            code: String(row.patientCode ?? "").trim() || null,
        }));
        out.push({
            id: listIdSeed++,
            doctorTab: doctor,
            doctorName: doctor,
            doctorFullName: doctor,
            listDate: dateValue,
            operationType: "Auto Synced",
            listTime: null,
            isAutoFromMssql: true,
            items,
        });
    }
    return out;
}
// ============ PUSH DEVICE REGISTRATIONS ============
async function upsertPushDeviceRegistration(input) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const token = String(input.token ?? "").trim();
    if (!token)
        throw new Error("Push token is required");
    const userId = Number(input.userId);
    if (!Number.isFinite(userId) || userId <= 0)
        throw new Error("Valid userId is required");
    const existingByToken = await db
        .select()
        .from(schema_1.pushDeviceRegistrations)
        .where((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.token, token))
        .limit(1);
    const payload = {
        userId,
        provider: "fcm",
        platform: input.platform,
        token,
        deviceId: input.deviceId ? String(input.deviceId).trim() : null,
        appVersion: input.appVersion ? String(input.appVersion).trim() : null,
        build: input.build ? String(input.build).trim() : null,
        lastSeenAt: new Date(),
        disabledAt: null,
    };
    if (existingByToken.length > 0) {
        await db
            .update(schema_1.pushDeviceRegistrations)
            .set({
            ...payload,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.id, existingByToken[0].id));
        return existingByToken[0].id;
    }
    if (payload.deviceId) {
        const existingByDevice = await db
            .select()
            .from(schema_1.pushDeviceRegistrations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.userId, userId), (0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.deviceId, payload.deviceId)))
            .limit(1);
        if (existingByDevice.length > 0) {
            await db
                .update(schema_1.pushDeviceRegistrations)
                .set({
                ...payload,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.id, existingByDevice[0].id));
            return existingByDevice[0].id;
        }
    }
    const result = await db.insert(schema_1.pushDeviceRegistrations).values(payload);
    const registrationId = result?.insertId;
    if (!registrationId) {
        throw new Error("Failed to register push device - no ID returned from database");
    }
    return registrationId;
}
async function disablePushDeviceToken(token) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalized = String(token ?? "").trim();
    if (!normalized)
        return;
    await db
        .update(schema_1.pushDeviceRegistrations)
        .set({ disabledAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.token, normalized));
}
async function deletePushDeviceToken(token) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const normalized = String(token ?? "").trim();
    if (!normalized)
        return;
    await db.delete(schema_1.pushDeviceRegistrations).where((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.token, normalized));
}
async function getActivePushDeviceRegistrations() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db
        .select()
        .from(schema_1.pushDeviceRegistrations)
        .where((0, drizzle_orm_1.sql) `${schema_1.pushDeviceRegistrations.disabledAt} IS NULL`)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.pushDeviceRegistrations.lastSeenAt), (0, drizzle_orm_1.desc)(schema_1.pushDeviceRegistrations.id));
}
async function getActivePushDeviceRegistrationsByUser(userId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db
        .select()
        .from(schema_1.pushDeviceRegistrations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pushDeviceRegistrations.userId, userId), (0, drizzle_orm_1.sql) `${schema_1.pushDeviceRegistrations.disabledAt} IS NULL`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.pushDeviceRegistrations.lastSeenAt), (0, drizzle_orm_1.desc)(schema_1.pushDeviceRegistrations.id));
}
// ============ PAGE STATE (USER/PATIENT) ============
async function getUserPageState(userId, page) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select()
        .from(schema_1.userPageStates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPageStates.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userPageStates.page, page)))
        .limit(1);
    return rows[0] ?? null;
}
async function upsertUserPageState(userId, page, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const existing = await db
        .select()
        .from(schema_1.userPageStates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userPageStates.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userPageStates.page, page)))
        .limit(1);
    if (!existing.length) {
        await db.insert(schema_1.userPageStates).values({ userId, page, data: data });
        return;
    }
    await db.update(schema_1.userPageStates).set({ data: data }).where((0, drizzle_orm_1.eq)(schema_1.userPageStates.id, existing[0].id));
}
const PASSWORD_CHANGE_STATE_PAGE = "__security_password_change__";
async function isPasswordChangeRequired(userId) {
    const state = await getUserPageState(userId, PASSWORD_CHANGE_STATE_PAGE);
    const payload = state?.data;
    return !(payload && typeof payload.changedAt === "string" && payload.changedAt.trim().length > 0);
}
async function markPasswordChanged(userId) {
    await upsertUserPageState(userId, PASSWORD_CHANGE_STATE_PAGE, {
        changedAt: new Date().toISOString(),
    });
}
async function getPatientPageState(patientId, page) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select()
        .from(schema_1.patientPageStates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientPageStates.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.patientPageStates.page, page)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patientPageStates.updatedAt), (0, drizzle_orm_1.desc)(schema_1.patientPageStates.id))
        .limit(1);
    return rows[0] ?? null;
}
async function upsertPatientPageState(patientId, page, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const existingRows = await db
        .select()
        .from(schema_1.patientPageStates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.patientPageStates.patientId, patientId), (0, drizzle_orm_1.eq)(schema_1.patientPageStates.page, page)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patientPageStates.updatedAt), (0, drizzle_orm_1.desc)(schema_1.patientPageStates.id))
        .limit(1);
    if (!existingRows.length) {
        await db.insert(schema_1.patientPageStates).values({ patientId, page, data: data });
        return;
    }
    const target = existingRows[0];
    await db
        .update(schema_1.patientPageStates)
        .set({ data: data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.patientPageStates.id, target.id));
}
async function upsertPatientServiceEntry(input) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const sourceRef = String(input.sourceRef ?? "").trim();
    if (!sourceRef)
        return;
    const existing = await db
        .select()
        .from(schema_1.patientServiceEntries)
        .where((0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.sourceRef, sourceRef))
        .limit(1);
    const payload = {
        patientId: Number(input.patientId),
        serviceCode: String(input.serviceCode ?? "").trim(),
        serviceName: input.serviceName ? String(input.serviceName).trim() : null,
        source: (input.source ?? "mssql"),
        sourceRef,
        serviceDate: input.serviceDate ? String(input.serviceDate).slice(0, 10) : null,
    };
    if (!payload.patientId || !payload.serviceCode)
        return;
    if (!existing.length) {
        await db.insert(schema_1.patientServiceEntries).values(payload);
        return;
    }
    await db
        .update(schema_1.patientServiceEntries)
        .set({
        patientId: payload.patientId,
        serviceCode: payload.serviceCode,
        serviceName: payload.serviceName,
        source: payload.source,
        serviceDate: payload.serviceDate,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.patientServiceEntries.id, existing[0].id));
}
async function getPatientServiceEntriesByPatients(patientIds) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const ids = Array.from(new Set(patientIds.filter((id) => Number.isFinite(id))));
    if (!ids.length)
        return [];
    return await db
        .select()
        .from(schema_1.patientServiceEntries)
        .where((0, drizzle_orm_1.inArray)(schema_1.patientServiceEntries.patientId, ids))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.patientServiceEntries.updatedAt));
}
async function getPatientServiceEntriesByPatient(patientId) {
    const rows = await getPatientServiceEntriesByPatients([patientId]);
    return rows.filter((row) => Number(row.patientId) === Number(patientId));
}
// ============ DISEASES ============
async function getAllDiseases() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return await db.select().from(schema_1.diseases).orderBy((0, drizzle_orm_1.desc)(schema_1.diseases.id));
}
async function createDisease(name, branch, abbrev) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.insert(schema_1.diseases).values({ name, branch: branch || null, abbrev: abbrev || null });
}
async function updateDisease(diseaseId, name, branch, abbrev) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(schema_1.diseases).set({ name, branch: branch || null, abbrev: abbrev || null }).where((0, drizzle_orm_1.eq)(schema_1.diseases.id, diseaseId));
}
async function deleteDisease(diseaseId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.delete(schema_1.diseases).where((0, drizzle_orm_1.eq)(schema_1.diseases.id, diseaseId));
}
// ============ QUEUE & PATIENT RETRIEVAL ============
/**
 * Get all patients who have visits today
 */
async function getTodayPatients(dateIso) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({
        id: schema_1.patients.id,
        patientCode: schema_1.patients.patientCode,
        fullName: schema_1.patients.fullName,
        phone: schema_1.patients.phone,
        serviceType: schema_1.patients.serviceType,
        doctorId: schema_1.patients.doctorId,
    })
        .from(schema_1.patients)
        .where((0, drizzle_orm_1.sql) `EXISTS (
        SELECT 1 FROM ${schema_1.visits}
        WHERE ${schema_1.visits.patientId} = ${schema_1.patients.id}
          AND DATE(${schema_1.visits.visitDate}) = ${dateIso}
      )`)
        .limit(500);
    return rows.map(row => ({
        ...decodePatientRow(row),
        doctorName: null,
    }));
}
/**
 * Get visits for a specific date with patient and doctor info
 */
async function getTodayVisitsByQueueStatus(dateIso, queueStatus) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const whereClauses = [(0, drizzle_orm_1.sql) `DATE(${schema_1.visits.visitDate}) = ${dateIso}`];
    if (queueStatus) {
        whereClauses.push((0, drizzle_orm_1.eq)(schema_1.visits.queueStatus, queueStatus));
    }
    const rows = await db
        .select({
        id: schema_1.visits.id,
        patientId: schema_1.visits.patientId,
        patientCode: schema_1.patients.patientCode,
        patientFullName: schema_1.patients.fullName,
        patientPhone: schema_1.patients.phone,
        patientServiceType: schema_1.patients.serviceType,
        patientLocationType: schema_1.patients.locationType,
        patientDoctorId: schema_1.patients.doctorId,
        patientDoctorCode: schema_1.patients.doctorCode,
        visitDate: schema_1.visits.visitDate,
        visitType: schema_1.visits.visitType,
        queueStatus: schema_1.visits.queueStatus,
        checkedInAt: schema_1.visits.checkedInAt,
        checkedInTime: (0, drizzle_orm_1.sql) `DATE_FORMAT(${schema_1.visits.checkedInAt}, '%H:%i')`,
        movedToNextAt: schema_1.visits.movedToNextAt,
        movedToClinicAt: schema_1.visits.movedToClinicAt,
        treatedAt: schema_1.visits.treatedAt,
        doctorName: schema_1.doctorsLookup.name,
    })
        .from(schema_1.visits)
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
        .leftJoin(schema_1.doctorsLookup, (0, drizzle_orm_1.sql) `${schema_1.doctorsLookup.id} = ${schema_1.patients.doctorId}`)
        .where((0, drizzle_orm_1.and)(...whereClauses))
        .orderBy(schema_1.visits.id)
        .limit(500);
    return rows.map(row => ({
        ...row,
        patientFullName: decodeMojibake(row.patientFullName),
        doctorName: row.doctorName ?? null,
    }));
}
/**
 * Auto-advance patients through queue based on current state.
 * يُستدعى قبل قراءة طابور اليوم. بعد ترقية next→clinic يجب إعادة قراءة الطابور؛ النسخة السابقة كانت تستخدم لقطات قديمة فلا يُعبَّأ «التالي» من «تسجيل».
 */
async function autoAdvanceQueuePatients(dateIso) {
    const connMaybe = await getDb();
    if (!connMaybe)
        throw new Error("Database not available");
    const conn = connMaybe;
    const nonExternalExpr = (0, drizzle_orm_1.sql) `(
    ${schema_1.patients.locationType} IS NULL
    OR LOWER(TRIM(${schema_1.patients.locationType})) NOT IN ('external', 'خارجي', 'outside', 'out')
  )`;
    const dayMatch = (0, drizzle_orm_1.sql) `DATE(${schema_1.visits.visitDate}) = ${dateIso}`;
    async function firstVisitId(status) {
        const rows = await conn
            .select({ id: schema_1.visits.id })
            .from(schema_1.visits)
            .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
            .where((0, drizzle_orm_1.and)(dayMatch, nonExternalExpr, (0, drizzle_orm_1.eq)(schema_1.visits.queueStatus, status)))
            .orderBy(schema_1.visits.id)
            .limit(1);
        return rows[0]?.id;
    }
    async function checkedInOrderedIds(limit) {
        const rows = await conn
            .select({ id: schema_1.visits.id })
            .from(schema_1.visits)
            .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
            .where((0, drizzle_orm_1.and)(dayMatch, nonExternalExpr, (0, drizzle_orm_1.eq)(schema_1.visits.queueStatus, "checkedIn")))
            .orderBy(schema_1.visits.id)
            .limit(limit);
        return rows.map((r) => r.id);
    }
    // 1) عيادة فارغة لكن يوجد «التالي» → صعود إلى عيادة
    let clinicId = await firstVisitId("clinic");
    const nextHead = await firstVisitId("next");
    if (clinicId == null && nextHead != null) {
        await conn
            .update(schema_1.visits)
            .set({ queueStatus: "clinic", movedToClinicAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, nextHead));
    }
    // 2) لا يزال لا يوجد في العيادة → أقدم «تسجيل»
    clinicId = await firstVisitId("clinic");
    if (clinicId == null) {
        const checked = await checkedInOrderedIds(1);
        if (checked.length === 0)
            return;
        await conn
            .update(schema_1.visits)
            .set({ queueStatus: "clinic", movedToClinicAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, checked[0]));
        clinicId = checked[0];
    }
    // 3) لا يوجد «التالي» → أقدم «تسجيل» غير من occupies العيادة (بعد قراءة حالة حديثة)
    const nextAfter = await firstVisitId("next");
    if (nextAfter != null)
        return;
    clinicId = await firstVisitId("clinic");
    const checkedList = await checkedInOrderedIds(12);
    const nextCandidate = checkedList.find((id) => id !== clinicId);
    if (nextCandidate != null) {
        await conn
            .update(schema_1.visits)
            .set({ queueStatus: "next", movedToNextAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, nextCandidate));
    }
}
/**
 * Delete all patients
 */
async function deleteAllPatients() {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.delete(schema_1.patients);
    return { deletedCount: 0 };
}
/**
 * Update visit queue status and set the corresponding timestamp
 */
async function updateVisitQueueStatus(visitId, queueStatus) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const timestampCol = {};
    if (queueStatus === "checkedIn")
        timestampCol.checkedInAt = (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`;
    if (queueStatus === "next")
        timestampCol.movedToNextAt = (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`;
    if (queueStatus === "clinic")
        timestampCol.movedToClinicAt = (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`;
    if (queueStatus === "treated")
        timestampCol.treatedAt = (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`;
    await db
        .update(schema_1.visits)
        .set({ queueStatus: queueStatus, ...timestampCol })
        .where((0, drizzle_orm_1.eq)(schema_1.visits.id, visitId));
}
async function getVisitDateIsoById(visitId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const rows = await db
        .select({ visitDateIso: (0, drizzle_orm_1.sql) `DATE_FORMAT(${schema_1.visits.visitDate}, '%Y-%m-%d')` })
        .from(schema_1.visits)
        .where((0, drizzle_orm_1.eq)(schema_1.visits.id, visitId))
        .limit(1);
    const raw = String(rows[0]?.visitDateIso ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
/**
 * When a visit is marked treated, cascade: move next→clinic and checkedIn→next
 */
async function cascadeQueueStatus(dateIso) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const nonExternalExpr = (0, drizzle_orm_1.sql) `(
    ${schema_1.patients.locationType} IS NULL
    OR LOWER(TRIM(${schema_1.patients.locationType})) NOT IN ('external', 'خارجي', 'outside', 'out')
  )`;
    // Move the first non-external "next" visit to "clinic"
    const nextVisits = await db
        .select({ id: schema_1.visits.id })
        .from(schema_1.visits)
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `DATE(${schema_1.visits.visitDate}) = ${dateIso}`, nonExternalExpr, (0, drizzle_orm_1.eq)(schema_1.visits.queueStatus, "next")))
        .orderBy(schema_1.visits.id)
        .limit(1);
    if (nextVisits.length > 0) {
        await db
            .update(schema_1.visits)
            .set({ queueStatus: "clinic", movedToClinicAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, nextVisits[0].id));
    }
    // Move the first non-external "checkedIn" visit to "next"
    const checkedInVisits = await db
        .select({ id: schema_1.visits.id })
        .from(schema_1.visits)
        .innerJoin(schema_1.patients, (0, drizzle_orm_1.eq)(schema_1.visits.patientId, schema_1.patients.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `DATE(${schema_1.visits.visitDate}) = ${dateIso}`, nonExternalExpr, (0, drizzle_orm_1.eq)(schema_1.visits.queueStatus, "checkedIn")))
        .orderBy(schema_1.visits.id)
        .limit(1);
    if (checkedInVisits.length > 0) {
        await db
            .update(schema_1.visits)
            .set({ queueStatus: "next", movedToNextAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP` })
            .where((0, drizzle_orm_1.eq)(schema_1.visits.id, checkedInVisits[0].id));
    }
}
async function insertVisitScheduleRequest(row) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(schema_1.visitScheduleRequests).values(row);
    const r = result;
    let insertId = Number(r?.insertId ?? r?.[0]?.insertId ?? 0);
    if (!Number.isFinite(insertId) || insertId <= 0) {
        const [latest] = await db
            .select({ id: schema_1.visitScheduleRequests.id })
            .from(schema_1.visitScheduleRequests)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.visitScheduleRequests.id))
            .limit(1);
        insertId = Number(latest?.id ?? 0);
    }
    return { id: insertId };
}
/**
 * Log audit event
 */
async function logAuditEvent(userId, action, entityType, entityId, changes) {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot log audit event: database not available");
        return;
    }
    const logData = {
        adminId: userId,
        action,
        entityType,
        entityId,
        changes: changes ? JSON.stringify(changes) : null,
        createdAt: new Date(),
    };
    await createAuditLog(logData);
}
