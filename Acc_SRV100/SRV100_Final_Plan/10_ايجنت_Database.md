# Agent: Database

## مهمته
مراجعة قاعدة البيانات والجداول والعلاقات.

## المطلوب منه
1. توحيد أسماء الجداول والحقول.
2. التأكد من وجود Receipt و ReceiptItems.
3. ربط الخدمات بالأقسام.
4. ربط الإيصال بالوردية والمستخدم.
5. جعل doctorId اختياري في ReceiptItems.
6. تجهيز Views/Queries للتقارير.

## Views مقترحة
- vw_DailyRevenue
- vw_ServiceRevenue
- vw_ReceiptDetails
- vw_PatientAccount

## قواعد
- لا تستخدم Cascade خطير بين أكثر من مسار.
- الفهارس مهمة على:
  - receiptDate
  - patientId
  - serviceId
  - doctorId
  - shiftId
