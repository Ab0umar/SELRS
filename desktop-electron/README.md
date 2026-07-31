# SELRS Desktop (Electron)

نسخة بديلة أثقل من WebView2 لكنها أكثر ثباتًا ضد reload.

## Build Installer

```powershell
powershell -ExecutionPolicy Bypass -File E:\selrs.cc\desktop-electron\build-electron-installer.ps1
```

لو تريد URL مختلف:

```powershell
powershell -ExecutionPolicy Bypass -File E:\selrs.cc\desktop-electron\build-electron-installer.ps1 -Url "http://192.168.0.100:4000"
```

## Output

`E:\selrs.cc\desktop-electron\dist`
