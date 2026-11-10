import re, sys, base64, io, os
from PIL import Image
D = 'docs/prototypes/'
def extract():
    s = open(D+'landing-prototypes.html', encoding='utf-8').read()
    s = re.sub(r'<div class="switcher".*?</div>\s*</div>\s*<div class="note">.*?</div></div>\s*', '', s, count=1, flags=re.S)
    s = s[:s.index('<!-- ================= B')] + s[s.index('<template id="edu">'):]
    s = s.replace('<div class="head-actions"><a class="btn btn-outline" href="https://selrs.cc/portals">',
      '<div class="head-actions"><button type="button" class="btn" style="border:1px solid var(--border);background:var(--bg);color:var(--fg);padding:0 12px" id="themeBtn" aria-pressed="false">الوضع الداكن</button><a class="btn btn-outline" href="https://selrs.cc/portals">', 1)
    a, b = s.index('<script>'), s.index('</script>') + 9
    s = s[:a] + '''<script>
  const proto = document.getElementById("proto-a");
  proto.insertBefore(document.getElementById("edu").content.cloneNode(true), proto.querySelector("#a-contact"));
  const themeBtn = document.getElementById("themeBtn");
  themeBtn.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.textContent = dark ? "الوضع الفاتح" : "الوضع الداكن";
  });
</script>''' + s[b:]
    s = s.replace('<title>نماذج الصفحة الرئيسية | عيون الشروق</title>', '<title>مركز عيون الشروق لليزك وتصحيح الإبصار</title>')
    open(D+'selrs-landing-a.src.html', 'w', encoding='utf-8').write(s)
def embed():
    s = open(D+'selrs-landing-a.src.html', encoding='utf-8').read(); cache = {}
    def uri(rel):
        if rel not in cache:
            p = os.path.normpath(os.path.join(D, rel))
            if p.endswith('.png'):
                im = Image.open(p).convert('RGBA'); im.thumbnail((160,160)); buf = io.BytesIO(); im.save(buf,'PNG',optimize=True); data, mime = buf.getvalue(), 'image/png'
            else: data, mime = open(p,'rb').read(), 'image/webp'
            cache[rel] = f'data:{mime};base64,' + base64.b64encode(data).decode()
        return cache[rel]
    s = re.sub(r'(src|data-full)="(\.\./\.\./client/public/[^"]+)"', lambda m: f'{m.group(1)}="{uri(m.group(2))}"', s)
    s = re.sub(r'url\("(\.\./\.\./client/public/[^"]+)"\)', lambda m: f'url("{uri(m.group(1))}")', s)
    assert '../../client/public' not in s
    open(D+'selrs-landing-a.html', 'w', encoding='utf-8').write(s); print('built', len(s)//1024, 'KB,', len(cache), 'images')
{'extract': extract, 'embed': embed}[sys.argv[1]]()
