# Agent: Backend

## مهمته
تنفيذ APIs والمنطق الحسابي والتقارير.

## المطلوب منه
1. تجهيز Endpoints الحسابات.
2. تنفيذ Queries الفلاتر.
3. حساب الإجماليات من قاعدة البيانات.
4. ضمان أن الطباعة تستخدم نفس مصدر بيانات الشاشة.
5. التعامل مع السنة والوردية.

## قواعد التنفيذ
- لا يعتمد على الواجهة في الحسابات.
- كل Endpoint يرجع:
  - filtersUsed
  - rows
  - totals
- يستخدم أسماء واضحة.
- يتعامل مع Null filters.

## Endpoints أساسية
- dailyRevenue(filters)
- serviceRevenue(filters)
- receiptsInquiry(filters)
- patientInquiry(filters)
- patientAccount(filters)
