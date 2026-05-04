# موديل قاعدة البيانات والباك إند

## الهدف
مصدر بيانات ثابت ونظيف للتقارير والشاشات.

## جداول أساسية

### Patients
- id
- code
- name
- phone
- birthDate
- gender
- createdAt

### Doctors
- id
- name
- specialty
- active

### Departments
- id
- name
- active

### Services
- id
- name
- departmentId
- price
- active

### Shifts
- id
- name
- startTime
- endTime

### Receipts
- id
- receiptNo
- patientId
- shiftId
- userId
- receiptDate
- total
- discount
- net

### ReceiptItems
- id
- receiptId
- serviceId
- departmentId
- doctorId nullable
- price
- discount
- net

### Users
- id
- username
- passwordHash
- role
- active

### FiscalYears
- id
- yearName
- startDate
- endDate
- active

## APIs مقترحة
- GET /accounts/daily-revenue
- GET /accounts/service-revenue
- GET /accounts/receipts
- GET /accounts/patient-inquiry
- GET /accounts/patient-account
- GET /medical/patients
- GET /medical/doctors
- GET /medical/services
- POST /receipts
- GET /print/report-preview

## قواعد مهمة
- كل تقرير يتم تنفيذه Query واضحة.
- لا يتم حساب الإجماليات من الواجهة فقط.
- الواجهة تعرض أرقام الباك إند.
- أي فلتر اختياري لازم يتعامل معه الباك إند بدون كسر التقرير.
