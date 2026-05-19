# SELRS Desktop (WebView2)

نسخة ويندوز خفيفة لفتح SELRS كبرنامج مستقل بدل تبويب المتصفح.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\desktop\build-selrs-desktop.ps1
```

الناتج في:

`desktop\publish`

## Run

شغّل:

`desktop\publish\SELRS.exe`

## تغيير الرابط

افتراضيًا يفتح:

`https://op.selrs.cc`

لتغيير الرابط:

```powershell
$env:SELRS_DESKTOP_URL="http://192.168.0.100:4000"
Start-Process ".\desktop\publish\SELRS.exe"
```
