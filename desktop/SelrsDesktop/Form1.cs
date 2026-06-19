using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Linq;
using System.Windows.Forms;
#if !NETFRAMEWORK
using System.Net.Http;
using System.Net.WebSockets;
using System.Text.Json;
using System.Threading;
using System.Reflection;
#endif

namespace SelrsDesktop;

public partial class Form1 : Form
{
    private const string DefaultHomeUrl = "http://192.168.1.100:4000";
    private static readonly (string id, string label, string url)[] UrlPresets = [
        ("local",      "الشبكة المحلية (192.168.1.100:4000)", "http://192.168.1.100:4000"),
        ("localhost",  "Localhost (localhost:4000)",            "http://localhost:4000"),
        ("lan",        "الشبكة (192.168.0.100:4000)",          "http://192.168.0.100:4000"),
        ("online",     "الإنترنت (selrs.cc)",                  "https://selrs.cc"),
    ];

    private string _homeUrl;
    private readonly string _userDataDir;
    private string _currentUrl;
    private string _lastUri = string.Empty;
    private readonly bool _hasSavedUrl;
    private string? _pendingSaveUrl;
    private bool _showingErrorPage;
    private bool _closeToTray = true;

    // Window chrome
    private const int WmNclbuttondown = 0xA1;
    private const int HtCaption = 0x2;
    private const int TopBarExpandedHeight = 40;
    private readonly System.Windows.Forms.Timer _topBarTimer = new() { Interval = 150 };
    private DateTime _lastTopEdgeHoverUtc = DateTime.UtcNow;

    // Tray icon
    private NotifyIcon? _trayIcon;
    private ContextMenuStrip? _trayMenu;

#if !NETFRAMEWORK
    // Background services
    private CancellationTokenSource? _wsCts;
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(10) };
#endif

    public Form1()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL");
        var savedUrl = LoadSavedUrl();
        _hasSavedUrl = !string.IsNullOrWhiteSpace(savedUrl);
        _homeUrl = NormalizeHomeUrl(configuredUrl ?? savedUrl);
        _currentUrl = _homeUrl;
        _userDataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SELRSDesktop", "WebView2");
        InitializeComponent();
        try { Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
        catch (Exception ex) { LogError("Failed to set icon", ex); }

        InitTray();

        Shown += HandleShown;
        FormClosing += HandleFormClosing;

        var chromeMode = (Environment.GetEnvironmentVariable("SELRS_WINDOW_CHROME") ?? "").Trim().ToLowerInvariant();
        var forceModernChrome = chromeMode == "modern" || chromeMode == "borderless";
#if NETFRAMEWORK
        if (forceModernChrome) EnableModernBorderlessShell();
        else { FormBorderStyle = FormBorderStyle.Sizable; ControlBox = true; MinimizeBox = true; MaximizeBox = true; topBar.Visible = false; topBar.Height = 0; DoubleBuffered = true; }
#else
        if (forceModernChrome) EnableModernBorderlessShell();
        else { FormBorderStyle = FormBorderStyle.Sizable; ControlBox = true; MinimizeBox = true; MaximizeBox = true; topBar.Visible = false; topBar.Height = 0; DoubleBuffered = true; }
#endif
    }

    // ── Tray icon ─────────────────────────────────────────────────────────────
    private void InitTray()
    {
        _trayMenu = new ContextMenuStrip();

        _trayMenu.Items.Add("فتح SELRS", null, (_, _) => BringToFront_());
        _trayMenu.Items.Add(new ToolStripSeparator());

        foreach (var (_, label, url) in UrlPresets)
        {
            var u = url;
            _trayMenu.Items.Add(label, null, (_, _) => SwitchUrl(u));
        }

        _trayMenu.Items.Add(new ToolStripSeparator());
#if !NETFRAMEWORK
        _trayMenu.Items.Add("البحث عن تحديثات", null, async (_, _) => await CheckForUpdatesAsync(silent: false));
#endif
        _trayMenu.Items.Add(new ToolStripSeparator());
        _trayMenu.Items.Add("إغلاق", null, (_, _) => { _closeToTray = false; Close(); });

        _trayIcon = new NotifyIcon
        {
            Icon = Icon ?? SystemIcons.Application,
            Text = "SELRS Desktop",
            Visible = true,
            ContextMenuStrip = _trayMenu,
        };
        _trayIcon.DoubleClick += (_, _) => BringToFront_();
        _trayIcon.BalloonTipClicked += (_, _) => BringToFront_();
    }

    private void BringToFront_()
    {
        Show();
        WindowState = FormWindowState.Normal;
        BringToFront();
        Activate();
    }

    private void HandleFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (_closeToTray && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
            _trayIcon?.ShowBalloonTip(2000, "SELRS", "التطبيق يعمل في الخلفية", ToolTipIcon.Info);
            return;
        }
        // Real exit — clean up
#if !NETFRAMEWORK
        _wsCts?.Cancel();
#endif
        _trayIcon?.Dispose();
    }

#if !NETFRAMEWORK
    // ── Notifications (native balloon) ────────────────────────────────────────
    private void ShowNotification(string title, string body)
    {
        if (_trayIcon == null) return;
        if (InvokeRequired)
        {
            Invoke(() => ShowNotification(title, body));
            return;
        }
        _trayIcon.ShowBalloonTip(5000, title, body, ToolTipIcon.Info);
    }

    // ── WebSocket background listener ─────────────────────────────────────────
    private void StartWsListener()
    {
        _wsCts = new CancellationTokenSource();
        _ = Task.Run(() => WsListenLoop(_wsCts.Token));
    }

    private async Task WsListenLoop(CancellationToken ct)
    {
        var delay = 3000;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                var wsUrl = _homeUrl
                    .Replace("https://", "wss://", StringComparison.OrdinalIgnoreCase)
                    .Replace("http://", "ws://", StringComparison.OrdinalIgnoreCase)
                    .TrimEnd('/') + "/ws";

                using var ws = new ClientWebSocket();
                ws.Options.SetRequestHeader("User-Agent", "SELRSDesktop/1");
                await ws.ConnectAsync(new Uri(wsUrl), ct);
                delay = 3000;

                var buf = new byte[8192];
                while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                {
                    var result = await ws.ReceiveAsync(buf, ct);
                    if (result.MessageType == WebSocketMessageType.Close) break;

                    var json = Encoding.UTF8.GetString(buf, 0, result.Count);
                    HandleWsMessage(json);
                }
            }
            catch (OperationCanceledException) { return; }
            catch { /* server down — retry */ }

            await Task.Delay(Math.Min(delay, 30_000), ct).ContinueWith(_ => { });
            delay = Math.Min(delay * 2, 30_000);
        }
    }

    private void HandleWsMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;
            if (type != "app-notification") return;

            var title = root.TryGetProperty("title", out var ti) ? ti.GetString() ?? "SELRS" : "SELRS";
            var message = root.TryGetProperty("message", out var m) ? m.GetString() ?? "" : "";
            ShowNotification(title, message);
        }
        catch { }
    }

    // ── Auto-updater ──────────────────────────────────────────────────────────
    private static string GetAssemblyVersion()
    {
        return Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion?.Split('+')[0]
            ?? Assembly.GetExecutingAssembly().GetName().Version?.ToString(3)
            ?? "0.0.0";
    }

    private async Task CheckForUpdatesAsync(bool silent = true)
    {
        try
        {
            var url = _homeUrl.TrimEnd('/') + "/healthz";
            var resp = await _http.GetStringAsync(url);
            using var doc = JsonDocument.Parse(resp);
            var serverVersion = doc.RootElement.TryGetProperty("version", out var v) ? v.GetString() ?? "" : "";
            if (string.IsNullOrWhiteSpace(serverVersion)) return;

            var current = GetAssemblyVersion();
            if (serverVersion == current || !IsNewerVersion(serverVersion, current))
            {
                if (!silent)
                    Invoke(() => MessageBox.Show(this,
                        $"أنت تستخدم أحدث إصدار ({current})",
                        "تحديثات", MessageBoxButtons.OK, MessageBoxIcon.Information));
                return;
            }

            Invoke(() =>
            {
                var result = MessageBox.Show(this,
                    $"يتوفر إصدار جديد {serverVersion} (الحالي: {current})\nهل تريد تنزيل التحديث؟",
                    "تحديث متاح", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
                if (result == DialogResult.Yes)
                {
                    var installerUrl = _homeUrl.TrimEnd('/') + $"/updates/webview/SELRS-Setup-{serverVersion}.exe";
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(installerUrl) { UseShellExecute = true });
                }
            });
        }
        catch { if (!silent) Invoke(() => MessageBox.Show(this, "تعذر التحقق من التحديثات", "خطأ", MessageBoxButtons.OK, MessageBoxIcon.Warning)); }
    }

    private static bool IsNewerVersion(string server, string current)
    {
        return Version.TryParse(server, out var s) && Version.TryParse(current, out var c) && s > c;
    }
#endif

    // ── WebView2 ──────────────────────────────────────────────────────────────
    private async Task InitializeWebViewAsync()
    {
        try
        {
            Directory.CreateDirectory(_userDataDir);
            Text = $"SELRS Desktop - Loading {_homeUrl}";

            webView.CoreWebView2InitializationCompleted += HandleCoreWebView2InitializationCompleted;
            webView.NavigationStarting += HandleNavigationStarting;
            webView.NavigationCompleted += HandleNavigationCompleted;

            var environment = await CoreWebView2Environment.CreateAsync(null, _userDataDir);
            await webView.EnsureCoreWebView2Async(environment);

            if (webView.CoreWebView2 == null)
                throw new InvalidOperationException("WebView2 initialized without CoreWebView2.");

#if !NETFRAMEWORK
            // Auto-grant notification permission so web push works natively
            webView.CoreWebView2.PermissionRequested += (_, e) =>
            {
                if (e.PermissionKind == CoreWebView2PermissionKind.Notifications)
                    e.State = CoreWebView2PermissionState.Allow;
            };
#endif

            webView.CoreWebView2.ContextMenuRequested += HandleContextMenuRequested;
            webView.CoreWebView2.WebMessageReceived += HandleWebMessage;
            webView.CoreWebView2.Navigate(_homeUrl);
        }
        catch (Exception ex)
        {
            LogError("WebView2 startup failed", ex);
            ShowStartupErrorPage("WebView2 startup failed", ex.Message);
        }
    }

    private void HandleCoreWebView2InitializationCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
    {
        if (e.IsSuccess) return;
        var message = e.InitializationException?.Message ?? "Unknown WebView2 initialization error.";
        LogError("WebView2 initialization failed", e.InitializationException);
        ShowStartupErrorPage("WebView2 initialization failed", message);
    }

    private void HandleNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess)
        {
            if (!_showingErrorPage)
            {
                Text = "SELRS Desktop";
                if (_pendingSaveUrl != null) { SaveUrl(_pendingSaveUrl); _pendingSaveUrl = null; }
            }
            return;
        }
        _showingErrorPage = true;
        var message = $"Navigation failed: {e.WebErrorStatus}";
        LogError($"{message}. URL: {webView.Source}", null);
        ShowStartupErrorPage(message, $"URL: {webView.Source}");
    }

    private void HandleNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(e.Uri)) return;
        if (!string.IsNullOrWhiteSpace(_lastUri) &&
            string.Equals(NormalizeUri(_lastUri), NormalizeUri(e.Uri), StringComparison.OrdinalIgnoreCase) &&
            !e.IsUserInitiated)
        { e.Cancel = true; return; }
        _lastUri = e.Uri;
        _showingErrorPage = false;
    }

    // ── URL helpers ───────────────────────────────────────────────────────────
    private static string NormalizeHomeUrl(string? value)
    {
        var candidate = string.IsNullOrWhiteSpace(value) ? DefaultHomeUrl : value.Trim();
        if (!candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            candidate = $"https://{candidate}";
        return Uri.TryCreate(candidate, UriKind.Absolute, out var uri) ? uri.ToString() : DefaultHomeUrl;
    }

    private string LoadSavedUrl()
    {
        try
        {
            var configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SELRSDesktop", "url_config.txt");
            if (File.Exists(configPath)) { var saved = File.ReadAllText(configPath).Trim(); return string.IsNullOrWhiteSpace(saved) ? "" : saved; }
        }
        catch { }
        return "";
    }

    private void SaveUrl(string url)
    {
        try
        {
            var configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SELRSDesktop");
            Directory.CreateDirectory(configDir);
            File.WriteAllText(Path.Combine(configDir, "url_config.txt"), url);
        }
        catch { }
    }

    private void SwitchUrl(string newUrl)
    {
        var normalized = NormalizeHomeUrl(newUrl);
        if (normalized == _currentUrl) return;
        _homeUrl = normalized;
        _currentUrl = normalized;
        SaveUrl(normalized);

#if !NETFRAMEWORK
        // Restart WebSocket listener with new URL
        _wsCts?.Cancel();
        StartWsListener();
#endif

        if (webView.CoreWebView2 != null)
            webView.CoreWebView2.Navigate(normalized);
        else
            MessageBox.Show("WebView is not initialized yet. Please try again in a moment.", "Navigation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }

    // ── URL chooser dialog ────────────────────────────────────────────────────
    private bool ShowStartupUrlChooser()
    {
        var bg = Color.FromArgb(248, 250, 252);
        var textPrimary = Color.FromArgb(17, 28, 48);
        var textSubdued = Color.FromArgb(107, 119, 140);
        var borderColor = Color.FromArgb(218, 228, 243);
        var accentBlue = Color.FromArgb(37, 99, 235);

        using var dialog = new Form
        {
            Text = "SELRS", StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedSingle, MinimizeBox = false,
            MaximizeBox = false, ShowInTaskbar = false, ClientSize = new Size(440, 320), BackColor = bg,
        };

        var lblTitle = new Label { Text = "اختر اتصال SELRS", Font = new Font("Segoe UI", 12F, FontStyle.Bold), ForeColor = textPrimary, AutoSize = false, Location = new Point(20, 18), Size = new Size(400, 26), TextAlign = ContentAlignment.MiddleRight };
        var sep = new Panel { BackColor = borderColor, Location = new Point(20, 52), Size = new Size(400, 1) };

        var radios = new RadioButton[UrlPresets.Length];
        for (var i = 0; i < UrlPresets.Length; i++)
        {
            var preset = UrlPresets[i];
            var y = 64 + i * 52;
            var rb = new RadioButton { Text = preset.label, Tag = preset.url, Checked = NormalizeHomeUrl(preset.url) == _currentUrl, Font = new Font("Segoe UI", 10F), ForeColor = textPrimary, BackColor = bg, AutoSize = false, Location = new Point(20, y), Size = new Size(400, 22), RightToLeft = RightToLeft.Yes };
            var urlLbl = new Label { Text = preset.url, Font = new Font("Segoe UI", 8.5F), ForeColor = textSubdued, BackColor = bg, AutoSize = false, Location = new Point(44, y + 23), Size = new Size(376, 16), TextAlign = ContentAlignment.MiddleRight };
            radios[i] = rb;
            dialog.Controls.Add(rb);
            dialog.Controls.Add(urlLbl);
        }
        if (!radios.Any(r => r.Checked)) radios[0].Checked = true;

        var btnCancel = new Button { Text = "إلغاء", DialogResult = DialogResult.Cancel, Font = new Font("Segoe UI", 9.5F), ForeColor = Color.FromArgb(75, 90, 110), BackColor = bg, FlatStyle = FlatStyle.Flat, Size = new Size(88, 34), Location = new Point(20, 274), UseVisualStyleBackColor = false };
        btnCancel.FlatAppearance.BorderSize = 1; btnCancel.FlatAppearance.BorderColor = borderColor; btnCancel.FlatAppearance.MouseOverBackColor = Color.FromArgb(229, 236, 246); btnCancel.FlatAppearance.MouseDownBackColor = Color.FromArgb(210, 222, 240);

        var btnOpen = new Button { Text = "فتح", DialogResult = DialogResult.OK, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold), ForeColor = Color.White, BackColor = accentBlue, FlatStyle = FlatStyle.Flat, Size = new Size(88, 34), Location = new Point(332, 274), UseVisualStyleBackColor = false };
        btnOpen.FlatAppearance.BorderSize = 0; btnOpen.FlatAppearance.MouseOverBackColor = Color.FromArgb(29, 78, 216); btnOpen.FlatAppearance.MouseDownBackColor = Color.FromArgb(30, 64, 175);

        dialog.AcceptButton = btnOpen; dialog.CancelButton = btnCancel;
        dialog.Controls.AddRange([lblTitle, sep, btnCancel, btnOpen]);

        if (dialog.ShowDialog(this) != DialogResult.OK) return false;
        var selected = radios.FirstOrDefault(r => r.Checked)?.Tag?.ToString();
        if (string.IsNullOrWhiteSpace(selected)) return false;

        var normalized = NormalizeHomeUrl(selected);
        _homeUrl = normalized; _currentUrl = normalized; _pendingSaveUrl = normalized;
        return true;
    }

    // ── Context menu (right-click) ────────────────────────────────────────────
    private void ShowUrlSwitchMenu(CoreWebView2ContextMenuRequestedEventArgs args)
    {
        args.Handled = true;
        var menu = new ContextMenuStrip();

        foreach (var (_, label, url) in UrlPresets)
        {
            var u = url;
            var item = new ToolStripMenuItem(label);
            if (NormalizeHomeUrl(url) == _currentUrl) item.Checked = true;
            item.Click += (_, _) => SwitchUrl(u);
            menu.Items.Add(item);
        }

        menu.Items.Add(new ToolStripSeparator());
#if !NETFRAMEWORK
        menu.Items.Add("البحث عن تحديثات", null, async (_, _) => await CheckForUpdatesAsync(silent: false));
#endif

        menu.Closed += (s, e) => BeginInvoke(() => menu.Dispose());
        menu.Show(webView, new System.Drawing.Point((int)args.Location.X, (int)args.Location.Y));
    }

    // ── Startup ───────────────────────────────────────────────────────────────
    private async void HandleShown(object? sender, EventArgs e)
    {
        if (!_hasSavedUrl &&
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL")) &&
            !ShowStartupUrlChooser())
        { Close(); return; }

        await InitializeWebViewAsync();

#if !NETFRAMEWORK
        // Background: start WS listener + check for updates
        StartWsListener();
        _ = Task.Run(async () => { await Task.Delay(5000); await CheckForUpdatesAsync(silent: true); });
#endif
    }

    // ── Window chrome ─────────────────────────────────────────────────────────
    private void EnableModernBorderlessShell()
    {
        FormBorderStyle = FormBorderStyle.None;
        if (topBar != null) { topBar.Visible = false; topBar.MouseMove += HandleAnyMouseMove; topBar.MouseDown += HandleTopBarMouseDown; }
        MouseMove += HandleAnyMouseMove;
        if (webView != null) webView.MouseMove += HandleAnyMouseMove;
        if (btnMinimize != null) btnMinimize.Click += (_, _) => WindowState = FormWindowState.Minimized;
        if (btnMaximize != null) btnMaximize.Click += (_, _) => WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
        if (btnClose != null) { btnClose.Click += (_, _) => Close(); btnClose.MouseEnter += (_, _) => btnClose.ForeColor = Color.White; btnClose.MouseLeave += (_, _) => btnClose.ForeColor = Color.FromArgb(50, 65, 90); }
        if (topBar != null) topBar.Paint += (_, pe) => { using var pen = new Pen(Color.FromArgb(218, 228, 243)); pe.Graphics.DrawLine(pen, 0, topBar.Height - 1, topBar.Width - 1, topBar.Height - 1); };
        Resize += (_, _) => UpdateMaximizeButtonText();
        _topBarTimer.Tick += (_, _) => HandleTopBarAutoHideTick();
        _topBarTimer.Start();
    }

    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    private void HandleTopBarMouseDown(object? sender, MouseEventArgs e) { if (e.Button != MouseButtons.Left) return; ReleaseCapture(); SendMessage(Handle, WmNclbuttondown, HtCaption, 0); }
    private void HandleAnyMouseMove(object? sender, MouseEventArgs e) { var clientPoint = PointToClient(Cursor.Position); if (clientPoint.Y <= 10 || (topBar.Visible && clientPoint.Y <= TopBarExpandedHeight + 6)) { _lastTopEdgeHoverUtc = DateTime.UtcNow; ShowTopBar(); } }
    private void HandleTopBarAutoHideTick() { var clientPoint = PointToClient(Cursor.Position); var overTopArea = clientPoint.Y <= TopBarExpandedHeight + 6; if (clientPoint.Y <= 10) { _lastTopEdgeHoverUtc = DateTime.UtcNow; ShowTopBar(); return; } if (!topBar.Visible) return; if (overTopArea) { _lastTopEdgeHoverUtc = DateTime.UtcNow; return; } if ((DateTime.UtcNow - _lastTopEdgeHoverUtc).TotalMilliseconds < 800) return; topBar.Height = 0; topBar.Visible = false; }
    private void HideTopBar() { if (!topBar.Visible) return; topBar.Height = 0; topBar.Visible = false; }
    private void UpdateMaximizeButtonText() { if (btnMaximize != null) btnMaximize.Text = WindowState == FormWindowState.Maximized ? "❐" : "□"; }
    private void ShowTopBar() { if (topBar.Visible) return; topBar.Visible = true; topBar.Height = TopBarExpandedHeight; }

    // ── Web messages ──────────────────────────────────────────────────────────
    private void HandleContextMenuRequested(object? sender, CoreWebView2ContextMenuRequestedEventArgs e) => ShowUrlSwitchMenu(e);

    private void HandleWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        switch (e.TryGetWebMessageAsString())
        {
            case "retry": webView.CoreWebView2?.Navigate(_homeUrl); break;
            case "chooser": if (ShowStartupUrlChooser()) webView.CoreWebView2?.Navigate(_homeUrl); else Close(); break;
        }
    }

    // ── Error page ────────────────────────────────────────────────────────────
    private void ShowStartupErrorPage(string title, string details)
    {
        var safeTitle = WebUtility.HtmlEncode(title);
        var safeDetails = WebUtility.HtmlEncode(details);
        var safeUrl = WebUtility.HtmlEncode(_homeUrl);
        var html = $$"""
<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:#f8fafc;color:#111c30;display:grid;place-items:center;min-height:100vh}.card{width:min(560px,calc(100vw - 40px));background:#fff;border:1px solid #dae4f3;border-radius:10px;padding:32px 36px}.icon{width:36px;height:36px;margin-bottom:16px;color:#dc2626}h1{font-size:19px;font-weight:600;margin:0 0 8px;line-height:1.4}.detail{font-size:13px;color:#6b7892;margin:0 0 12px;line-height:1.6}.url{display:inline-block;font-family:Consolas,monospace;font-size:13px;background:#eef2f9;border-radius:4px;padding:3px 8px;color:#374668;margin-bottom:16px;direction:ltr}.instruction{font-size:13px;color:#374668;background:#f0f5fc;border-radius:6px;padding:10px 14px;margin:0 0 20px;line-height:1.6}.actions{display:flex;gap:10px}.btn{font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;padding:8px 18px;border-radius:6px;border:none;cursor:pointer}.btn-primary{background:#2563eb;color:#fff;font-weight:600}.btn-primary:hover{background:#1d4ed8}.btn-secondary{background:#f0f5fc;color:#374668}.btn-secondary:hover{background:#dae4f3}</style>
</head><body><div class="card"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none"/></svg>
<h1>{{safeTitle}}</h1><p class="detail">{{safeDetails}}</p><code class="url">{{safeUrl}}</code>
<p class="instruction">تحقق من تشغيل خادم SELRS وإمكانية الوصول إليه من هذا الجهاز.</p>
<div class="actions"><button class="btn btn-primary" onclick="window.chrome.webview.postMessage('retry')">إعادة المحاولة</button><button class="btn btn-secondary" onclick="window.chrome.webview.postMessage('chooser')">تغيير الخادم</button></div></div></body></html>
""";
        Text = "SELRS Desktop - Offline";
        try { if (webView.CoreWebView2 != null) { webView.NavigateToString(html); return; } } catch (Exception ex) { LogError("Failed to render error page", ex); }
        var label = new Label { Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, Padding = new Padding(40), Font = new Font("Segoe UI", 11F), ForeColor = Color.FromArgb(17, 28, 48), BackColor = Color.FromArgb(248, 250, 252), Text = $"{title}{Environment.NewLine}{Environment.NewLine}{details}{Environment.NewLine}{_homeUrl}" };
        Controls.Remove(webView); Controls.Add(label); label.BringToFront();
    }

    private static void LogError(string message, Exception? exception)
    {
        try
        {
            var logPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SELRSDesktop", "error.log");
            Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
            File.AppendAllText(logPath, $"[{DateTime.Now}] {message}{Environment.NewLine}{exception}{Environment.NewLine}");
        }
        catch { System.Diagnostics.Debug.WriteLine($"{message}: {exception}"); }
    }

    private static string NormalizeUri(string? uri)
    {
        if (string.IsNullOrWhiteSpace(uri)) return string.Empty;
        return Uri.TryCreate(uri, UriKind.Absolute, out var parsed) ? parsed.ToString() : uri.Trim();
    }
}
