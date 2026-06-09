export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-foreground" dir="rtl">
      <h1 className="mb-2 text-2xl font-bold">سياسة الخصوصية</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        آخر تحديث: يونيو 2026
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">المقدمة</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          يُشغِّل مركز ساعدني لطب وجراحة العيون هذا التطبيق بهدف إدارة صفحات
          التواصل الاجتماعي الخاصة بالمركز ونشر المحتوى التسويقي المتعلق بخدماته
          الطبية.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">البيانات التي نجمعها</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>
            معرّف صفحة Facebook ورمز الوصول الخاص بها لأغراض النشر التلقائي.
          </li>
          <li>معلومات الحساب الإداري الداخلي (اسم المستخدم والدور الوظيفي).</li>
          <li>سجلات النشاط الداخلية لمتابعة عمليات النشر.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">كيف نستخدم البيانات</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>
            نشر المحتوى الطبي التسويقي على صفحة Facebook الخاصة بالمركز فقط.
          </li>
          <li>لا نشارك أي بيانات مع أطراف خارجية.</li>
          <li>لا نستخدم البيانات لأغراض إعلانية أو تجارية خارج نطاق المركز.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">تخزين البيانات وأمانها</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          تُخزَّن جميع البيانات على خوادم المركز الداخلية. رموز الوصول إلى
          Facebook مُشفَّرة ولا تظهر أبدًا للمستخدمين النهائيين.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">صلاحيات Facebook</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          يطلب هذا التطبيق الصلاحيات التالية:
        </p>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>
            <strong>pages_show_list</strong> — لعرض قائمة الصفحات المُدارة.
          </li>
          <li>
            <strong>pages_manage_posts</strong> — لنشر المحتوى على صفحة المركز.
          </li>
          <li>
            <strong>pages_read_engagement</strong> — لقراءة إحصائيات التفاعل.
          </li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">حقوق المستخدم</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          يمكن لمدير النظام في أي وقت فصل التطبيق عن صفحة Facebook من خلال
          إعدادات التسويق داخل النظام، أو من خلال إعدادات Facebook مباشرةً.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">التواصل معنا</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          لأي استفسار بشأن سياسة الخصوصية، يرجى التواصل عبر البريد الإلكتروني أو
          زيارة مركز ساعدني لطب وجراحة العيون.
        </p>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} مركز ساعدني لطب وجراحة العيون — جميع الحقوق
        محفوظة.
      </p>
    </div>
  );
}
