CREATE TABLE `medicalConditionReportTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`operationType` varchar(100),
	`condition` text,
	`complications` text,
	`followUpPlan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalConditionReportTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `medicalConditionReportTemplates` (`name`, `operationType`, `condition`, `complications`, `followUpPlan`) VALUES
('متابعة طبيعية بعد الليزك', 'Lasik', 'تعافي طبيعي بعد عملية تصحيح الإبصار بالليزك', 'لا يوجد مضاعفات ملاحظة', 'متابعة دورية حسب الجدول المعتاد'),
('متابعة طبيعية بعد PRK', 'PRK', 'تعافي طبيعي بعد عملية PRK', 'لا يوجد مضاعفات ملاحظة', 'متابعة دورية حسب الجدول المعتاد'),
('متابعة طبيعية بعد عملية الكتاراكت', 'Cataract', 'تعافي طبيعي بعد استبدال عدسة العين (الكتاراكت)', 'لا يوجد مضاعفات ملاحظة', 'متابعة دورية حسب الجدول المعتاد'),
('التهاب القرنية - يستدعي متابعة', NULL, 'التهاب في القرنية يستدعي متابعة طبية', 'التهاب قرنية ملحوظ', 'متابعة مكثفة وإعادة الفحص خلال أيام قليلة'),
('جفاف العين بعد الجراحة', NULL, 'جفاف في سطح العين بعد الإجراء الجراحي', 'جفاف سطحي بدون مضاعفات خطيرة', 'استخدام قطرات الترطيب مع متابعة دورية'),
('تأخر التئام - يستدعي متابعة مكثفة', NULL, 'تأخر في التئام الجرح الجراحي', 'تأخر التئام يستدعي عناية إضافية', 'متابعة مكثفة أسبوعياً حتى اكتمال التعافي');
