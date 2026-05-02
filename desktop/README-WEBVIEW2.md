# WebView2 Runtime Requirement

**SELRS Desktop** requires **Microsoft Edge WebView2 Runtime** to run.

## Error: "Couldn't find a compatible Webview2 Runtime installation"

If you see this error, you need to install WebView2 Runtime:

### Solution 1: Auto-Install (Recommended)
Run `SELRS.bat` instead of `SELRS.exe`. The batch file will:
1. Check if WebView2 is installed
2. Automatically download and install it if missing
3. Launch SELRS

### Solution 2: Manual Installation
1. Download WebView2 Runtime from Microsoft:
   ```
   https://go.microsoft.com/fwlink/p/?LinkId=2124703
   ```

2. Look for "Evergreen Bootstrapper" (small download ~2MB)

3. Run the installer and follow the prompts

4. Restart SELRS

### Solution 3: Use Electron Version (Windows 7)
If you continue having issues, use **SELRS-Electron-Setup.exe** instead. It bundles Chromium and doesn't require WebView2.

---

## WebView2 Compatibility

- **Windows 10+**: Officially supported
- **Windows 7**: Requires manual installation (some versions don't work)
- **Windows 8/8.1**: Should work but not officially supported

If you're on Windows 7 and having issues after installing WebView2, use the Electron version (SELRS-Electron-Setup.exe) instead.
