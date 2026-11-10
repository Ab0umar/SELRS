import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { setupLanding } from "./landingBehavior";
import "./landing.css";

// Public landing page shown at "/" to visitors who are not signed in.
// Content is static; booking and sign-in links point at the existing pages.
export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "مركز عيون الشروق لليزك وتصحيح الإبصار";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    return setupLanding(rootRef.current, navigate);
  }, [navigate]);

  return (
    <div ref={rootRef} className="selrs-landing" dir="rtl" lang="ar">
      <nav className="signin-bar" aria-label="تسجيل الدخول"><div className="wrap">
        <a href="/my/login">دخول المرضى</a>
        <a href="/doctor-portal/login">دخول الأطباء</a>
        <a href="/login">دخول الموظفين</a>
      </div></nav>
      <header className="site-head"><div className="wrap">
        <a className="brand" href="#"><img src="/marketing/site/shorouk-eyes-logo.webp" alt="" /><span><b>مركز عيون الشروق</b><small>لليزك والمياه البيضاء</small></span></a>
        <nav className="site-nav" aria-label="التنقل الرئيسي"><a href="#tab-services">الخدمات</a><a href="#tab-lasik">الليزك</a><a href="#tab-cataract">المياه البيضاء</a><a href="#tab-device">جهاز الليزر</a><a href="#tab-doctor">الأطباء</a><a href="#tab-branches">الفروع</a><a href="#tab-tips">نصائح</a><a href="#a-contact">تواصل معنا</a></nav>
        <div className="head-actions"><button type="button" className="btn" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)", padding: "0 12px" }} id="themeBtn" aria-pressed="false">الوضع الداكن</button><a className="btn btn-accent" href="/my/login">احجز موعداً</a></div>
      </div></header>

      <div className="a-hero">
        <div className="hero-top">
          <div className="hero-visual" aria-hidden="true">
            <img className="hv-eye" src="/marketing/site/eye-closeup.webp" alt="" width="1600" height="570" />
            <img className="hv-laser" src="/marketing/site/excimer-laser-cutout.webp" alt="" width="950" height="768" />
            <img className="hv-penta" src="/marketing/site/pentacam.webp" alt="" width="307" height="550" />
            <span className="hv-tag hv-tag-laser"><bdi dir="ltr">WaveLight® EX500</bdi></span>
            <span className="hv-tag hv-tag-penta"><bdi dir="ltr">Pentacam®</bdi></span>
          </div>
        <div className="wrap">
          <div>
            <h1>رؤية أوضح..<span className="h1-2">لحياة أفضل<svg className="swoosh" viewBox="0 0 240 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 18 C 70 4, 170 2, 236 10"/></svg></span></h1>
            <p className="values"><span>خبرة</span><span>تقنية متقدمة</span><span>رعاية متكاملة</span></p>
            <div className="ctas"><a className="btn btn-accent" href="/my/login">احجز موعداً</a><a className="btn btn-outline" href="#a-services">اطّلع على الخدمات</a></div>
          </div>
        </div>
        </div>
        <nav className="svc-strip wrap" aria-label="خدمات المركز">
          <a href="#a-services"><span className="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 24c6-9 12-13 20-13s14 4 20 13c-6 9-12 13-20 13S10 33 4 24z"/><circle cx="24" cy="24" r="7"/><circle cx="24" cy="24" r="2.5" className="f"/></svg></span>علاج أمراض القرنية وسطح العين</a>
          <a href="#a-cataract"><span className="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M14 12c-4 4-4 20 0 24M14 12c5 3 5 21 0 24"/></svg></span>جراحات المياه البيضاء</a>
          <a href="#a-lenses"><span className="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="26" rx="18" ry="7"/><path d="M6 26c4-6 32-6 36 0"/></svg></span><span>زراعة العدسات<small className="strip-sub" dir="ltr">ICL , IOL</small></span></a>
          <a href="#edu-types"><span className="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 26c6-9 12-13 20-13s14 4 20 13c-6 9-12 13-20 13S10 35 4 26z"/><circle cx="24" cy="26" r="7"/><circle cx="24" cy="26" r="2.5" className="f"/><path d="M14 10l2 4M24 7v5M34 10l-2 4"/></svg></span>الليزك وتصحيح الإبصار</a>
          <a href="#edu-exams"><span className="ic"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="14" cy="27" r="8"/><circle cx="34" cy="27" r="8"/><path d="M22 27h4M6 27l-2-6M42 27l2-6"/></svg></span>فحص شامل ودقيق</a>
        </nav>
        <svg className="hero-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path className="o" d="M0 42 C 360 92, 900 0, 1440 30 L1440 44 C 900 14, 360 104, 0 58Z"/><path className="n" d="M0 58 C 360 104, 900 14, 1440 44 L1440 90 L0 90Z"/></svg>
      </div>

      <div className="tabs" id="a-tabs">
        <div className="tabbar"><div className="wrap" role="tablist" aria-label="أقسام الموقع">
          <button type="button" role="tab" id="t-services" aria-controls="tab-services" aria-selected="true" tabIndex={0}>الخدمات</button>
          <button type="button" role="tab" id="t-device" aria-controls="tab-device" aria-selected="false" tabIndex={-1}>جهاز الليزر</button>
          <button type="button" role="tab" id="t-doctor" aria-controls="tab-doctor" aria-selected="false" tabIndex={-1}>الأطباء</button>
          <button type="button" role="tab" id="t-branches" aria-controls="tab-branches" aria-selected="false" tabIndex={-1}>الفروع والمواعيد</button>
          <button type="button" role="tab" id="t-tips" aria-controls="tab-tips" aria-selected="false" tabIndex={-1}>نصائح</button>
        </div></div>
      <div className="tab-panel" id="tab-services" role="tabpanel" aria-labelledby="t-services" tabIndex={-1}>
      <div className="svc-tabs"><div className="wrap" role="tablist" aria-label="أقسام الخدمات">
          <button type="button" role="tab" id="t-overview" aria-controls="tab-overview" aria-selected="true" tabIndex={0}>كل الخدمات</button>
          <button type="button" role="tab" id="t-lasik" aria-controls="tab-lasik" aria-selected="false" tabIndex={-1}>الليزك وتصحيح الإبصار</button>
          <button type="button" role="tab" id="t-cataract" aria-controls="tab-cataract" aria-selected="false" tabIndex={-1}>المياه البيضاء</button>
          <button type="button" role="tab" id="t-lenses" aria-controls="tab-lenses" aria-selected="false" tabIndex={-1}>زراعة العدسات</button>
          <button type="button" role="tab" id="t-cornea" aria-controls="tab-cornea" aria-selected="false" tabIndex={-1}>تثبيت القرنية</button>
          <button type="button" role="tab" id="t-pentacam" aria-controls="tab-pentacam" aria-selected="false" tabIndex={-1}>البنتاكام <bdi dir="ltr">Pentacam</bdi></button>
          <button type="button" role="tab" id="t-glaucoma" aria-controls="tab-glaucoma" aria-selected="false" tabIndex={-1}>المياه الزرقاء</button>
          <button type="button" role="tab" id="t-kids" aria-controls="tab-kids" aria-selected="false" tabIndex={-1}>الحول والأطفال</button>
          <button type="button" role="tab" id="t-exams" aria-controls="tab-exams" aria-selected="false" tabIndex={-1}>الكشف والفحوصات</button>
      </div></div>
      <div className="svc-panel" id="tab-overview" role="tabpanel" aria-labelledby="t-overview" tabIndex={-1}>
      <section className="a-services" id="a-services"><div className="wrap">
        <h2 className="eyebrow-title">الخدمات</h2>
        <div className="svc-grid">
          <a href="#tab-lasik"><b>الليزك وتصحيح الإبصار</b><span>LASIK وPRK وTrans-PRK والفيمتو</span></a>
          <a href="#a-cataract"><b>المياه البيضاء</b><span>إزالة العدسة المعتمة وزراعة عدسة جديدة</span></a>
          <a href="#a-lenses"><b>زراعة العدسات ICL وIOL</b><span>لتصحيح النظر عند من لا يناسبهم الليزك</span></a>
          <a href="#svc-cxl"><b>تثبيت القرنية</b><span>لإيقاف تقدّم القرنية المخروطية</span></a>
          <a href="#svc-pentacam"><b>أشعة القرنية بالبنتاكام</b><span>تصوير القرنية وقياس سمكها وانحنائها</span></a>
          <a href="#svc-glaucoma"><b>المياه الزرقاء وقياس ضغط العين</b><span>الاكتشاف المبكر والعمليات</span></a>
          <a href="#svc-kids"><b>كشف الأطفال</b><span>لاكتشاف مشاكل النظر مبكراً</span></a>
          <a href="#svc-squint"><b>جراحة الحول</b><span>لضبط اتجاه العينين</span></a>
          <a href="#svc-exam"><b>كشف الاستشاري</b><span>تشخيص الحالة وتحديد العلاج أو العملية</span></a>
          <a href="#svc-specialist"><b>كشف الأخصائي</b><span>كشف عيون يشمل مقاس النظارة</span></a>
          <a href="#svc-fundus"><b>فحص قاع العين</b><span>فحص الشبكية والعصب البصري</span></a>
          <a href="#svc-glasses"><b>مقاس النظارة والعدسات اللاصقة</b><span>قياس النظر وتحديد المقاس</span></a>
          <a href="#svc-followup"><b>المتابعة</b><span>بعد الكشف أو العملية</span></a>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-lasik" role="tabpanel" aria-labelledby="t-lasik" tabIndex={-1} hidden>
      <section className="a-services lasik-intro"><div className="wrap">
        <div className="featured">
          <div className="intro"><h3>الليزك وتصحيح الإبصار</h3><p>تصحيح قصر النظر وطول النظر والاستجماتيزم بالليزك، بعد فحص القرنية بالبنتاكام وكشف الاستشاري لتحديد مدى ملاءمة العين للعملية.</p><a className="btn btn-accent" href="/my/login">احجز الآن</a></div>
          <div className="hub">
            <div className="hub-core" aria-hidden="true">مميزات عمليات<b>تصحيح الإبصار</b></div>
            <ul className="hub-list" aria-label="مميزات عمليات تصحيح الإبصار">
              <li>تصحيح قصر وطول النظر والاستجماتيزم</li>
              <li>التخلص من النظارات</li>
              <li>التخلص من مشاكل العدسات اللاصقة</li>
              <li>التخلص من الرؤية الضبابية</li>
              <li>تستغرق دقائق معدودة</li>
            </ul>
          </div>
        </div>
      </div></section>
      <img className="photo-band" src="/marketing/site/eye-closeup.webp" alt="صورة مقرّبة لعين بقزحية زرقاء" width="1600" height="570" loading="lazy" />
      <section id="edu-types"><div className="wrap proc-split">
        <div className="proc-side">
          <h2 className="eyebrow-title">أنواع عمليات تصحيح الإبصار</h2>
          <div className="proc-tabs" role="tablist" aria-orientation="vertical" aria-label="اختر العملية لترى خطواتها">
            <button type="button" role="tab" className="pbar" id="p-prk" aria-controls="proc-prk" aria-selected="true" tabIndex={0}><span className="head"><span className="num">1</span><span className="t">الليزر السطحي <span className="en">PRK</span></span></span><span className="d">مناسب لحالات قصر النظر والاستجماتيزم، ويُعتبر من أكثر أنواع التصحيح أماناً.</span></button>
            <button type="button" role="tab" className="pbar" id="p-trans-prk" aria-controls="proc-trans-prk" aria-selected="false" tabIndex={-1}><span className="head"><span className="num">2</span><span className="t">الليزك السطحي بدون لمس <span className="en">Trans-PRK</span></span></span><span className="d">نوع من الليزك السطحي يزيل فيه الليزر الطبقة السطحية للقرنية ويصحّح النظر في نفس الخطوة، من غير ما تُلمس العين بأي أداة.</span></button>
            <button type="button" role="tab" className="pbar" id="p-lasik" aria-controls="proc-lasik" aria-selected="false" tabIndex={-1}><span className="head"><span className="num">3</span><span className="t">الليزك (تحت السطحي) <span className="en">LASIK</span></span></span><span className="d">تُرفع طبقة رقيقة من سطح القرنية بمشرط موريا <bdi dir="ltr">Moria SBK</bdi>، ثم يُصحَّح انحناء القرنية بالليزر وتُعاد الطبقة لمكانها.</span></button>
            <button type="button" role="tab" className="pbar" id="p-femto-lasik" aria-controls="proc-femto-lasik" aria-selected="false" tabIndex={-1}><span className="head"><span className="num">4</span><span className="t">الفيمتوليزك <span className="en">FemtoLASIK</span></span></span><span className="d">مثل الليزك، لكن الطبقة الرقيقة تُعمل بليزر الفيمتو بدل المشرط، ثم يُصحَّح انحناء القرنية بالإكسيمر ليزر.</span></button>
            <button type="button" role="tab" className="pbar" id="p-smile" aria-controls="proc-smile" aria-selected="false" tabIndex={-1}><span className="head"><span className="num">5</span><span className="t">الفيمتوسمايل <span className="en">SMILE</span></span></span><span className="d">ليزر الفيمتو يشكّل عدسة رقيقة داخل القرنية تُخرج من فتحة صغيرة، من غير رفع طبقة.</span></button>
          </div>
          <ul className="note-line">
            <li>الفحوصات هي التي تحدد الطبيب ونوع العملية المناسبين لحالتك.</li>
            <li>تُجرى العملية خلال أسبوع من الفحوصات.</li>
          </ul>
        </div>
        <div className="proc-main" id="edu-steps">
          <h2 className="eyebrow-title">كيف تتم العملية</h2>
          <div className="proc-panel" id="proc-prk" role="tabpanel" aria-labelledby="p-prk">
            <h3 className="proc-name">الليزر السطحي <span className="en">PRK</span></h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="epi" d="M40 64 Q80 46 120 64"/><path className="tool" d="M132 26 L108 54"/></svg><b>2</b><span>إزالة الطبقة السطحية للقرنية</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="beam" x="70" y="0" width="20" height="64" rx="3"/></svg><b>3</b><span>تصحيح انحناء القرنية بالإكسيمر ليزر</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="clens" d="M30 72 Q80 42 130 72"/></svg><b>4</b><span>عدسة لاصقة علاجية لحين التئام السطح</span></li>
          </ol>
          </div>
          <div className="proc-panel" id="proc-trans-prk" role="tabpanel" aria-labelledby="p-trans-prk" hidden>
            <h3 className="proc-name">الليزك السطحي بدون لمس <span className="en">Trans-PRK</span></h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="beam" x="70" y="0" width="20" height="64" rx="3"/><path className="epi" d="M40 64 Q80 46 120 64"/></svg><b>2</b><span>الليزر يزيل الطبقة السطحية ويصحح انحناء القرنية في خطوة واحدة، من غير أي أداة تلمس العين</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="clens" d="M30 72 Q80 42 130 72"/></svg><b>3</b><span>عدسة لاصقة علاجية لحين التئام السطح</span></li>
          </ol>
          </div>
          <div className="proc-panel" id="proc-lasik" role="tabpanel" aria-labelledby="p-lasik" hidden>
            <h3 className="proc-name">الليزك (تحت السطحي) <span className="en">LASIK</span></h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="flap" d="M46 60 Q30 44 22 30 Q44 40 60 56Z"/></svg><b>2</b><span>رفع طبقة رقيقة من سطح القرنية بمشرط <bdi dir="ltr">Moria SBK</bdi></span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="beam" x="70" y="0" width="20" height="64" rx="3"/><path className="flap" d="M46 60 Q30 44 22 30 Q44 40 60 56Z"/></svg><b>3</b><span>تصحيح انحناء القرنية بالليزر</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/></svg><b>4</b><span>إعادة الطبقة لمكانها</span></li>
          </ol>
          </div>
          <div className="proc-panel" id="proc-femto-lasik" role="tabpanel" aria-labelledby="p-femto-lasik" hidden>
            <h3 className="proc-name">الفيمتوليزك <span className="en">FemtoLASIK</span></h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="fbeam" x="76" y="0" width="8" height="62" rx="2"/><path className="fdots" d="M44 76 Q80 58 116 76"/></svg><b>2</b><span>تكوين طبقة رقيقة في القرنية بليزر الفيمتو بدل المشرط</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="beam" x="70" y="0" width="20" height="64" rx="3"/><path className="flap" d="M46 60 Q30 44 22 30 Q44 40 60 56Z"/></svg><b>3</b><span>رفع الطبقة وتصحيح انحناء القرنية بالإكسيمر ليزر</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/></svg><b>4</b><span>إعادة الطبقة لمكانها</span></li>
          </ol>
          </div>
          <div className="proc-panel" id="proc-smile" role="tabpanel" aria-labelledby="p-smile" hidden>
            <h3 className="proc-name">الفيمتوسمايل <span className="en">SMILE</span></h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><rect className="fbeam" x="76" y="0" width="8" height="62" rx="2"/><path className="fdots" d="M56 74 Q80 62 104 74 Q80 82 56 74Z"/></svg><b>2</b><span>ليزر الفيمتو يشكّل عدسة رقيقة داخل القرنية</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="lent" d="M14 40 Q32 30 50 40 Q32 48 14 40Z"/><path className="arrow" d="M62 70 L48 50"/><path className="cut" d="M56 70 L64 66"/></svg><b>3</b><span>إخراج العدسة من فتحة صغيرة، من غير رفع طبقة</span></li>
          </ol>
          </div>
        </div>
      </div></section>

      <section id="edu-exams"><div className="wrap">
        <h2 className="eyebrow-title">خطوات فحوصات تصحيح الإبصار</h2>
        <ol className="pbars" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))" }}>
          <li className="pbar"><div className="head"><span className="num">1</span><h3>مقاس النظر بالكمبيوتر <span className="en">Autoref</span></h3></div></li>
          <li className="pbar"><div className="head"><span className="num">2</span><h3>قياس ضغط العين <span className="en">Airpuff</span></h3></div></li>
          <li className="pbar"><div className="head"><span className="num">3</span><h3>أشعة على القرنية <span className="en">Pentacam</span></h3></div></li>
          <li className="pbar"><div className="head"><span className="num">4</span><h3>قوة النظر ومدى تحسنه بالنظارة <span className="en">Trial</span></h3></div></li>
          <li className="pbar"><div className="head"><span className="num">5</span><h3>مقاس النظر بعد التوسيع <span className="en">Post-cycloplegic</span></h3></div></li>
          <li className="pbar"><div className="head"><span className="num">6</span><h3>فحص قاع العين <span className="en">Fundus</span></h3></div></li>
        </ol>
      </div></section>

      <section id="edu-errors"><div className="wrap">
        <h2 className="eyebrow-title">أنواع ضعف النظر</h2>
        <div className="errors">
          <figure><img src="/marketing/site/error-myopia.webp" alt="رسم لعين بقصر نظر: الصورة تتكوّن أمام الشبكية، وتصحّحها عدسة مقعرة" width="600" height="726" loading="lazy" /><figcaption><b>قصر النظر <span className="ltr">Myopia</span></b><p>صعوبة في رؤية الأجسام البعيدة وتفاصيلها، مع رؤية الأجسام القريبة بوضوح.</p></figcaption></figure>
          <figure><img src="/marketing/site/error-hyperopia.webp" alt="رسم لعين بطول نظر: الصورة تتكوّن خلف الشبكية، وتصحّحها عدسة محدبة" width="600" height="726" loading="lazy" /><figcaption><b>طول النظر <span className="ltr">Hyperopia</span></b><p>صعوبة في رؤية الأجسام القريبة بوضوح، مع رؤية الأجسام البعيدة بشكل أوضح قليلاً.</p></figcaption></figure>
          <figure><img src="/marketing/site/error-astigmatism.webp" alt="رسم لعين باستجماتيزم مع عدسة التصحيح" width="600" height="726" loading="lazy" /><figcaption><b>الاستجماتيزم <span className="ltr">Astigmatism</span></b><p>ينتج عن عدم استدارة القرنية بشكل كامل، فتظهر الصور القريبة أو البعيدة مشوشة.</p></figcaption></figure>
        </div>
      </div></section>

      <section id="edu-fit"><div className="wrap">
        <h2 className="eyebrow-title">هل العملية مناسبة لك؟</h2>
        <details className="acc" open><summary>موانع عملية تصحيح الإبصار</summary><div className="body edu-split" style={{ alignItems: "start" }}>
          <div><img className="kerato" src="/marketing/site/cornea-normal-vs-keratoconus.webp" alt="رسم يقارن بين قرنية مخروطية وقرنية طبيعية" width="1100" height="574" loading="lazy" /><div className="kerato-labels"><span>قرنية طبيعية</span><span>قرنية مخروطية</span></div></div>
          <ol className="pbars" style={{ marginTop: "0" }}>
            <li className="pbar"><div className="head"><span className="num">1</span><h3>السن أقل من 18 سنة، إلا في حالة وجود ضعف شديد في عين واحدة</h3></div></li>
            <li className="pbar"><div className="head"><span className="num">2</span><h3>قرنية مخروطية، أو مياه بيضاء، أو سمك قليل للقرنية</h3></div></li>
            <li className="pbar"><div className="head"><span className="num">3</span><h3>فترة الحمل، وحتى 40 يوماً بعد الولادة</h3></div></li>
            <li className="pbar"><div className="head"><span className="num">4</span><h3>قصر نظر أكثر من <bdi dir="ltr">−12</bdi></h3></div></li>
            <li className="pbar"><div className="head"><span className="num">5</span><h3>طول نظر أكثر من <bdi dir="ltr">+6</bdi></h3></div></li>
            <li className="pbar"><div className="head"><span className="num">6</span><h3>استجماتيزم أكثر من <bdi dir="ltr">±6</bdi></h3></div></li>
            <li className="pbar"><div className="head"><span className="num">7</span><h3>مرض السكر غير المنتظم</h3></div></li>
          </ol>
        </div></details>
      </div></section>

      <section id="edu-guide"><div className="wrap pair">
        <div className="guide">
          <h2 className="eyebrow-title">إرشادات قبل العملية</h2>
          <ul>
            <li>عدم استخدام العدسات اللاصقة لمدة لا تقل عن أسبوع.</li>
            <li>عدم وضع أي مستحضرات تجميل أو عطور يوم العملية.</li>
            <li>غسل الوجه جيداً يوم العملية.</li>
            <li>استخدام القطرات كما هو موضح بالروشتة قبل العملية.</li>
          </ul>
        </div>
        <div className="guide">
          <h2 className="eyebrow-title">إرشادات بعد العملية</h2>
          <ul>
            <li>عدم لمس العين أو حكّها نهائياً.</li>
            <li>ممنوع دخول المياه داخل العين لمدة أسبوع بعد العملية.</li>
            <li>عدم إجهاد العين فترة بعد العملية مباشرة.</li>
            <li>استخدام النظارة الشمسية وقت التعرض لأشعة الشمس (في الليزر السطحي PRK فقط).</li>
            <li>عدم نزول البحر أو حمام السباحة لفترة يحددها الطبيب.</li>
            <li>الابتعاد عن أماكن التراب والغبار.</li>
            <li>تفادي الحركات المفاجئة والدخان.</li>
            <li>الالتزام بأخذ العلاج كما وصفه الطبيب.</li>
            <li>الالتزام بمواعيد المتابعة بعد العملية.</li>
          </ul>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-cataract" role="tabpanel" aria-labelledby="t-cataract" tabIndex={-1} hidden>
      <section className="a-services" id="a-cataract-lens"><div className="wrap">
        <h2 className="eyebrow-title">المياه البيضاء</h2>
        <div className="cataract" id="a-cataract">
          <div className="compare">
            <figure>
              <svg viewBox="0 0 120 120" role="img" aria-label="عين بالمياه البيضاء: حدقة معتمة بيضاء">
                <defs><radialGradient id="irisA" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#3d8a93"/><stop offset="1" stopColor="#0f3138"/></radialGradient>
                <radialGradient id="cloud" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffffff"/><stop offset=".55" stopColor="#f1efe9"/><stop offset="1" stopColor="#9aa39f" stopOpacity="0"/></radialGradient></defs>
                <circle cx="60" cy="60" r="56" fill="#fff" stroke="#d5dfeb" strokeWidth="2"/><circle cx="60" cy="60" r="42" fill="url(#irisA)"/><circle cx="60" cy="60" r="26" fill="url(#cloud)"/><circle cx="74" cy="48" r="8" fill="#fff" opacity=".35"/>
              </svg>
              <figcaption>عين بالمياه البيضاء</figcaption>
            </figure>
            <figure>
              <svg viewBox="0 0 120 120" role="img" aria-label="عين طبيعية: حدقة سوداء صافية">
                <circle cx="60" cy="60" r="56" fill="#fff" stroke="#d5dfeb" strokeWidth="2"/><circle cx="60" cy="60" r="42" fill="url(#irisA)"/><circle cx="60" cy="60" r="18" fill="#05090a"/><circle cx="74" cy="48" r="8" fill="#fff" opacity=".35"/>
              </svg>
              <figcaption>عين طبيعية</figcaption>
            </figure>
          </div>
          <div>
            <h3>المياه البيضاء</h3>
            <p>في المياه البيضاء تفقد عدسة العين صفاءها وتصبح معتمة، فتظهر الحدقة بلون أبيض بدل الأسود.</p>
            <p>العلاج إزالة العدسة المعتمة وزراعة عدسة جديدة مكانها، ويحدد الطبيب نوع العدسة المناسب بعد الفحوصات.</p>
            <a href="/my/login">احجز كشف الاستشاري</a>
          </div>
        </div>

      </div></section>
      </div>
      <div className="svc-panel" id="tab-lenses" role="tabpanel" aria-labelledby="t-lenses" tabIndex={-1} hidden>
      <section className="a-services" id="a-lenses-sec"><div className="wrap">
        <h2 className="eyebrow-title">زراعة العدسات</h2>
        <div className="cataract lenses" id="a-lenses">
          <div className="lens-types">
            <div><b><bdi dir="ltr">ICL</bdi></b><p>عدسة تُزرع داخل العين أمام عدسة العين الطبيعية، من غير إزالتها.</p></div>
            <div><b><bdi dir="ltr">IOL</bdi></b><p>عدسة تُزرع مكان عدسة العين الطبيعية بعد إزالتها.</p></div>
          </div>
          <div>
            <h3>زراعة العدسات <bdi dir="ltr">ICL</bdi> و<bdi dir="ltr">IOL</bdi></h3>
            <p>لتصحيح النظر عند من لا يناسبهم الليزك. يحدد الطبيب نوع العملية والعدسة بعد الفحوصات.</p>
            <h4 className="lens-title">متى تحتاج لزراعة عدسة؟</h4>
            <ol className="lens-pills">
              <li><span>1</span>سُمك القرنية</li>
              <li><span>2</span>قصر النظر أكثر من <bdi dir="ltr">−8</bdi></li>
              <li><span>3</span>طول النظر أكثر من <bdi dir="ltr">+5</bdi></li>
            </ol>
            <a href="/my/login">احجز كشف الاستشاري</a>
          </div>
        </div>
        <div className="lens-diff" id="a-lens-diff">
          <h3>الفرق بين <bdi dir="ltr">ICL</bdi> و<bdi dir="ltr">IOL</bdi></h3>
          <div className="lens-cards">
            <article>
              <figure><svg viewBox="40 8 150 124" role="img" aria-label="رسم لعدسة ICL أمام عدسة العين الطبيعية"><circle className="ball" cx="122" cy="70" r="58"/><path className="cornea" d="M68 36 Q40 70 68 104"/><path className="iris" d="M78 40 V58 M78 82 V100"/><ellipse className="nat" cx="96" cy="70" rx="9" ry="22"/><path className="implant-line" d="M86 50 Q81 70 86 90"/></svg><figcaption><span className="key key-implant"></span>العدسة المزروعة <span className="key key-nat"></span>عدسة العين الطبيعية</figcaption></figure>
              <h4><bdi dir="ltr">ICL</bdi>: عدسة أمام عدسة العين</h4>
              <ul>
                <li>تُزرع خلف القزحية وأمام عدسة العين الطبيعية، وتبقى عدسة العين في مكانها.</li>
                <li>تصحح قصر النظر العالي والاستجماتيزم.</li>
                <li>تناسب من لا يناسبهم الليزك بسبب رقة القرنية أو ارتفاع درجة النظر.</li>
                <li>يمكن إزالتها أو تغييرها إذا احتاج الأمر.</li>
              </ul>
            </article>
            <article>
              <figure><svg viewBox="40 8 150 124" role="img" aria-label="رسم لعدسة IOL مكان عدسة العين الطبيعية بعد إزالتها"><circle className="ball" cx="122" cy="70" r="58"/><path className="cornea" d="M68 36 Q40 70 68 104"/><path className="iris" d="M78 40 V58 M78 82 V100"/><ellipse className="nat gone" cx="96" cy="70" rx="9" ry="22"/><ellipse className="implant" cx="96" cy="70" rx="6" ry="14"/><path className="implant-line thin" d="M96 56 Q106 48 103 40 M96 84 Q86 92 89 100"/></svg><figcaption><span className="key key-implant"></span>العدسة المزروعة <span className="key key-gone"></span>مكان العدسة الطبيعية بعد إزالتها</figcaption></figure>
              <h4><bdi dir="ltr">IOL</bdi>: عدسة مكان عدسة العين</h4>
              <ul>
                <li>تُزال عدسة العين الطبيعية، ثم تُزرع العدسة الجديدة مكانها.</li>
                <li>هي نفس خطوات عملية المياه البيضاء، وتُستخدم أيضاً لتصحيح طول النظر العالي.</li>
                <li>تناسب غالباً الأكبر سناً، أو من عندهم مياه بيضاء.</li>
                <li>عدسة دائمة داخل العين.</li>
              </ul>
            </article>
          </div>
          <div className="table-scroll">
            <table className="lens-table">
              <thead><tr><th scope="col"></th><th scope="col"><bdi dir="ltr">ICL</bdi></th><th scope="col"><bdi dir="ltr">IOL</bdi></th></tr></thead>
              <tbody>
                <tr><th scope="row">مكان العدسة</th><td>أمام عدسة العين الطبيعية</td><td>مكان عدسة العين الطبيعية</td></tr>
                <tr><th scope="row">عدسة العين الطبيعية</th><td>تبقى في مكانها</td><td>تُزال</td></tr>
                <tr><th scope="row">تُستخدم في</th><td>قصر النظر العالي والاستجماتيزم</td><td>المياه البيضاء وطول النظر العالي</td></tr>
                <tr><th scope="row">إزالة العدسة لاحقاً</th><td>ممكنة</td><td>عدسة دائمة</td></tr>
              </tbody>
            </table>
          </div>
          <p className="lens-foot">الفحوصات هي التي تحدد نوع العدسة المناسب لحالتك. <a href="/my/login">احجز كشف الاستشاري</a></p>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-cornea" role="tabpanel" aria-labelledby="t-cornea" tabIndex={-1} hidden>
      <section className="a-services"><div className="wrap">
        <h2 className="eyebrow-title">تثبيت القرنية</h2>
        <div className="cataract svc-detail" id="svc-cxl">
          <div className="art"><img src="/marketing/site/cornea-normal-vs-keratoconus.webp" alt="رسم يقارن بين قرنية مخروطية وقرنية طبيعية" width="1100" height="574" loading="lazy" /></div>
          <div>
            <h3>تثبيت القرنية</h3>
            <p>في القرنية المخروطية تَرِقّ القرنية وتبرز للأمام على شكل مخروط، فيضعف النظر ويزيد الاستجماتيزم. تثبيت القرنية يقوّي ألياف القرنية ليوقف تقدّم الحالة.</p>
            <ul>
              <li>يُجرى مع أ.د محمد السعدني غرابه.</li>
              <li>يحدد الطبيب مدى احتياجك له بعد أشعة البنتاكام.</li>
            </ul>
            <a href="/my/login">احجز كشف الاستشاري</a>
          </div>
        </div>
        <h3 className="sub-h">كيف يتم تثبيت القرنية</h3>
          <ol className="steps">
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="drop" d="M80 8c-6 9-8 12-8 16a8 8 0 0 0 16 0c0-4-2-7-8-16z"/></svg><b>1</b><span>تخدير العين بالقطرة</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="ribo" d="M64 14c-5 8-7 11-7 14a7 7 0 0 0 14 0c0-3-2-6-7-14z"/><path className="ribo" d="M96 22c-5 8-7 11-7 14a7 7 0 0 0 14 0c0-3-2-6-7-14z"/><path className="ribo-film" d="M38 72 Q80 50 122 72"/></svg><b>2</b><span>قطرات فيتامين <bdi dir="ltr">B2</bdi> (الريبوفلافين) على القرنية</span></li>
            <li><svg viewBox="0 0 160 100" aria-hidden="true"><path className="dome" d="M10 100 Q80 30 150 100Z"/><ellipse className="iris" cx="80" cy="66" rx="30" ry="8"/><ellipse cx="80" cy="66" rx="11" ry="3.5" fill="#123"/><path className="uv" d="M58 0 H102 L92 62 H68Z"/><path className="ribo-film" d="M38 72 Q80 50 122 72"/></svg><b>3</b><span>أشعة فوق بنفسجية تقوّي ألياف القرنية</span></li>
          </ol>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-pentacam" role="tabpanel" aria-labelledby="t-pentacam" tabIndex={-1} hidden>
      <section className="a-services"><div className="wrap">
        <h2 className="eyebrow-title">أشعة البنتاكام <bdi dir="ltr">Pentacam</bdi></h2>
        <div className="cataract svc-detail" id="svc-pentacam">
          <div className="art"><svg viewBox="0 0 160 120" role="img" aria-label="رسم لكاميرا تدور أمام العين وتصوّر القرنية من غير لمس"><path className="dome" d="M10 120 Q80 50 150 120Z"/><ellipse className="iris" cx="80" cy="86" rx="30" ry="8"/><ellipse cx="80" cy="86" rx="11" ry="3.5" fill="#123"/><path className="scan" d="M80 28 L40 96 M80 28 L60 90 M80 28 L80 86 M80 28 L100 90 M80 28 L120 96"/><path className="orbit" d="M56 16 A26 12 0 1 0 104 16"/><circle className="cam" cx="80" cy="20" r="10"/><circle cx="80" cy="20" r="4" fill="#fff"/></svg></div>
          <div>
            <h3>أشعة القرنية بالبنتاكام <bdi dir="ltr">Pentacam</bdi></h3>
            <p>كاميرا تدور أمام العين وتصوّر القرنية، لتقيس سمكها وانحناء سطحيها الأمامي والخلفي.</p>
            <ul>
              <li>الجهاز لا يلمس العين.</li>
              <li>ضرورية قبل عمليات تصحيح الإبصار.</li>
              <li>تُستخدم لاكتشاف القرنية المخروطية ومتابعتها.</li>
            </ul>
            <a href="/my/login">احجز الأشعة</a>
          </div>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-glaucoma" role="tabpanel" aria-labelledby="t-glaucoma" tabIndex={-1} hidden>
      <section className="a-services"><div className="wrap">
        <h2 className="eyebrow-title">المياه الزرقاء</h2>
        <div className="cataract svc-detail" id="svc-glaucoma">
          <div className="art"><svg viewBox="36 4 190 132" role="img" aria-label="رسم لعين يرتفع فيها الضغط فيضغط على العصب البصري"><defs><marker id="ah-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#e5484d"/></marker></defs><circle className="ball" cx="122" cy="70" r="58"/><path className="cornea" d="M68 36 Q40 70 68 104"/><path className="iris-s" d="M78 40 V58 M78 82 V100"/><ellipse className="nat" cx="96" cy="70" rx="9" ry="22"/><path className="nerve" d="M178 60 L222 54 V86 L178 80Z"/><path className="press" d="M126 70 L150 42" markerEnd="url(#ah-g)"/><path className="press" d="M126 70 L162 70" markerEnd="url(#ah-g)"/><path className="press" d="M126 70 L150 98" markerEnd="url(#ah-g)"/></svg></div>
          <div>
            <h3>المياه الزرقاء (الجلوكوما)</h3>
            <p>ارتفاع ضغط العين يضر العصب البصري تدريجياً، وغالباً من غير أعراض في البداية، لذلك قياس الضغط بانتظام هو الطريقة لاكتشافها مبكراً.</p>
            <ul>
              <li><b>قياس ضغط العين:</b> فحص سريع، ومهم بعد سن الأربعين ولمن في عائلته مياه زرقاء.</li>
              <li><b>العلاج:</b> قطرات أو عملية لخفض الضغط، ويحدد الطبيب الأنسب لحالتك.</li>
              <li><b>العملية:</b> تعمل مساراً لتصريف سائل العين فينخفض الضغط ويُحمى العصب البصري.</li>
            </ul>
            <a href="/my/login">احجز قياس الضغط</a>
          </div>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-kids" role="tabpanel" aria-labelledby="t-kids" tabIndex={-1} hidden>
      <section className="a-services"><div className="wrap">
        <h2 className="eyebrow-title">الحول والأطفال</h2>
        <div className="cataract svc-detail" id="svc-kids">
          <div className="art"><svg viewBox="0 0 160 120" role="img" aria-label="لوحة قياس النظر بحرف E بأحجام مختلفة"><rect className="chart" x="30" y="6" width="100" height="108" rx="8"/><g className="optotype" fontFamily="Arial, sans-serif" fontWeight="700" textAnchor="middle"><text x="80" y="44" fontSize="38">E</text><text x="64" y="72" fontSize="20" transform="rotate(90 64 66)">E</text><text x="96" y="72" fontSize="20" transform="rotate(180 96 66)">E</text><text x="56" y="96" fontSize="12" transform="rotate(270 56 92)">E</text><text x="80" y="96" fontSize="12">E</text><text x="104" y="96" fontSize="12" transform="rotate(90 104 92)">E</text></g></svg></div>
          <div>
            <h3>كشف الأطفال</h3>
            <p>كشف نظر الطفل لقياس قوة الإبصار ومعرفة احتياجه لنظارة، واكتشاف الحول وكسل العين مبكراً.</p>
            <ul>
              <li>يُنصح بالكشف قبل دخول المدرسة.</li>
              <li>احجز كشفاً لو لاحظت أن الطفل يقرّب الأشياء من عينيه، أو يغمض عيناً، أو تميل إحدى عينيه.</li>
            </ul>
            <a href="/my/login">احجز كشف الأطفال</a>
          </div>
        </div>
        <div className="cataract svc-detail" id="svc-squint">
          <div className="art"><svg viewBox="0 0 170 120" role="img" aria-label="عينان قبل جراحة الحول وإحداهما مائلة، وبعدها في نفس الاتجاه"><text className="lbl" x="166" y="44" textAnchor="start">قبل</text><path className="almond" d="M8 38 q25 -18 50 0 q-25 18 -50 0Z"/><circle className="iris" cx="33" cy="38" r="9"/><circle cx="33" cy="38" r="3.5" fill="#123"/><path className="almond" d="M82 38 q25 -18 50 0 q-25 18 -50 0Z"/><circle className="iris" cx="95" cy="38" r="9"/><circle cx="95" cy="38" r="3.5" fill="#123"/><text className="lbl" x="166" y="104" textAnchor="start">بعد</text><path className="almond" d="M8 98 q25 -18 50 0 q-25 18 -50 0Z"/><circle className="iris" cx="33" cy="98" r="9"/><circle cx="33" cy="98" r="3.5" fill="#123"/><path className="almond" d="M82 98 q25 -18 50 0 q-25 18 -50 0Z"/><circle className="iris" cx="107" cy="98" r="9"/><circle cx="107" cy="98" r="3.5" fill="#123"/></svg></div>
          <div>
            <h3>جراحة الحول</h3>
            <p>الحول اختلاف اتجاه العينين. الجراحة تعدّل عضلات العين لتضبط اتجاهها.</p>
            <ul>
              <li>يحدد الطبيب الإجراء المناسب بعد الفحوصات.</li>
            </ul>
            <a href="/my/login">احجز كشف الاستشاري</a>
          </div>
        </div>
      </div></section>
      </div>
      <div className="svc-panel" id="tab-exams" role="tabpanel" aria-labelledby="t-exams" tabIndex={-1} hidden>
      <section className="a-services"><div className="wrap">
        <h2 className="eyebrow-title">الكشف والفحوصات</h2>
        <div className="svc-cards">
          <article id="svc-exam"><svg viewBox="0 0 64 64" aria-hidden="true"><path className="almond" d="M6 32 q26 -24 52 0 q-26 24 -52 0Z"/><circle className="iris" cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="4" fill="#123"/></svg><h3>كشف الاستشاري</h3><p>كشف عيون شامل مع استشاري لتشخيص الحالة وتحديد العلاج أو العملية المناسبة.</p><ul><li>مواعيد الاستشاريين في <a className="inline" href="#a-doctors">تاب الأطباء</a>.</li></ul><a href="/my/login">احجز كشف الاستشاري</a></article>
          <article id="svc-specialist"><svg viewBox="0 0 64 64" aria-hidden="true"><rect className="cal" x="14" y="6" width="36" height="52" rx="5"/><g fill="#0b2a52" fontFamily="Arial, sans-serif" fontWeight="700" textAnchor="middle"><text x="32" y="28" fontSize="18">E</text><text x="25" y="44" fontSize="10">E</text><text x="39" y="44" fontSize="10" transform="rotate(180 39 40)">E</text></g></svg><h3>كشف الأخصائي</h3><p>كشف عيون يشمل قياس النظر ومقاس النظارة.</p><ul><li>يومياً من 12 ظهراً حتى 6 مساءً، عدا الجمعة، في فرع الكشف والفحوصات.</li></ul><a href="/my/login">احجز كشف الأخصائي</a></article>
          <article id="svc-fundus"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="#f4b998"/><circle cx="22" cy="32" r="6" fill="#ffe7a3"/><path className="vessel" d="M26 28 Q38 16 54 18 M26 36 Q38 48 54 46 M27 31 Q42 28 56 32"/></svg><h3>فحص قاع العين</h3><p>فحص الشبكية والعصب البصري.</p><ul><li>مهم لمرضى السكر والضغط.</li><li>قد تُستخدم قطرة لتوسيع الحدقة، فتبقى الرؤية مشوشة لبضع ساعات بعدها.</li></ul><a href="/my/login">احجز الفحص</a></article>
          <article id="svc-glasses"><svg viewBox="0 0 64 64" aria-hidden="true"><g className="frame"><circle cx="19" cy="36" r="11"/><circle cx="45" cy="36" r="11"/><path d="M30 34 Q32 30 34 34 M8 34 L4 24 M56 34 L60 24"/></g></svg><h3>مقاس النظارة والعدسات اللاصقة</h3><p>قياس النظر وتحديد مقاس النظارة أو العدسات اللاصقة المناسبة.</p><a href="/my/login">احجز المقاس</a></article>
          <article id="svc-followup"><svg viewBox="0 0 64 64" aria-hidden="true"><rect className="cal" x="10" y="14" width="44" height="40" rx="6"/><rect x="10" y="14" width="44" height="11" rx="6" fill="#0b4a8f"/><path className="tick" d="M22 40 L29 47 L43 33"/></svg><h3>المتابعة</h3><p>مراجعة بعد الكشف أو العملية في موعد يحدده الطبيب.</p><a href="/my/login">احجز المتابعة</a></article>
        </div>
      </div></section>
      </div>
      </div>
      <div className="tab-panel" id="tab-device" role="tabpanel" aria-labelledby="t-device" tabIndex={-1} hidden>
      <section id="edu-device" className="device"><div className="wrap">
        <h2 className="eyebrow-title">جهاز الليزر في المركز</h2>
        <div className="device-intro">
          <img src="/marketing/site/excimer-laser.webp" alt="جهاز WaveLight EX500 للإكسيمر ليزر مع سرير المريض" width="1000" height="832" loading="lazy" />
          <div>
            <h3><bdi dir="ltr">WaveLight® EX500</bdi> من <bdi dir="ltr">Alcon</bdi></h3>
            <p>جهاز إكسيمر ليزر نستخدمه في المركز لعمليات الليزك السطحي <bdi dir="ltr">PRK</bdi>، والليزك <bdi dir="ltr">LASIK</bdi> بمشرط موريا <bdi dir="ltr">Moria SBK</bdi>، والليزك السطحي بدون لمس <bdi dir="ltr">Trans-PRK</bdi>. يعمل بنظام النقطة الطائرة <bdi dir="ltr">(Flying spot)</bdi>، فيعيد تشكيل سطح القرنية بنبضات ليزر صغيرة متتالية حسب قياسات عين كل مريض.</p>
            <ul className="stats">
              <li><b><bdi dir="ltr">500</bdi></b><span>نبضة ليزر في الثانية <bdi dir="ltr">(500 Hz)</bdi></span></li>
              <li><b><bdi dir="ltr">1.4</bdi></b><span>ثانية لكل درجة نظر، عند منطقة علاج 6 مم</span></li>
              <li><b><bdi dir="ltr">1050</bdi></b><span>مرة في الثانية يتابع الجهاز حركة العين</span></li>
            </ul>
          </div>
        </div>

        <div className="device-cols">
          <div>
            <h3 className="col-h">المميزات</h3>
            <ol className="pbars">
              <li className="pbar"><div className="head"><span className="num">1</span><h3>علاج أسرع</h3></div><p>سرعة 500 نبضة في الثانية تقلّل الوقت الذي تتعرض فيه القرنية لليزر.</p></li>
              <li className="pbar"><div className="head"><span className="num">2</span><h3>تتبّع حركة العين لحظياً</h3></div><p>متتبّع العين يرصد حركتها 1050 مرة في الثانية ويعدّل مكان الليزر فوراً، بما في ذلك دوران العين وتغيّر مركز الحدقة.</p></li>
              <li className="pbar"><div className="head"><span className="num">3</span><h3>نتائج أكثر ثباتاً</h3></div><p>تقنية <bdi dir="ltr">PerfectPulse</bdi> تزامن نبضات الليزر مع تردد الجهاز، وتقلّل جفاف أنسجة القرنية أثناء العلاج.</p></li>
              <li className="pbar"><div className="head"><span className="num">4</span><h3>قياس سمك القرنية أثناء العملية</h3></div><p>يقيس الجهاز سمك القرنية قبل بدء الليزر مباشرة، للتأكد من السمك المتبقي بعد العلاج.</p></li>
              <li className="pbar"><div className="head"><span className="num">5</span><h3>الحفاظ على جودة الرؤية</h3></div><p>مصمَّم لتقليل الانحرافات الكروية بعد العملية والحفاظ على وضوح الرؤية في الإضاءة الضعيفة.</p></li>
            </ol>
            <p className="source">المصدر: الشركة المصنّعة <bdi dir="ltr">Alcon</bdi>، وملخص موافقة هيئة الغذاء والدواء الأمريكية <bdi dir="ltr">FDA</bdi>.</p>
          </div>
        </div>
      </div></section>
      </div>
      <div className="tab-panel" id="tab-doctor" role="tabpanel" aria-labelledby="t-doctor" tabIndex={-1} hidden>
      <section id="a-doctors"><div className="wrap">
        <h2 className="eyebrow-title">الأطباء</h2>
        <div className="docs">
          <article className="doc">
            <div className="hex"><img src="/marketing/site/dr-mohamed-elsaadany.webp" alt="صورة أ.د محمد السعدني غرابه" width="320" height="320" loading="lazy" /></div>
            <div>
              <p className="rank">استشاري أول</p>
              <h3>أ.د محمد السعدني غرابه</h3>
              <ul className="titles">
                <li>أستاذ طب وجراحة العيون، كلية الطب جامعة طنطا</li>
                <li>استشاري المياه البيضاء وزراعة العدسات</li>
                <li>استشاري تصحيح الإبصار بالليزر والفيمتو</li>
              </ul>
              <dl><dt>مواعيد الكشف</dt><dd>الأحد والثلاثاء والأربعاء من 12:30 حتى 3 عصراً</dd></dl>
              <a className="btn btn-accent" href="/my/login">احجز كشف الاستشاري</a>
            </div>
          </article>
        </div>
        <div className="team">
          <div className="team-group">
            <h3>الاستشاريون</h3>
            <ul>
            <li><span className="ini"><img src="/marketing/site/dr-mohamed-abdelrahim.webp" alt="صورة د. محمد عبدالرحيم" width="240" height="240" loading="lazy" /></span><span><b>د. محمد عبدالرحيم</b><small>استشاري</small><span className="when">الإثنين من 11 صباحاً حتى 1 ظهراً</span></span></li>
            <li><span className="ini" aria-hidden="true">ك</span><span><b>د. كريم عبدالرحيم</b><small>استشاري</small><span className="when">الخميس من 12 ظهراً حتى 3 عصراً</span></span></li>
            <li><span className="ini"><img src="/marketing/site/dr-eissa.webp" alt="صورة د. أحمد عيسى الجنايني" width="240" height="240" loading="lazy" /></span><span><b>د. أحمد عيسى الجنايني</b><small>استشاري طب وجراحة العيون، استشاري إزالة المياه البيضاء وتصحيح الإبصار بالليزر</small></span></li>
            </ul>
            <p className="team-note">كل المواعيد في فرع الكشف والفحوصات.</p>
          </div>
          <div className="team-group">
            <h3>الأخصائيون</h3>
            <ul>
            <li><span className="ini"><img src="/marketing/site/dr-magdy.webp" alt="صورة د. سعيد مجدي" width="240" height="240" loading="lazy" /></span><span><b>د. سعيد مجدي</b><small>أخصائي طب وجراحة العيون، إزالة المياه البيضاء بالفاكو وتصحيح الإبصار بالليزر</small><span className="when">الأحد والثلاثاء من 12 ظهراً حتى 6 مساءً</span></span></li>
            <li><span className="ini" aria-hidden="true">س</span><span><b>د. سما مصطفى</b><small>أخصائي</small><span className="when">السبت والأربعاء من 12 ظهراً حتى 6 مساءً<br />الإثنين من 1 ظهراً حتى 6 مساءً</span></span></li>
            <li><span className="ini" aria-hidden="true">ه</span><span><b>د. هبه طه</b><small>أخصائي</small><span className="when">الخميس من 3 عصراً حتى 6 مساءً</span></span></li>
            </ul>
            <p className="team-note">كل المواعيد في فرع الكشف والفحوصات.</p>
            <a className="btn btn-outline" href="/my/login">احجز كشف الأخصائي</a>
          </div>
        </div>
      </div></section>
      </div>
      <div className="tab-panel" id="tab-branches" role="tabpanel" aria-labelledby="t-branches" tabIndex={-1} hidden>
      <section id="a-branches"><div className="wrap">
        <h2 className="eyebrow-title">الفروع</h2>
        <div className="branches">
          <article className="branch">
            <h3>فرع الكشف والفحوصات</h3>
            <p className="addr"><bdi dir="ltr">3</bdi> ش بطرس، أعلى توكيل <bdi dir="ltr">LG</bdi>، الدور الأول</p>
            <dl>
              <div><dt>كشف الأخصائي</dt><dd>يومياً من 12 ظهراً حتى 6 مساءً، عدا الجمعة</dd></div>
              <div><dt>كشف أ.د محمد السعدني غرابه</dt><dd>الأحد والثلاثاء والأربعاء من 12:30 ظهراً</dd></div>
              <div><dt>تليفون</dt><dd><a href="tel:0403320833"><bdi dir="ltr">0403320833</bdi></a></dd></div>
              <div><dt>موبايل</dt><dd><a href="tel:01272303303"><bdi dir="ltr">01272303303</bdi></a> · <a href="tel:01027357352"><bdi dir="ltr">01027357352</bdi></a></dd></div>
              <div><dt>واتساب</dt><dd><a href="https://wa.me/201285800309"><bdi dir="ltr">01285800309</bdi></a></dd></div>
            </dl>
            <a className="btn btn-outline" href="https://www.google.com/maps/search/?api=1&query=3%20%D8%B4%D8%A7%D8%B1%D8%B9%20%D8%A8%D8%B7%D8%B1%D8%B3%20%D8%A3%D8%B9%D9%84%D9%89%20%D8%AA%D9%88%D9%83%D9%8A%D9%84%20LG%20%D8%B7%D9%86%D8%B7%D8%A7">افتح في خرائط Google</a>
          </article>
          <article className="branch">
            <h3>فرع العمليات</h3>
            <p className="addr">علي بك الكبير من الحلو، مستشفى الشروق، الدور الثاني، مركز عيون الشروق</p>
            <dl>
              <div><dt>المواعيد</dt><dd>من الأحد حتى الأربعاء، من 9 صباحاً حتى 3 عصراً</dd></div>
              <div><dt>تليفون</dt><dd><a href="tel:04033288778"><bdi dir="ltr">04033288778</bdi></a></dd></div>
            </dl>
            <a className="btn btn-outline" href="https://www.google.com/maps/search/?api=1&query=%D9%85%D8%B3%D8%AA%D8%B4%D9%81%D9%89%20%D8%A7%D9%84%D8%B4%D8%B1%D9%88%D9%82%20%D8%B9%D9%84%D9%8A%20%D8%A8%D9%83%20%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1%20%D8%B7%D9%86%D8%B7%D8%A7">افتح في خرائط Google</a>
          </article>
        </div>
      </div></section>
      </div>
      <div className="tab-panel" id="tab-tips" role="tabpanel" aria-labelledby="t-tips" tabIndex={-1} hidden>
      <section id="a-tips"><div className="wrap">
        <h2 className="eyebrow-title">احفظ عينك من الجفاف</h2>
        <ul className="tips">
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><path className="s" d="M22 6h12v8H22zM19 14h18v34a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4z"/><path className="o" d="M28 25c-4 5-5 7-5 9a5 5 0 0 0 10 0c0-2-1-4-5-9z"/></svg><span>استخدم قطرة العين باستمرار</span></li>
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><path className="s" d="M4 28c7-11 15-16 24-16s17 5 24 16c-7 11-15 16-24 16S11 39 4 28z"/><circle className="o" cx="28" cy="28" r="8"/><circle cx="28" cy="28" r="3" fill="currentColor" style={{ color: "var(--primary)" }}/></svg><span>قم بتمارين للعين يومياً</span></li>
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><rect className="s" x="16" y="4" width="24" height="48" rx="4"/><path className="s" d="M25 46h6"/><path className="o" d="M22 22h12"/></svg><span>قلّل استخدام الموبايل</span></li>
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><path className="s" d="M24 4h8v6l4 6v32a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V16l4-6z"/><path className="o" d="M20 26h16M20 38h16"/></svg><span>اشرب كثيراً من المياه</span></li>
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><path className="s" d="M6 22c4 4 10 4 14 0M36 22c4 4 10 4 14 0"/><path className="o" d="M6 30c0 8 6 12 11 12s9-4 9-10zM50 30c0 8-6 12-11 12s-9-4-9-10z"/></svg><span>استخدم مرطبات وماسكات للعين</span></li>
          <li><svg viewBox="0 0 56 56" aria-hidden="true"><circle className="o" cx="28" cy="28" r="23"/><path className="o" d="M12 12l32 32"/><path className="s" d="M14 30h24M40 30h4M38 24c0-4 4-4 4-8"/></svg><span>الإقلاع عن التدخين</span></li>
        </ul>
        <aside className="rule20" aria-labelledby="rule20-title">
          <p className="big" aria-hidden="true"><bdi dir="ltr">20-20-20</bdi></p>
          <div><h3 id="rule20-title">قاعدة تريح عينك أمام الشاشات</h3><p>كل 20 دقيقة من التركيز على الموبايل أو الكمبيوتر، انظر لشيء على بُعد 20 قدماً (حوالي 6 أمتار) لمدة 20 ثانية، لتريح عضلات التركيز في العين.</p></div>
        </aside>
        <h3 style={{ fontSize: "17px", marginTop: "36px" }}>مواضيع أخرى على صفحتنا في فيسبوك</h3>
        <div className="topics">
          <a href="https://www.facebook.com/selrs.tanta">أسباب جفاف العين</a>
          <a href="https://www.facebook.com/selrs.tanta">النظر يتأثر بالسكري</a>
          <a href="https://www.facebook.com/selrs.tanta">انحراف النظر: أعراضه وعلاجه</a>
          <a href="https://www.facebook.com/selrs.tanta">ضعف النظر عند الأطفال</a>
          <a href="https://www.facebook.com/selrs.tanta">كيفية تشخيص القرنية المخروطية</a>
          <a href="https://www.facebook.com/selrs.tanta">خطورة المياه البيضاء على العين</a>
        </div>
      </div></section>
      </div>
      </div>

      <footer className="foot" id="a-contact"><span className="badge"><img src="/marketing/site/shorouk-eyes-logo.webp" alt="شعار عيون الشروق" /></span><div className="wrap"><p className="wordmark" lang="en" dir="ltr" style={{ textAlign: "start" }}>SHOROUK EYES<small>FOR LASIK &amp; REFRACTIVE SURGERY</small></p><p className="slogans"><span>دقة .. أمان .. ثقة</span><span>رؤيتك مستقبلنا</span></p><b>تواصل معنا:</b><a href="tel:0403320833">الكشف <bdi dir="ltr">0403320833</bdi></a><a href="tel:01272303303">موبايل <bdi dir="ltr">01272303303</bdi></a><a href="tel:04033288778">العمليات <bdi dir="ltr">04033288778</bdi></a><a href="https://wa.me/201285800309">واتساب <bdi dir="ltr">01285800309</bdi></a><a href="https://www.facebook.com/selrs.tanta">فيسبوك</a><a href="/privacy">سياسة الخصوصية</a></div></footer>
    </div>
  );
}
