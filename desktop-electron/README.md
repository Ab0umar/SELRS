# SELRS Desktop (Electron)

نسخة بديلة أثقل من WebView2 لكنها أكثر ثباتًا ضد reload.

## Build Installer

```powershell
powershell -ExecutionPolicy Bypass -File D:\c\srv100_acc\desktop-electron\build-electron-installer.ps1
```

لو تريد URL مختلف:

```powershell
powershell -ExecutionPolicy Bypass -File D:\c\srv100_acc\desktop-electron\build-electron-installer.ps1 -Url "http://192.168.0.100:4000"
```

## Output

`D:\c\srv100_acc\desktop-electron\dist`
