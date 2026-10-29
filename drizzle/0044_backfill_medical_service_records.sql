-- Copies only unambiguous legacy values. Existing canonical rows and all legacy records are preserved.
CREATE TABLE IF NOT EXISTS medicalMigrationConflicts (
 id int AUTO_INCREMENT PRIMARY KEY, patientId int NOT NULL, visitId int NULL,
 fieldName varchar(100) NOT NULL, sourceRef varchar(191) NOT NULL, candidateValue text NOT NULL,
 createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_medical_migration_conflict (patientId,fieldName,sourceRef)
);
--> statement-breakpoint
ALTER TABLE sheet_entries ADD COLUMN visitId int NULL;
--> statement-breakpoint
UPDATE sheet_entries s INNER JOIN visits v ON v.id=CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.visitId')) REGEXP '^[0-9]+$' THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.visitId')) AS UNSIGNED) END AND v.patientId=s.patientId SET s.visitId=v.id WHERE s.visitId IS NULL;
--> statement-breakpoint
UPDATE sheet_entries s INNER JOIN (SELECT patientId,DATE_FORMAT(visitDate,'%Y-%m-%d') AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE_FORMAT(visitDate,'%Y-%m-%d') HAVING COUNT(*)=1) v ON v.patientId=s.patientId AND v.visitDay=LEFT(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.examinationDate')),''),NULLIF(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.visitDate')),''),NULLIF(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examinationDate')),''),NULLIF(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.visitDate')),'')),10) SET s.visitId=v.visitId WHERE s.visitId IS NULL AND (JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.visitId')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.visitId'))='0');
--> statement-breakpoint
UPDATE followupItems f INNER JOIN followupSheets s ON s.id=f.followupSheetId INNER JOIN (SELECT patientId,DATE(visitDate) AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE(visitDate) HAVING COUNT(*)=1) v ON v.patientId=s.patientId AND v.visitDay=DATE(f.followupDate) SET f.visitId=v.visitId WHERE f.visitId IS NULL;
--> statement-breakpoint
UPDATE `doctorReports` r INNER JOIN (SELECT patientId,DATE(visitDate) AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE(visitDate) HAVING COUNT(*)=1) v ON v.patientId=r.patientId AND v.visitDay=DATE(r.`visitDate`) SET r.visitId=v.visitId WHERE r.visitId IS NULL OR r.visitId=0;
--> statement-breakpoint
UPDATE `prescriptions` r INNER JOIN (SELECT patientId,DATE(visitDate) AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE(visitDate) HAVING COUNT(*)=1) v ON v.patientId=r.patientId AND v.visitDay=DATE(r.`prescriptionDate`) SET r.visitId=v.visitId WHERE r.visitId IS NULL OR r.visitId=0;
--> statement-breakpoint
UPDATE `testRequests` r INNER JOIN (SELECT patientId,DATE(visitDate) AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE(visitDate) HAVING COUNT(*)=1) v ON v.patientId=r.patientId AND v.visitDay=DATE(r.`requestDate`) SET r.visitId=v.visitId WHERE r.visitId IS NULL OR r.visitId=0;
--> statement-breakpoint
UPDATE `surgeries` r INNER JOIN (SELECT patientId,DATE(visitDate) AS visitDay,MIN(id) AS visitId FROM visits GROUP BY patientId,DATE(visitDate) HAVING COUNT(*)=1) v ON v.patientId=r.patientId AND v.visitDay=DATE(r.`surgeryDate`) SET r.visitId=v.visitId WHERE r.visitId IS NULL OR r.visitId=0;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalMigrationCandidates (
 patientId int NOT NULL, visitId int NOT NULL, fieldName varchar(100) NOT NULL,
 sourceRef varchar(191) NOT NULL, candidateValue text NOT NULL
);
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT v.patientId,v.id,'complaint',CONCAT('visit:',v.id),TRIM(v.chiefComplaint) FROM visits v WHERE NULLIF(TRIM(v.chiefComplaint),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT r.patientId,r.visitId,'complaint',CONCAT('doctorReport:',r.id),TRIM(r.`clinicalOpinion`) FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE NULLIF(TRIM(r.`clinicalOpinion`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT r.patientId,r.visitId,'diagnosis',CONCAT('doctorReport:',r.id),TRIM(r.`diagnosis`) FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE NULLIF(TRIM(r.`diagnosis`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT r.patientId,r.visitId,'treatment',CONCAT('doctorReport:',r.id),TRIM(r.`treatment`) FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE NULLIF(TRIM(r.`treatment`),'') IS NOT NULL AND JSON_TYPE(IF(JSON_VALID(r.`treatment`),r.`treatment`,'null')) NOT IN ('ARRAY','OBJECT');
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT r.patientId,r.visitId,'decision',CONCAT('doctorReport:',r.id),TRIM(r.`recommendations`) FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE NULLIF(TRIM(r.`recommendations`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT r.patientId,r.visitId,'history',CONCAT('doctorReport:',r.id),TRIM(r.`additionalNotes`) FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE NULLIF(TRIM(r.`additionalNotes`),'') IS NOT NULL AND JSON_TYPE(IF(JSON_VALID(r.`additionalNotes`),r.`additionalNotes`,'null')) NOT IN ('ARRAY','OBJECT');
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'complaint',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.consultantExam.complains'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.consultantExam.complains'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.consultantExam.complains'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'symptoms',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.symptoms'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.symptoms'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.symptoms'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'diagnosis',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.diagnosisText'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.diagnosisText'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.diagnosisText'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'diagnosis',CONCAT('sheet:',s.id,':1'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.diagnosis'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.diagnosis'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.diagnosis'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'decision',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecisionText'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecisionText'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecisionText'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'decision',CONCAT('sheet:',s.id,':1'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecision'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecision'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.finalDecision'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'decision',CONCAT('sheet:',s.id,':2'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.recommendations'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.recommendations'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.recommendations'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'treatment',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.treatmentPlan'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.treatmentPlan'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.formData.treatmentPlan'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,v.id,'history',CONCAT('sheet:',s.id,':0'),TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.historyNotes'))) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.historyNotes'))='STRING' AND NULLIF(TRIM(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.historyNotes'))),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'complaint',CONCAT('canonical:visitComplaints:',id),COALESCE(`complaint`,'') FROM `visitComplaints`;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'symptoms',CONCAT('canonical:visitSymptoms:',id),COALESCE(`symptoms`,'') FROM `visitSymptoms`;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'diagnosis',CONCAT('canonical:visitDiagnoses:',id),COALESCE(`diagnosis`,'') FROM `visitDiagnoses`;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'treatment',CONCAT('canonical:visitTreatmentPlans:',id),COALESCE(`treatment`,'') FROM `visitTreatmentPlans`;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'decision',CONCAT('canonical:visitDecisions:',id),COALESCE(`decision`,'') FROM `visitDecisions`;
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT patientId,visitId,'history',CONCAT('canonical:visitMedicalHistory:',id),COALESCE(`history`,'') FROM `visitMedicalHistory`;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalMigrationNumbers AS SELECT a.n+10*b.n+100*c.n+1000*d.n AS n FROM (SELECT 0 AS n UNION ALL SELECT 1 AS n UNION ALL SELECT 2 AS n UNION ALL SELECT 3 AS n UNION ALL SELECT 4 AS n UNION ALL SELECT 5 AS n UNION ALL SELECT 6 AS n UNION ALL SELECT 7 AS n UNION ALL SELECT 8 AS n UNION ALL SELECT 9 AS n) a CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 AS n UNION ALL SELECT 2 AS n UNION ALL SELECT 3 AS n UNION ALL SELECT 4 AS n UNION ALL SELECT 5 AS n UNION ALL SELECT 6 AS n UNION ALL SELECT 7 AS n UNION ALL SELECT 8 AS n UNION ALL SELECT 9 AS n) b CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 AS n UNION ALL SELECT 2 AS n UNION ALL SELECT 3 AS n UNION ALL SELECT 4 AS n UNION ALL SELECT 5 AS n UNION ALL SELECT 6 AS n UNION ALL SELECT 7 AS n UNION ALL SELECT 8 AS n UNION ALL SELECT 9 AS n) c CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 AS n UNION ALL SELECT 2 AS n UNION ALL SELECT 3 AS n UNION ALL SELECT 4 AS n UNION ALL SELECT 5 AS n UNION ALL SELECT 6 AS n UNION ALL SELECT 7 AS n UNION ALL SELECT 8 AS n UNION ALL SELECT 9 AS n) d;
--> statement-breakpoint
INSERT INTO symptomCatalog(id,name) SELECT JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.value),s.value,'[]'),CONCAT('$[',n.n,'].id'))),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.value),s.value,'[]'),CONCAT('$[',n.n,'].name'))) FROM systemSettings s INNER JOIN medicalMigrationNumbers n ON n.n<JSON_LENGTH(IF(JSON_VALID(s.value),s.value,'[]')) WHERE s.`key`='symptoms_directory' AND JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.value),s.value,'[]'),CONCAT('$[',n.n,'].id')))='STRING' AND JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.value),s.value,'[]'),CONCAT('$[',n.n,'].name')))='STRING' AND CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(s.value,CONCAT('$[',n.n,'].id')))) BETWEEN 1 AND 100 AND CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(s.value,CONCAT('$[',n.n,'].name')))) BETWEEN 1 AND 255 ON DUPLICATE KEY UPDATE id=VALUES(id);
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalDiagnosisCanonicalBefore AS SELECT visitId FROM visitDiagnoses UNION SELECT visitId FROM visitDiagnosisCodes;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalDiagnosisCandidates AS SELECT r.patientId,r.visitId,r.id AS reportId,JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(r.diseases),r.diseases,IF(JSON_VALID(r.additionalNotes),r.additionalNotes,'[]')),CONCAT('$[',n.n,']'))) AS rawCode FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId INNER JOIN medicalMigrationNumbers n ON n.n<JSON_LENGTH(IF(JSON_VALID(r.diseases),r.diseases,IF(JSON_VALID(r.additionalNotes),r.additionalNotes,'[]')));
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalDiagnosisVariants AS SELECT r.visitId,COUNT(DISTINCT CAST(IF(JSON_VALID(r.diseases),r.diseases,IF(JSON_VALID(r.additionalNotes),r.additionalNotes,'[]')) AS BINARY)) AS variants FROM doctorReports r INNER JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId GROUP BY r.visitId;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalDiagnosisResolved AS SELECT c.patientId,c.visitId,c.reportId,c.rawCode,d.id AS diseaseId FROM medicalDiagnosisCandidates c LEFT JOIN diseases d ON (c.rawCode REGEXP '^[0-9]+$' AND d.id=CAST(c.rawCode AS UNSIGNED)) OR (JSON_VALID(c.rawCode) AND JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(c.rawCode),c.rawCode,'{}'),'$.id')) REGEXP '^[0-9]+$' AND d.id=CAST(JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(c.rawCode),c.rawCode,'{}'),'$.id')) AS UNSIGNED)) OR d.name=c.rawCode OR d.abbrev=c.rawCode OR d.name=JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(c.rawCode),c.rawCode,'{}'),'$.name'));
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalDiagnosisInvalid AS SELECT DISTINCT visitId FROM medicalDiagnosisResolved WHERE diseaseId IS NULL;
--> statement-breakpoint
INSERT INTO medicalDiagnosisInvalid SELECT visitId FROM medicalDiagnosisResolved GROUP BY visitId,reportId,rawCode HAVING COUNT(DISTINCT diseaseId)>1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,'diagnosisCodes',CONCAT('doctorReport:',c.reportId,':',MD5(c.rawCode)),c.rawCode FROM medicalDiagnosisResolved c INNER JOIN medicalDiagnosisVariants variants ON variants.visitId=c.visitId LEFT JOIN medicalDiagnosisInvalid invalid ON invalid.visitId=c.visitId WHERE variants.variants>1 OR invalid.visitId IS NOT NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO visitDiagnosisCodes(patientId,visitId,diseaseId) SELECT DISTINCT c.patientId,c.visitId,c.diseaseId FROM medicalDiagnosisResolved c INNER JOIN medicalDiagnosisVariants variants ON variants.visitId=c.visitId AND variants.variants=1 LEFT JOIN medicalDiagnosisInvalid invalid ON invalid.visitId=c.visitId LEFT JOIN medicalDiagnosisCanonicalBefore old ON old.visitId=c.visitId WHERE old.visitId IS NULL AND invalid.visitId IS NULL AND c.diseaseId IS NOT NULL ON DUPLICATE KEY UPDATE diseaseId=VALUES(diseaseId);
--> statement-breakpoint
INSERT INTO medicalMigrationCandidates SELECT s.patientId,f.visitId,'treatment',CONCAT('followup:',f.id),TRIM(f.treatment) FROM followupItems f INNER JOIN followupSheets s ON s.id=f.followupSheetId INNER JOIN visits v ON v.id=f.visitId AND v.patientId=s.patientId WHERE NULLIF(TRIM(f.treatment),'') IS NOT NULL;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalMigrationSummary AS SELECT visitId,fieldName,COUNT(DISTINCT CAST(candidateValue AS BINARY)) AS variants FROM medicalMigrationCandidates GROUP BY visitId,fieldName;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='complaint' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitComplaints`(patientId,visitId,`complaint`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitComplaints` current ON current.visitId=c.visitId WHERE c.fieldName='complaint' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='symptoms' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitSymptoms`(patientId,visitId,`symptoms`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitSymptoms` current ON current.visitId=c.visitId WHERE c.fieldName='symptoms' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='diagnosis' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitDiagnoses`(patientId,visitId,`diagnosis`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitDiagnoses` current ON current.visitId=c.visitId WHERE c.fieldName='diagnosis' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='treatment' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitTreatmentPlans`(patientId,visitId,`treatment`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitTreatmentPlans` current ON current.visitId=c.visitId WHERE c.fieldName='treatment' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='decision' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitDecisions`(patientId,visitId,`decision`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitDecisions` current ON current.visitId=c.visitId WHERE c.fieldName='decision' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,c.fieldName,c.sourceRef,c.candidateValue FROM medicalMigrationCandidates c INNER JOIN medicalMigrationSummary d ON d.visitId=c.visitId AND d.fieldName=c.fieldName AND d.variants>1 WHERE c.fieldName='history' ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `visitMedicalHistory`(patientId,visitId,`history`) SELECT MIN(c.patientId),c.visitId,MIN(c.candidateValue) FROM medicalMigrationCandidates c LEFT JOIN `visitMedicalHistory` current ON current.visitId=c.visitId WHERE c.fieldName='history' AND current.id IS NULL GROUP BY c.visitId HAVING COUNT(DISTINCT CAST(c.candidateValue AS BINARY))=1;
--> statement-breakpoint
INSERT INTO autorefractometryData(patientId,examinationId,sphereOD,cylinderOD,axisOD,ucvaOD,sphereOS,cylinderOS,axisOS,ucvaOS) SELECT e.patientId,e.id,e.sphereOD,e.cylinderOD,e.axisOD,e.ucvaOD,e.sphereOS,e.cylinderOS,e.axisOS,e.ucvaOS FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId LEFT JOIN autorefractometryData a ON a.examinationId=e.id WHERE a.id IS NULL AND COALESCE(NULLIF(TRIM(e.sphereOD),''),NULLIF(TRIM(e.cylinderOD),''),NULLIF(TRIM(e.axisOD),''),NULLIF(TRIM(e.ucvaOD),''),NULLIF(TRIM(e.sphereOS),''),NULLIF(TRIM(e.cylinderOS),''),NULLIF(TRIM(e.axisOS),''),NULLIF(TRIM(e.ucvaOS),'')) IS NOT NULL;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalPressureCandidates (patientId int NOT NULL, visitId int NOT NULL, examinationId int NOT NULL, eye varchar(2) NOT NULL, sourceRef varchar(191) NOT NULL, candidateValue varchar(50) NOT NULL);
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT e.patientId,e.visitId,e.id,'OD',CONCAT('examinations:',e.id,':iopOD'),TRIM(e.`iopOD`) FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(e.`iopOD`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT e.patientId,e.visitId,e.id,'OD',CONCAT('examinations:',e.id,':airPuffOD'),TRIM(e.`airPuffOD`) FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(e.`airPuffOD`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT a.patientId,e.visitId,e.id,'OD',CONCAT('autorefractometryData:',a.id,':iopOD'),TRIM(a.`iopOD`) FROM autorefractometryData a INNER JOIN examinations e ON e.id=a.examinationId AND e.patientId=a.patientId INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(a.`iopOD`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT e.patientId,e.visitId,e.id,'OS',CONCAT('examinations:',e.id,':iopOS'),TRIM(e.`iopOS`) FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(e.`iopOS`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT e.patientId,e.visitId,e.id,'OS',CONCAT('examinations:',e.id,':airPuffOS'),TRIM(e.`airPuffOS`) FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(e.`airPuffOS`),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalPressureCandidates SELECT a.patientId,e.visitId,e.id,'OS',CONCAT('autorefractometryData:',a.id,':iopOS'),TRIM(a.`iopOS`) FROM autorefractometryData a INNER JOIN examinations e ON e.id=a.examinationId AND e.patientId=a.patientId INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(a.`iopOS`),'') IS NOT NULL;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalPressureSummary AS SELECT examinationId,eye,COUNT(DISTINCT CAST(candidateValue AS BINARY)) AS variants FROM medicalPressureCandidates GROUP BY examinationId,eye;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,CONCAT('pressure:',c.examinationId,':',c.eye),c.sourceRef,c.candidateValue FROM medicalPressureCandidates c INNER JOIN medicalPressureSummary d ON d.examinationId=c.examinationId AND d.eye=c.eye AND d.variants>1 ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO airPuffMeasurements(patientId,visitId,examinationId,iopOD,iopOS) SELECT MIN(c.patientId),MIN(c.visitId),c.examinationId,CASE WHEN COUNT(DISTINCT CASE WHEN c.eye='OD' THEN CAST(c.candidateValue AS BINARY) END)=1 THEN MAX(CASE WHEN c.eye='OD' THEN c.candidateValue END) END,CASE WHEN COUNT(DISTINCT CASE WHEN c.eye='OS' THEN CAST(c.candidateValue AS BINARY) END)=1 THEN MAX(CASE WHEN c.eye='OS' THEN c.candidateValue END) END FROM medicalPressureCandidates c LEFT JOIN airPuffMeasurements p ON p.examinationId=c.examinationId WHERE p.id IS NULL GROUP BY c.examinationId;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalPressureCandidates;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalMigrationCandidates;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalPressureSummary;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalMigrationSummary;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalDiagnosisCandidates;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalDiagnosisCanonicalBefore;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalMigrationNumbers;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalDiagnosisResolved;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalDiagnosisInvalid;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalDiagnosisVariants;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT h.patientId,NULL,'followupVisitLink',CONCAT('followup:',f.id),COALESCE(CAST(f.followupDate AS CHAR),'No date') FROM followupItems f INNER JOIN followupSheets h ON h.id=f.followupSheetId LEFT JOIN visits v ON v.id=f.visitId AND v.patientId=h.patientId WHERE v.id IS NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT r.patientId,NULL,'reportVisitLink',CONCAT('doctorReports:',r.id),COALESCE(CAST(r.visitId AS CHAR),'No visit') FROM doctorReports r LEFT JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE v.id IS NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT r.patientId,NULL,'prescriptionVisitLink',CONCAT('prescriptions:',r.id),COALESCE(CAST(r.visitId AS CHAR),'No visit') FROM prescriptions r LEFT JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE v.id IS NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT r.patientId,NULL,'testRequestVisitLink',CONCAT('testRequests:',r.id),COALESCE(CAST(r.visitId AS CHAR),'No visit') FROM testRequests r LEFT JOIN visits v ON v.id=r.visitId AND v.patientId=r.patientId WHERE v.id IS NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT h.patientId,v.id,'sheetExaminationLink',CONCAT('sheet:',h.id),CAST(COUNT(e.id) AS CHAR) FROM sheet_entries h INNER JOIN visits v ON v.id=h.visitId AND v.patientId=h.patientId LEFT JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId GROUP BY h.id,h.patientId,v.id HAVING COUNT(e.id)<>1 ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT s.patientId,NULL,'sheetVisitLink',CONCAT('sheet:',s.id),COALESCE(CAST(s.visitId AS CHAR),'No confirmed visit') FROM sheet_entries s LEFT JOIN visits v ON v.id=s.visitId AND v.patientId=s.patientId WHERE v.id IS NULL ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
