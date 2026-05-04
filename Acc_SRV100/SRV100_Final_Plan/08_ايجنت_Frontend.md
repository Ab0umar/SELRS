# Agent: Frontend

## مهمته
تنفيذ الواجهة والشاشات والتنقل والفلاتر والجداول.

## المطلوب منه
1. فصل Navigation الطبي عن الحسابات.
2. تطبيق Light Mode.
3. تطبيق ألوان Web.
4. بناء صفحات الحسابات.
5. بناء صفحات الطبي أو تعديلها بدون خلط.
6. بناء Components مشتركة:
   - FilterCard
   - DataTable
   - StatCard
   - PrintPreviewButton
   - ModuleShortcuts

## قواعد التنفيذ
- لا يضع منطق حسابات معقد داخل React.
- يستدعي API جاهزة.
- يحافظ على أسماء واضحة للملفات.
- كل شاشة في ملف منفصل قدر الإمكان.
- أي Component كبير يتم تقسيمه.

## Deliverables
- AccountsLayout
- MedicalLayout
- AccountsDashboard
- DailyRevenuePage
- ServiceRevenuePage
- ReceiptsInquiryPage
- PatientInquiryPage
- PatientAccountPage
- PrintPreviewPage
