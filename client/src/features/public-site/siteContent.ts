// Public website content. Every value here comes from the existing app
// (patient portal, guest booking, brand constants) or the owner's brief.
// Sections with no entries are hidden, so leave a list empty rather than guess.

export type SiteLang = "ar" | "en";
export type Localized = Record<SiteLang, string>;

export const CONTACT = {
  landline: "0403320833",
  mobiles: ["01272303303", "01027357352"],
  whatsapp: "01285800309",
  whatsappUrl: "https://wa.me/201285800309",
  facebookUrl: "https://www.facebook.com/selrs.tanta",
} as const;

export type Branch = {
  id: "exams" | "operations";
  name: Localized;
  /** Arabic address, shown as written in both languages. */
  addressAr: string;
  phone: string;
  mobiles?: string[];
  mapQuery: string;
  hours: Array<{ label: Localized; value: Localized }>;
};

// Both branches are in Tanta: exams and tests in one building, surgery in the other.
export const BRANCHES: Branch[] = [
  {
    id: "exams",
    name: { ar: "فرع الكشف والفحوصات", en: "Exams and tests branch" },
    addressAr: "3 ش بطرس، أعلى توكيل LG، الدور الأول",
    phone: "0403320833",
    mobiles: ["01272303303", "01027357352"],
    mapQuery: "3 شارع بطرس أعلى توكيل LG طنطا",
    hours: [
      {
        label: { ar: "كشف الأخصائي", en: "Specialist exams" },
        value: {
          ar: "يومياً من 12 ظهراً حتى 6 مساءً، عدا الجمعة",
          en: "Daily 12 PM to 6 PM, closed Fridays",
        },
      },
      {
        label: { ar: "كشف أ.د محمد السعدني غرابه", en: "Prof. Mohamed El-Saadany Ghoraba" },
        value: {
          ar: "الأحد والثلاثاء والأربعاء من 12:30 حتى 3 عصراً",
          en: "Sunday, Tuesday and Wednesday, 12:30 PM to 3 PM",
        },
      },
    ],
  },
  {
    id: "operations",
    name: { ar: "فرع العمليات", en: "Surgery branch" },
    addressAr: "علي بك الكبير من الحلو، مستشفى الشروق، الدور الثاني، مركز عيون الشروق",
    phone: "04033288778",
    mapQuery: "مستشفى الشروق علي بك الكبير طنطا",
    hours: [
      {
        label: { ar: "المواعيد", en: "Hours" },
        value: {
          ar: "من الأحد حتى الأربعاء، من 9 صباحاً حتى 3 عصراً",
          en: "Sunday to Wednesday, 9 AM to 3 PM",
        },
      },
    ],
  },
];

export type Service = {
  id: string;
  title: Localized;
  body: Localized;
  /** Shown wide at the top of the services list. */
  featured?: boolean;
  /** Bookable online after signing in at /my/login. */
  bookable?: boolean;
};

export const SERVICES: Service[] = [
  {
    id: "lasik",
    featured: true,
    title: { ar: "الليزك وتصحيح الإبصار", en: "LASIK and refractive surgery" },
    body: {
      ar: "تصحيح قصر النظر وطول النظر والاستجماتيزم بالليزك بمشرط موريا SBK، بعد فحص القرنية بالبنتاكام وكشف الاستشاري لتحديد مدى ملاءمة العين للعملية.",
      en: "Laser correction of short sight, long sight and astigmatism using a Moria SBK microkeratome, after a Pentacam corneal scan and a consultant exam to confirm the eye is suitable.",
    },
  },
  {
    id: "prk",
    title: { ar: "الليزك السطحي PRK", en: "PRK surface laser" },
    body: {
      ar: "تصحيح الإبصار بالليزك على سطح القرنية، وهو خيار لبعض الحالات التي لا يناسبها الليزك التقليدي.",
      en: "Laser vision correction on the corneal surface, an option for some eyes that are not suited to standard LASIK.",
    },
  },
  {
    id: "trans-prk",
    title: { ar: "الليزك السطحي بدون لمس Trans-PRK", en: "No-touch Trans-PRK" },
    body: {
      ar: "نوع من الليزك السطحي يزيل فيه الليزر الطبقة السطحية للقرنية ويصحّح النظر في نفس الخطوة، من غير ما تُلمس العين بأي أداة.",
      en: "A surface laser treatment where the laser removes the outer corneal layer and corrects vision in the same step, with no instrument touching the eye.",
    },
  },
  {
    id: "cataract",
    title: { ar: "المياه البيضاء", en: "Cataract surgery" },
    body: {
      ar: "إزالة العدسة المعتمة وزراعة عدسة جديدة مكانها، ويحدد الطبيب نوع العدسة بعد الفحوصات.",
      en: "Removal of the clouded lens and a new lens implanted in its place. The doctor picks the lens after your tests.",
    },
  },
  {
    id: "lens-implants",
    title: { ar: "زراعة العدسات ICL وIOL", en: "ICL and IOL lens implants" },
    body: {
      ar: "لتصحيح النظر عند من لا يناسبهم الليزك: ICL تُزرع أمام عدسة العين الطبيعية، وIOL تُزرع مكانها.",
      en: "Vision correction for eyes not suited to LASIK: an ICL sits in front of the natural lens, an IOL replaces it.",
    },
  },
  {
    id: "femto-lasik",
    title: { ar: "الفيمتوليزك FemtoLASIK", en: "FemtoLASIK" },
    body: {
      ar: "ليزك تُعمل فيه الطبقة الرقيقة بليزر الفيمتو بدل المشرط، ثم يُصحَّح انحناء القرنية بالإكسيمر ليزر.",
      en: "LASIK where the femtosecond laser creates the flap instead of a blade, then the excimer laser reshapes the cornea.",
    },
  },
  {
    id: "smile",
    title: { ar: "الفيمتوسمايل SMILE", en: "SMILE" },
    body: {
      ar: "ليزر الفيمتو يشكّل عدسة رقيقة داخل القرنية تُخرج من فتحة صغيرة، من غير رفع طبقة.",
      en: "The femtosecond laser shapes a thin lens inside the cornea, removed through a small opening with no flap.",
    },
  },
  {
    id: "glaucoma-surgery",
    title: { ar: "عمليات المياه الزرقاء", en: "Glaucoma surgery" },
    body: {
      ar: "لعلاج ارتفاع ضغط العين والحفاظ على العصب البصري. يحدد الطبيب الإجراء المناسب بعد الفحوصات.",
      en: "Treats raised eye pressure to protect the optic nerve. The doctor picks the procedure after your tests.",
    },
  },
  {
    id: "fundus-exam",
    bookable: true,
    title: { ar: "فحص قاع العين", en: "Fundus exam" },
    body: {
      ar: "فحص الشبكية والعصب البصري، ومهم لمرضى السكر والضغط.",
      en: "Examination of the retina and optic nerve, important for people with diabetes or high blood pressure.",
    },
  },
  {
    id: "eye-pressure",
    bookable: true,
    title: { ar: "قياس ضغط العين", en: "Eye pressure test" },
    body: {
      ar: "للاكتشاف المبكر للمياه الزرقاء ومتابعتها.",
      en: "Early detection and follow-up of glaucoma.",
    },
  },
  {
    id: "pediatric-exam",
    bookable: true,
    title: { ar: "كشف الأطفال", en: "Children's eye exam" },
    body: {
      ar: "كشف نظر الأطفال لاكتشاف مشاكل النظر مبكراً.",
      en: "Eye exams for children to catch vision problems early.",
    },
  },
  {
    id: "glasses-contacts",
    bookable: true,
    title: { ar: "مقاس النظارة والعدسات اللاصقة", en: "Glasses and contact lens fitting" },
    body: {
      ar: "قياس النظر وتحديد مقاس النظارة أو العدسات اللاصقة المناسبة.",
      en: "Vision testing and the right prescription for glasses or contact lenses.",
    },
  },
  {
    id: "pentacam",
    bookable: true,
    title: { ar: "أشعة القرنية بالبنتاكام", en: "Pentacam corneal imaging" },
    body: {
      ar: "تصوير القرنية وقياس سمكها وانحنائها، ويمكن حجزه منفرداً أو بتحويل من طبيبك.",
      en: "Imaging of corneal thickness and curvature, bookable on its own or on referral from your doctor.",
    },
  },
  {
    id: "exams",
    bookable: true,
    title: { ar: "كشف الاستشاري والأخصائي", en: "Consultant and specialist exams" },
    body: {
      ar: "كشف عيون شامل، وكشف أخصائي يشمل مقاس النظارة.",
      en: "A full eye examination, and a specialist visit that includes glasses measurement.",
    },
  },
  {
    id: "followup",
    bookable: true,
    title: { ar: "المتابعة", en: "Follow-up visits" },
    body: {
      ar: "مراجعة ما بعد الكشف أو العملية في موعد يحدده الطبيب.",
      en: "Review after an exam or procedure, on the date your doctor sets.",
    },
  },
];

export type Doctor = {
  id: string;
  name: Localized;
  role: Localized;
  /** Path under client/public. Without it an initials mark is shown. */
  photoUrl?: string;
  schedule: Array<{ branchId: Branch["id"]; days: Localized }>;
};

export const DOCTORS: Doctor[] = [
  {
    id: "saadany",
    name: { ar: "أ.د محمد السعدني غرابه", en: "Prof. Mohamed El-Saadany Ghoraba" },
    role: {
      ar: "أستاذ طب وجراحة العيون، كلية الطب جامعة طنطا. استشاري المياه البيضاء وزراعة العدسات. استشاري تصحيح الإبصار بالليزر والفيمتو",
      en: "Professor of Ophthalmology, Faculty of Medicine, Tanta University. Consultant in cataract and lens implantation. Consultant in laser and femtosecond vision correction",
    },
    photoUrl: "/marketing/site/dr-mohamed-elsaadany.webp",
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "الأحد والثلاثاء والأربعاء من 12:30 حتى 3 عصراً",
          en: "Sunday, Tuesday and Wednesday, 12:30 PM to 3 PM",
        },
      },
    ],
  },
  {
    id: "mohamed-abdelrahim",
    name: { ar: "د. محمد عبدالرحيم", en: "Dr. Mohamed Abdelrahim" },
    role: { ar: "استشاري", en: "Consultant" },
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "الإثنين من 11 صباحاً حتى 1 ظهراً",
          en: "Monday, 11 AM to 1 PM",
        },
      },
    ],
  },
  {
    id: "karim-abdelrahim",
    name: { ar: "د. كريم عبدالرحيم", en: "Dr. Karim Abdelrahim" },
    role: { ar: "استشاري", en: "Consultant" },
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "الخميس من 12 ظهراً حتى 3 عصراً",
          en: "Thursday, 12 PM to 3 PM",
        },
      },
    ],
  },
  {
    id: "ahmed-eissa",
    name: { ar: "د. أحمد عيسى الجنايني", en: "Dr. Ahmed Eissa El-Ganayni" },
    role: {
      ar: "استشاري طب وجراحة العيون، استشاري إزالة المياه البيضاء وتصحيح الإبصار بالليزر",
      en: "Consultant ophthalmologist, consultant in cataract removal and laser vision correction",
    },
    photoUrl: "/marketing/site/dr-eissa.webp",
    schedule: [],
  },
  {
    id: "saeed-magdy",
    name: { ar: "د. سعيد مجدي", en: "Dr. Saeed Magdy" },
    role: {
      ar: "أخصائي طب وجراحة العيون، إزالة المياه البيضاء بالفاكو وتصحيح الإبصار بالليزر",
      en: "Ophthalmology specialist, phaco cataract removal and laser vision correction",
    },
    photoUrl: "/marketing/site/dr-magdy.webp",
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "الأحد والثلاثاء من 12 ظهراً حتى 6 مساءً",
          en: "Sunday and Tuesday, 12 PM to 6 PM",
        },
      },
    ],
  },
  {
    id: "sama-mostafa",
    name: { ar: "د. سما مصطفى", en: "Dr. Sama Mostafa" },
    role: { ar: "أخصائي", en: "Specialist" },
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "السبت والأربعاء من 12 ظهراً حتى 6 مساءً، والإثنين من 1 ظهراً حتى 6 مساءً",
          en: "Saturday and Wednesday 12 PM to 6 PM, Monday 1 PM to 6 PM",
        },
      },
    ],
  },
  {
    id: "heba-taha",
    name: { ar: "د. هبه طه", en: "Dr. Heba Taha" },
    role: { ar: "أخصائي", en: "Specialist" },
    schedule: [
      {
        branchId: "exams",
        days: {
          ar: "الخميس من 3 عصراً حتى 6 مساءً",
          en: "Thursday, 3 PM to 6 PM",
        },
      },
    ],
  },
];

export const JOURNEY: Array<{ title: Localized; body: Localized }> = [
  {
    title: { ar: "احجز موعدك", en: "Book a visit" },
    body: {
      ar: "اختر الفرع والخدمة واليوم من الموقع، ويتصل بك الاستقبال لتأكيد الوقت.",
      en: "Pick the branch, service and day online. Reception calls you to confirm the time.",
    },
  },
  {
    title: { ar: "الحضور للمركز", en: "Arrive at the center" },
    body: {
      ar: "يُفتح ملفك الطبي عند الاستقبال إن كانت هذه زيارتك الأولى.",
      en: "Reception opens your medical file if this is your first visit.",
    },
  },
  {
    title: { ar: "الفحوصات المبدئية", en: "Preliminary tests" },
    body: {
      ar: "قياس النظر بجهاز الأوتوريف، وأشعة البنتاكام عند الحاجة.",
      en: "An autorefractor vision measurement, and a Pentacam scan when needed.",
    },
  },
  {
    title: { ar: "كشف الطبيب", en: "See the doctor" },
    body: {
      ar: "يراجع الطبيب نتائج الفحوصات ويفحص العين.",
      en: "The doctor reviews your test results and examines the eye.",
    },
  },
  {
    title: { ar: "الخطة العلاجية", en: "Your treatment plan" },
    body: {
      ar: "تستلم الروشتة أو موعد العملية، وتجدها لاحقاً بعد دخولك على الموقع.",
      en: "You leave with a prescription or a procedure date, also available later when you sign in.",
    },
  },
];
