# تقسيم صفحات SELRS - المراجعة الشاملة

## 📑 الصفحات مقسمة حسب الفئات

**إجمالي الصفحات: 47 صفحة**

---

## 🏠 **الصفحات الأساسية** (3 صفحات)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| الرئيسية | `Home.tsx` | نقطة الدخول الأولى بعد تسجيل الدخول | 12KB |
| لوحة التحكم | `Dashboard.tsx` | إحصائيات وتقارير وأنشطة | 67KB |
| تسجيل الدخول | `Login.tsx` | صفحة تسجيل الدخول | صغير جداً |

---

## 👥 **إدارة المرضى** (6 صفحات)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| **قائمة المرضى** | `Patients.tsx` | البحث والفلتر والعمليات الجماعية | **123KB** |
| **تفاصيل المريض** | `PatientDetails.tsx` | ملف المريض الكامل | 58KB |
| **ملخص المريض** | `PatientSummary.tsx` | نظرة سريعة على المريض | 44KB |
| **إدخال سريع** | `QuickPatientEntry.tsx` | إضافة مريض جديد بسرعة | 8.8KB |
| **عرض الطبيب** | `DoctorPatientView.tsx` | رؤية المريض من منظور الطبيب | 9.2KB |
| **الزيارات** | `Visits.tsx` | سجل الزيارات والمتابعات | 12KB |

---

## 📋 **النماذج الطبية والفحوصات** (8 صفحات)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| **نموذج الفحص الشامل** | `ExaminationForm.tsx` | فحص العين الكامل | **121KB** |
| **ورقة الاستشارة** | `ConsultantSheet.tsx` | تقارير الاستشارة | 54KB |
| **ورقة الأخصائي** | `SpecialistSheet.tsx` | فحوصات الأخصائيين | 31KB |
| **فحص الليزك** | `LasikExamSheet.tsx` | تقييم ما قبل عملية الليزك | 56KB |
| **متابعة الليزك** | `LasikFollowupPage.tsx` | متابعة ما بعد عملية الليزك | 16KB |
| **ورقة العملية** | `OperationSheet.tsx` | توثيق العمليات الجراحية | 13KB |
| **العمليات الخارجية** | `ExternalOperationSheet.tsx` | عمليات بمراكز أخرى | 49KB |
| **ورقة البنتاكام** | `PentacamSheet.tsx` | نتائج تصوير القرنية | 11KB |

---

## 📅 **جدولة المواعيد** (1 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| المواعيد | `Appointments.tsx` | جدولة وإدارة المواعيد | 64KB |

---

## 🔄 **المتابعات والزيارات** (3 صفحات) ⭐ **جديد**
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| المتابعات | `Followups.tsx` | سجل المتابعات | 123 بايت |
| نموذج المتابعة | `FollowupForm.tsx` | إنشاء متابعة جديدة | 13KB |
| الحالات الجديدة | `NewCases.tsx` | قائمة الحالات الجديدة | 19KB |

---

## 🧪 **الفحوصات والاختبارات** (3 صفحات)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| طلب الاختبارات | `RequestTests.tsx` | طلب الفحوصات التشخيصية | 44KB |
| إدارة الاختبارات | `TestsManagement.tsx` | إضافة/تحرير الاختبارات | 11KB |
| إدارة الأدوية والاختبارات | `MedicationsTestsManagement.tsx` | إدارة موحدة | 19KB |

---

## 💊 **الوصفات والأدوية** (2 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| كتابة الوصفة | `WritePrescription.tsx` | إنشاء الوصفات الطبية | 61KB |
| إدارة الأدوية | `MedicationsManagement.tsx` | إدارة مخزون الأدوية | 42KB |

---

## 📄 **التقارير الطبية** (1 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| التقارير الطبية | `MedicalReports.tsx` | إنشاء وحفظ التقارير | 40KB |

---

## 🏥 **إدارة العمليات الجراحية** (1 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| العمليات | `Surgeries.tsx` | جدولة وإدارة العمليات | 25KB |

---

## ⚙️ **لوحة تحكم الإدارة** (13 صفحة)

### المستخدمين والأدوار والخدمات
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| إدارة المستخدمين | `AdminUsers.tsx` | إنشاء وتحرير الحسابات | 33KB |
| إدارة الأطباء | `AdminDoctors.tsx` | إدارة ملفات الأطباء | 16KB |
| إدارة الصلاحيات | `AdminPermissions.tsx` | التحكم في الأذونات | 8.8KB |
| إدارة الخدمات | `AdminServices.tsx` | إدارة الأقسام الطبية | 24KB |

### النماذج والأوراق
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| إدارة النماذج | `AdminSheets.tsx` | إدارة أنواع النماذج | 6.7KB |
| مصمم النماذج | `AdminSheetDesigner.tsx` | بناء نماذج مخصصة | 27KB |
| نسخ النماذج | `AdminSheetCopies.tsx` | إدارة النسخ المكررة | 4.6KB |

### إدارة البيانات والنظام
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| إدارة المرضى | `AdminPatients.tsx` | عمليات جماعية على المرضى | 58KB |
| حالة النظام | `AdminStatus.tsx` | لوحة صحة النظام | 13KB |
| الهجرات | `AdminMigrations.tsx` | إدارة هجرات قاعدة البيانات | 6.8KB |
| أدوات API | `AdminApiTools.tsx` | اختبار API يدويًا | 24KB |
| البنتاكام الفاشل | `AdminPentacamFailed.tsx` | استرجاع الواردات الفاشلة | 25KB |
| الإعدادات | `AdminSettings.tsx` | إعدادات النظام العامة | 24KB |

---

## 👤 **إدارة الحسابات الشخصية** (2 صفحات)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| الملف الشخصي | `Profile.tsx` | تعديل بيانات المستخدم | 8.7KB |
| تغيير كلمة المرور | `ForcePasswordChange.tsx` | فرض تغيير كلمة المرور | 7.1KB |

---

## 🔧 **صفحات متخصصة وعرض** (2 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| اختبار الانكسار | `RefractionPage.tsx` | قياس الانكسار الضوئي | 27KB |
| عرض المكونات | `ComponentShowcase.tsx` | عرض جميع المكونات المتاحة | 59KB |

---

## ❌ **صفحات الأخطاء والتنقل** (1 صفحة)
| الصفحة | الملف | الوصف | الحجم |
|--------|------|-------|-------|
| 404 - غير موجود | `NotFound.tsx` | صفحة خطأ | 2.2KB |

---

## 📊 **إجمالي الإحصائيات**

```
✅ إجمالي الصفحات: 47 صفحة

التقسيم بالتفصيل:
├── الصفحات الأساسية: 3
├── إدارة المرضى: 6 ⭐ (أضفنا QuickPatientEntry, DoctorPatientView, Visits)
├── النماذج الطبية: 8
├── جدولة المواعيد: 1
├── المتابعات والزيارات: 3 ⭐ (جديد)
├── الاختبارات: 3
├── الأدوية والوصفات: 2
├── التقارير: 1
├── العمليات الجراحية: 1
├── لوحة الإدارة: 13 (أضفنا صفحة)
├── إدارة الحسابات: 2
├── الصفحات المتخصصة: 2
└── الأخطاء: 1

الحجم الإجمالي: ~1.4 MB

أكبر 5 صفحات:
1. ExaminationForm.tsx - 121KB (نموذج الفحص)
2. Patients.tsx - 123KB (قائمة المرضى)
3. Dashboard.tsx - 67KB (لوحة التحكم)
4. Appointments.tsx - 64KB (المواعيد)
5. ComponentShowcase.tsx - 59KB (عرض المكونات)
```

---

## 🎯 **تقسيم حسب الوظيفة الرئيسية**

### **للأطباء والعاملين الطبيين:** (23 صفحة)
- ExaminationForm (الفحص الشامل)
- ConsultantSheet (الاستشارة)
- SpecialistSheet (الأخصائيين)
- LasikExamSheet & LasikFollowupPage (الليزك)
- OperationSheet & ExternalOperationSheet (العمليات)
- Surgeries (جدولة العمليات)
- WritePrescription (الوصفات)
- RequestTests (طلب الاختبارات)
- MedicalReports (التقارير)
- PatientDetails (تفاصيل المريض)
- PatientSummary (ملخص المريض)
- **DoctorPatientView (رؤية الطبيب)**
- **Followups (المتابعات)**
- **FollowupForm (نموذج المتابعة)**
- RefractionPage (قياس الانكسار)
- ConsultantFollowupPage (متابعة الاستشارة)
- Visits (الزيارات)
- **NewCases (الحالات الجديدة)**
- PentacamSheet (البنتاكام)
- Appointments (المواعيد)
- Patients (قائمة المرضى)
- Dashboard (لوحة التحكم)
- Home (الرئيسية)

### **لموظفي الاستقبال:** (5 صفحات)
- Patients (قائمة المرضى)
- Appointments (المواعيد)
- **QuickPatientEntry (إدخال سريع)**
- PatientDetails (تفاصيل المريض)
- Home (الرئيسية)

### **للمديرين والإداريين:** (19 صفحة)
- Dashboard (اللوحة الرئيسية)
- AdminUsers (إدارة المستخدمين)
- AdminDoctors (إدارة الأطباء)
- AdminServices (إدارة الخدمات)
- AdminSettings (الإعدادات)
- AdminStatus (حالة النظام)
- AdminPermissions (الصلاحيات)
- AdminPatients (إدارة المرضى)
- AdminSheetDesigner (مصمم النماذج)
- AdminSheets (إدارة النماذج)
- AdminSheetCopies (نسخ النماذج)
- AdminMigrations (الهجرات)
- AdminApiTools (أدوات API)
- AdminPentacamFailed (البنتاكام الفاشل)
- MedicationsManagement (إدارة الأدوية)
- TestsManagement (إدارة الاختبارات)
- MedicationsTestsManagement (الأدوية والاختبارات)
- Profile (الملف الشخصي)
- Home (الرئيسية)

### **للجميع:**
- Login (تسجيل الدخول)
- Profile (الملف الشخصي)
- ForcePasswordChange (تغيير كلمة المرور)
- NotFound (404)
- ComponentShowcase (عرض المكونات)

---

## 🏗️ **معمارية التنقل**

```
Login
  ↓
Home (الرئيسية)
  ├─→ Dashboard (لوحة التحكم)
  │
  ├─→ PATIENTS (المرضى - 6 صفحات)
  │   ├─→ Patients (قائمة)
  │   ├─→ QuickPatientEntry (إدخال سريع)
  │   ├─→ PatientDetails (التفاصيل)
  │   ├─→ PatientSummary (الملخص)
  │   ├─→ DoctorPatientView (رؤية الطبيب)
  │   └─→ Visits (الزيارات)
  │
  ├─→ APPOINTMENTS (المواعيد)
  │   └─→ Appointments
  │
  ├─→ MEDICAL FORMS (النماذج - 8 صفحات)
  │   ├─→ ExaminationForm (فحص شامل)
  │   ├─→ ConsultantSheet
  │   ├─→ SpecialistSheet
  │   ├─→ LasikExamSheet
  │   ├─→ LasikFollowupPage
  │   ├─→ OperationSheet
  │   ├─→ ExternalOperationSheet
  │   └─→ PentacamSheet
  │
  ├─→ SURGERIES (العمليات)
  │   └─→ Surgeries
  │
  ├─→ PRESCRIPTIONS (الوصفات)
  │   └─→ WritePrescription
  │
  ├─→ TESTS (الاختبارات)
  │   ├─→ RequestTests
  │   └─→ TestsManagement
  │
  ├─→ REPORTS (التقارير)
  │   └─→ MedicalReports
  │
  ├─→ FOLLOWUPS (المتابعات - جديد)
  │   ├─→ Followups
  │   ├─→ FollowupForm
  │   ├─→ ConsultantFollowupPage
  │   └─→ NewCases
  │
  ├─→ ADMIN (الإدارة - 13 صفحة)
  │   ├─→ AdminUsers
  │   ├─→ AdminDoctors
  │   ├─→ AdminServices
  │   ├─→ AdminSheets
  │   ├─→ AdminSheetDesigner
  │   ├─→ AdminSettings
  │   ├─→ AdminStatus
  │   ├─→ AdminPermissions
  │   ├─→ AdminPatients
  │   ├─→ AdminMigrations
  │   ├─→ AdminApiTools
  │   ├─→ AdminPentacamFailed
  │   └─→ AdminSheetCopies
  │
  ├─→ PROFILE (الملف الشخصي)
  │   └─→ Profile
  │
  ├─→ OTHER
  │   ├─→ RefractionPage (قياس الانكسار)
  │   └─→ ComponentShowcase (عرض المكونات)
  │
  └─→ SETTINGS
      └─→ ForcePasswordChange (تغيير كلمة المرور)
```

---

## 📝 **الملاحظات المهمة**

### ✅ **الصفحات المضافة في هذه المراجعة:**
1. **QuickPatientEntry.tsx** - إدخال سريع للمريض
2. **DoctorPatientView.tsx** - رؤية المريض من منظور الطبيب
3. **Visits.tsx** - سجل الزيارات
4. **FollowupForm.tsx** - نموذج المتابعة
5. **Followups.tsx** - سجل المتابعات (صفحة صغيرة جداً - 123 بايت)
6. **NewCases.tsx** - قائمة الحالات الجديدة

### 💾 **حجم الملفات:**
- **الأكبر:** Patients.tsx (123KB) و ExaminationForm.tsx (121KB)
- **الأصغر:** Followups.tsx (123 بايت) و NotFound.tsx (2.2KB)
- **الحجم الإجمالي:** ~1.4 MB

### 🎯 **نسبة الصفحات:**
- **نسبة الإدارة:** 28% (13 صفحة من 47)
- **نسبة المرضى والفحوصات:** 37% (17 صفحة)
- **نسبة العمليات والمتابعات:** 8% (4 صفحات)
- **نسبة الأخرى:** 27% (13 صفحة)

---

**آخر تحديث:** 29 مارس 2026
**عدد الصفحات: 47 ✅**
