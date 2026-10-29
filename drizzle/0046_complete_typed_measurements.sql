-- Dedicated typed columns for repeated readings, second Pentacam axes, and investigation notes.
ALTER TABLE `autorefractometryData` ADD COLUMN `sphere2OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `cylinder2OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `axis2OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `sphere3OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `cylinder3OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `axis3OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `sphere2OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `cylinder2OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `axis2OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `sphere3OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `cylinder3OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `autorefractometryData` ADD COLUMN `axis3OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD COLUMN `axis2OD` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `pentacamResults` ADD COLUMN `axis2OS` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `examinationFindings` ADD COLUMN `investigationNotes` text NULL;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalRemainingCandidates(patientId int NOT NULL,visitId int NOT NULL,examinationId int NOT NULL,targetName varchar(60) NOT NULL,fieldName varchar(100) NOT NULL,sourceRef varchar(191) NOT NULL,candidateValue text NOT NULL);
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'examinationFindings','investigationNotes',CONCAT('exam-notes:',e.id),CASE WHEN JSON_VALID(e.radiologyLabsNotes) THEN CASE JSON_TYPE(e.radiologyLabsNotes) WHEN 'OBJECT' THEN JSON_UNQUOTE(JSON_EXTRACT(e.radiologyLabsNotes,'$.notes')) WHEN 'STRING' THEN JSON_UNQUOTE(e.radiologyLabsNotes) END ELSE e.radiologyLabsNotes END FROM examinations e INNER JOIN visits v ON v.id=e.visitId AND v.patientId=e.patientId WHERE NULLIF(TRIM(CASE WHEN JSON_VALID(e.radiologyLabsNotes) THEN CASE JSON_TYPE(e.radiologyLabsNotes) WHEN 'OBJECT' THEN JSON_UNQUOTE(JSON_EXTRACT(e.radiologyLabsNotes,'$.notes')) WHEN 'STRING' THEN JSON_UNQUOTE(e.radiologyLabsNotes) END ELSE e.radiologyLabsNotes END),'') IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere2OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.s2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.s2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.s2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere2OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`sphere2OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`sphere2OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder2OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.c2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.c2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.c2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder2OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`cylinder2OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`cylinder2OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis2OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.a2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.a2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.a2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis2OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`axis2OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`axis2OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere3OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.s3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.s3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.s3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere3OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`sphere3OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`sphere3OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder3OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.c3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.c3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.c3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder3OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`cylinder3OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`cylinder3OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis3OD',CONCAT('sheet:',s.id,':$.examData.autorefraction.od.a3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.a3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.od.a3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis3OD',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`axis3OD` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`axis3OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere2OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.s2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.s2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.s2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere2OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`sphere2OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`sphere2OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder2OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.c2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.c2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.c2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder2OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`cylinder2OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`cylinder2OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis2OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.a2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.a2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.a2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis2OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`axis2OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`axis2OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere3OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.s3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.s3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.s3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','sphere3OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`sphere3OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`sphere3OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder3OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.c3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.c3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.c3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','cylinder3OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`cylinder3OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`cylinder3OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis3OS',CONCAT('sheet:',s.id,':$.examData.autorefraction.os.a3'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.a3')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.autorefraction.os.a3')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'autorefractometryData','axis3OS',CONCAT('canonical:autorefractometryData:',t.id),CAST(t.`axis3OS` AS CHAR) FROM `autorefractometryData` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`axis3OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'pentacamResults','axis2OD',CONCAT('sheet:',s.id,':$.examData.pentacam.od.ax2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.pentacam.od.ax2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.pentacam.od.ax2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'pentacamResults','axis2OD',CONCAT('canonical:pentacamResults:',t.id),CAST(t.`axis2OD` AS CHAR) FROM `pentacamResults` t INNER JOIN examinations e ON t.visitId=e.visitId AND e.patientId=t.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE t.`axis2OD` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'pentacamResults','axis2OS',CONCAT('sheet:',s.id,':$.examData.pentacam.os.ax2'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.pentacam.os.ax2')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examData.pentacam.os.ax2')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'pentacamResults','axis2OS',CONCAT('canonical:pentacamResults:',t.id),CAST(t.`axis2OS` AS CHAR) FROM `pentacamResults` t INNER JOIN examinations e ON t.visitId=e.visitId AND e.patientId=t.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE t.`axis2OS` IS NOT NULL;
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'examinationFindings','investigationNotes',CONCAT('sheet:',s.id,':$.examinationNotes'),JSON_UNQUOTE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examinationNotes')) FROM sheet_entries s INNER JOIN visits v ON v.patientId=s.patientId AND v.id=s.visitId INNER JOIN examinations e ON e.visitId=v.id AND e.patientId=v.patientId INNER JOIN (SELECT patientId,visitId FROM examinations GROUP BY patientId,visitId HAVING COUNT(*)=1) uniqueExam ON uniqueExam.visitId=e.visitId AND uniqueExam.patientId=e.patientId WHERE JSON_TYPE(JSON_EXTRACT(IF(JSON_VALID(s.content),s.content,'{}'),'$.examinationNotes')) IN ('STRING','INTEGER','DOUBLE');
--> statement-breakpoint
INSERT INTO medicalRemainingCandidates SELECT e.patientId,e.visitId,e.id,'examinationFindings','investigationNotes',CONCAT('canonical:examinationFindings:',t.id),CAST(t.`investigationNotes` AS CHAR) FROM `examinationFindings` t INNER JOIN examinations e ON t.examinationId=e.id AND e.patientId=t.patientId WHERE t.`investigationNotes` IS NOT NULL;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalRemainingSummary AS SELECT MIN(patientId) AS patientId,MIN(visitId) AS visitId,examinationId,targetName,fieldName,COUNT(DISTINCT CAST(candidateValue AS BINARY)) AS variants,MAX(candidateValue) AS selectedValue FROM medicalRemainingCandidates GROUP BY examinationId,targetName,fieldName;
--> statement-breakpoint
INSERT INTO medicalMigrationConflicts(patientId,visitId,fieldName,sourceRef,candidateValue) SELECT c.patientId,c.visitId,CONCAT(c.targetName,':',c.examinationId,':',c.fieldName),c.sourceRef,c.candidateValue FROM medicalRemainingCandidates c INNER JOIN medicalRemainingSummary r ON r.examinationId=c.examinationId AND r.targetName=c.targetName AND r.fieldName=c.fieldName WHERE r.variants>1 OR (c.fieldName<>'investigationNotes' AND CHAR_LENGTH(c.candidateValue)>20) ON DUPLICATE KEY UPDATE sourceRef=VALUES(sourceRef);
--> statement-breakpoint
INSERT INTO `autorefractometryData`(patientId,examinationId) SELECT MIN(r.patientId),r.examinationId FROM medicalRemainingSummary r LEFT JOIN `autorefractometryData` t ON t.examinationId=r.examinationId WHERE r.targetName='autorefractometryData' AND r.variants=1 AND t.id IS NULL GROUP BY r.examinationId;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalUniqueautorefractometryData AS SELECT examinationId AS linkId,MIN(id) AS recordId FROM `autorefractometryData` GROUP BY examinationId HAVING COUNT(*)=1;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='sphere2OD' SET t.`sphere2OD`=r.selectedValue WHERE t.`sphere2OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='cylinder2OD' SET t.`cylinder2OD`=r.selectedValue WHERE t.`cylinder2OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='axis2OD' SET t.`axis2OD`=r.selectedValue WHERE t.`axis2OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='sphere3OD' SET t.`sphere3OD`=r.selectedValue WHERE t.`sphere3OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='cylinder3OD' SET t.`cylinder3OD`=r.selectedValue WHERE t.`cylinder3OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='axis3OD' SET t.`axis3OD`=r.selectedValue WHERE t.`axis3OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='sphere2OS' SET t.`sphere2OS`=r.selectedValue WHERE t.`sphere2OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='cylinder2OS' SET t.`cylinder2OS`=r.selectedValue WHERE t.`cylinder2OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='axis2OS' SET t.`axis2OS`=r.selectedValue WHERE t.`axis2OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='sphere3OS' SET t.`sphere3OS`=r.selectedValue WHERE t.`sphere3OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='cylinder3OS' SET t.`cylinder3OS`=r.selectedValue WHERE t.`cylinder3OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `autorefractometryData` t INNER JOIN medicalUniqueautorefractometryData u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='autorefractometryData' AND r.fieldName='axis3OS' SET t.`axis3OS`=r.selectedValue WHERE t.`axis3OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalUniqueautorefractometryData;
--> statement-breakpoint
INSERT INTO `examinationFindings`(patientId,examinationId,visitId) SELECT MIN(r.patientId),r.examinationId,MIN(r.visitId) FROM medicalRemainingSummary r LEFT JOIN `examinationFindings` t ON t.examinationId=r.examinationId WHERE r.targetName='examinationFindings' AND r.variants=1 AND t.id IS NULL GROUP BY r.examinationId;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalUniqueexaminationFindings AS SELECT examinationId AS linkId,MIN(id) AS recordId FROM `examinationFindings` GROUP BY examinationId HAVING COUNT(*)=1;
--> statement-breakpoint
UPDATE `examinationFindings` t INNER JOIN medicalUniqueexaminationFindings u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.examinationId=u.linkId AND r.targetName='examinationFindings' AND r.fieldName='investigationNotes' SET t.`investigationNotes`=r.selectedValue WHERE t.`investigationNotes` IS NULL AND r.variants=1;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalUniqueexaminationFindings;
--> statement-breakpoint
INSERT INTO `pentacamResults`(patientId,visitId) SELECT MIN(r.patientId),r.visitId FROM medicalRemainingSummary r LEFT JOIN `pentacamResults` t ON t.visitId=r.visitId WHERE r.targetName='pentacamResults' AND r.variants=1 AND t.id IS NULL GROUP BY r.visitId;
--> statement-breakpoint
CREATE TEMPORARY TABLE medicalUniquepentacamResults AS SELECT visitId AS linkId,MIN(id) AS recordId FROM `pentacamResults` GROUP BY visitId HAVING COUNT(*)=1;
--> statement-breakpoint
UPDATE `pentacamResults` t INNER JOIN medicalUniquepentacamResults u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.visitId=u.linkId AND r.targetName='pentacamResults' AND r.fieldName='axis2OD' SET t.`axis2OD`=r.selectedValue WHERE t.`axis2OD` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
UPDATE `pentacamResults` t INNER JOIN medicalUniquepentacamResults u ON u.recordId=t.id INNER JOIN medicalRemainingSummary r ON r.visitId=u.linkId AND r.targetName='pentacamResults' AND r.fieldName='axis2OS' SET t.`axis2OS`=r.selectedValue WHERE t.`axis2OS` IS NULL AND r.variants=1 AND CHAR_LENGTH(r.selectedValue)<=20;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalUniquepentacamResults;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalRemainingSummary;
--> statement-breakpoint
DROP TEMPORARY TABLE medicalRemainingCandidates;
