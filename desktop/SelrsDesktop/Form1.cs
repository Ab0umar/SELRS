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

#nullable enable

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
    private const int TopBarExpandedHeight = 44;
    private readonly System.Windows.Forms.Timer _topBarTimer = new() { Interval = 150 };
    private DateTime _lastTopEdgeHoverUtc = DateTime.UtcNow;

    private static readonly Color ShellBg = Color.FromArgb(246, 248, 252);
    private static readonly Color PanelBg = Color.FromArgb(253, 254, 255);
    private static readonly Color SurfaceBg = Color.FromArgb(241, 245, 251);
    private static readonly Color BorderColor = Color.FromArgb(214, 224, 239);
    private static readonly Color TextPrimary = Color.FromArgb(24, 38, 61);
    private static readonly Color TextMuted = Color.FromArgb(94, 108, 132);
    private static readonly Color PrimaryBlue = Color.FromArgb(37, 99, 235);
    private static readonly Color PrimaryBlueHover = Color.FromArgb(29, 78, 216);
    private static readonly Color BrandOrange = Color.FromArgb(255, 107, 53);

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
        else EnableFullScreenShell();
#else
        if (forceModernChrome) EnableModernBorderlessShell();
        else EnableFullScreenShell();
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
            // Auto-grant notification permission so web push works natively.
            // Also force-set via Profile API to override any cached denial.
            webView.CoreWebView2.PermissionRequested += (_, e) =>
            {
                if (e.PermissionKind == CoreWebView2PermissionKind.Notifications)
                    e.State = CoreWebView2PermissionState.Allow;
            };
            try
            {
                var origin = new Uri(_homeUrl).GetLeftPart(UriPartial.Authority);
                await webView.CoreWebView2.Profile.SetPermissionStateAsync(
                    CoreWebView2PermissionKind.Notifications,
                    origin,
                    CoreWebView2PermissionState.Allow);
            }
            catch { /* SetPermissionStateAsync unavailable on older runtimes — ignore */ }
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
        var candidate = string.IsNullOrWhiteSpace(value) ? DefaultHomeUrl : value!.Trim();
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

    private static Label CreateLabel(string text, Font font, Color color, Point location, Size size, ContentAlignment align = ContentAlignment.MiddleRight)
    {
        return new Label
        {
            Text = text,
            Font = font,
            ForeColor = color,
            BackColor = Color.Transparent,
            AutoSize = false,
            Location = location,
            Size = size,
            TextAlign = align,
        };
    }

    private static void StyleButton(Button button, bool primary)
    {
        button.FlatStyle = FlatStyle.Flat;
        button.UseVisualStyleBackColor = false;
        button.Font = new Font("Segoe UI", 9.5F, primary ? FontStyle.Bold : FontStyle.Regular);
        button.ForeColor = primary ? Color.FromArgb(253, 254, 255) : Color.FromArgb(54, 71, 98);
        button.BackColor = primary ? PrimaryBlue : PanelBg;
        button.FlatAppearance.BorderSize = primary ? 0 : 1;
        button.FlatAppearance.BorderColor = BorderColor;
        button.FlatAppearance.MouseOverBackColor = primary ? PrimaryBlueHover : Color.FromArgb(232, 238, 248);
        button.FlatAppearance.MouseDownBackColor = primary ? Color.FromArgb(30, 64, 175) : Color.FromArgb(218, 228, 243);
    }

    private static Panel CreateServerOption(RadioButton radio, string url, int y)
    {
        var panel = new Panel
        {
            BackColor = PanelBg,
            Location = new Point(22, y),
            Size = new Size(496, 58),
            Cursor = Cursors.Hand,
        };
        panel.Paint += (_, e) =>
        {
            var border = radio.Checked ? PrimaryBlue : BorderColor;
            using var pen = new Pen(border, radio.Checked ? 2 : 1);
            var rect = new Rectangle(0, 0, panel.Width - 1, panel.Height - 1);
            e.Graphics.DrawRectangle(pen, rect);
            if (radio.Checked)
            {
                using var brush = new SolidBrush(Color.FromArgb(255, 241, 232));
                e.Graphics.FillRectangle(brush, panel.Width - 7, 0, 7, panel.Height);
            }
        };

        radio.BackColor = Color.Transparent;
        radio.ForeColor = TextPrimary;
        radio.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
        radio.Location = new Point(18, 9);
        radio.Size = new Size(456, 22);
        radio.RightToLeft = RightToLeft.Yes;

        var urlLabel = CreateLabel(url, new Font("Consolas", 8.5F), TextMuted, new Point(18, 32), new Size(456, 18));
        urlLabel.RightToLeft = RightToLeft.No;

        panel.Controls.Add(radio);
        panel.Controls.Add(urlLabel);
        panel.Click += (_, _) => radio.Checked = true;
        urlLabel.Click += (_, _) => radio.Checked = true;
        radio.CheckedChanged += (_, _) => panel.Invalidate();
        return panel;
    }

    // ── URL chooser dialog ────────────────────────────────────────────────────
    private bool ShowStartupUrlChooser()
    {
        using var dialog = new Form
        {
            Text = "SELRS",
            StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedSingle,
            MinimizeBox = false,
            MaximizeBox = false,
            ShowInTaskbar = false,
            ClientSize = new Size(540, 472),
            BackColor = ShellBg,
            RightToLeft = RightToLeft.Yes,
            RightToLeftLayout = true,
        };

        var header = new Panel { BackColor = PanelBg, Location = new Point(0, 0), Size = new Size(540, 112) };
        header.Paint += (_, e) =>
        {
            using var pen = new Pen(BorderColor);
            e.Graphics.DrawLine(pen, 0, header.Height - 1, header.Width, header.Height - 1);
        };
        var brandMark = new Panel { BackColor = BrandOrange, Location = new Point(464, 28), Size = new Size(38, 38) };
        var lblTitle = CreateLabel("اختيار خادم SELRS", new Font("Segoe UI", 15F, FontStyle.Bold), TextPrimary, new Point(30, 24), new Size(420, 28));
        var lblSubtitle = CreateLabel("اختر نقطة الاتصال المناسبة لهذا الجهاز. سيتم حفظ الاختيار للمرات القادمة.", new Font("Segoe UI", 9.5F), TextMuted, new Point(30, 58), new Size(420, 24));
        header.Controls.AddRange([brandMark, lblTitle, lblSubtitle]);

        var radios = new RadioButton[UrlPresets.Length];
        for (var i = 0; i < UrlPresets.Length; i++)
        {
            var preset = UrlPresets[i];
            var rb = new RadioButton
            {
                Text = preset.label,
                Tag = preset.url,
                Checked = NormalizeHomeUrl(preset.url) == _currentUrl,
                AutoSize = false,
            };
            radios[i] = rb;
            dialog.Controls.Add(CreateServerOption(rb, preset.url, 126 + i * 64));
        }
        if (!radios.Any(r => r.Checked)) radios[0].Checked = true;

        var current = CreateLabel($"الاتصال الحالي: {_currentUrl}", new Font("Segoe UI", 8.75F), TextMuted, new Point(22, 396), new Size(496, 20), ContentAlignment.MiddleLeft);
        current.RightToLeft = RightToLeft.No;

        var btnCancel = new Button { Text = "إلغاء", DialogResult = DialogResult.Cancel, Size = new Size(92, 36), Location = new Point(22, 424) };
        StyleButton(btnCancel, primary: false);

        var btnOpen = new Button { Text = "فتح الاتصال", DialogResult = DialogResult.OK, Size = new Size(120, 36), Location = new Point(398, 424) };
        StyleButton(btnOpen, primary: true);

        dialog.AcceptButton = btnOpen; dialog.CancelButton = btnCancel;
        dialog.Controls.AddRange([header, current, btnCancel, btnOpen]);

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
    private void EnableFullScreenShell()
    {
        FormBorderStyle = FormBorderStyle.None;
        ControlBox = false;
        MinimizeBox = false;
        MaximizeBox = false;
        DoubleBuffered = true;
        WindowState = FormWindowState.Normal;
        Bounds = Screen.FromControl(this).Bounds;
        Shown += (_, _) => Bounds = Screen.FromControl(this).Bounds;
        EnableAutoHideTopBar();
    }

    private void EnableModernBorderlessShell()
    {
        FormBorderStyle = FormBorderStyle.None;
        BackColor = ShellBg;
        EnableAutoHideTopBar();
    }

    private void EnableAutoHideTopBar()
    {
        BackColor = ShellBg;
        if (titleLabel != null)
        {
            titleLabel.Text = "SELRS Desktop";
            titleLabel.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            titleLabel.ForeColor = TextPrimary;
        }
        if (topBar != null) topBar.BackColor = PanelBg;
        StyleChromeButton(btnMinimize, danger: false);
        StyleChromeButton(btnMaximize, danger: false);
        StyleChromeButton(btnClose, danger: true);
        if (topBar != null) { topBar.Visible = false; topBar.MouseMove += HandleAnyMouseMove; topBar.MouseDown += HandleTopBarMouseDown; }
        MouseMove += HandleAnyMouseMove;
        if (webView != null) webView.MouseMove += HandleAnyMouseMove;
        if (btnMinimize != null) btnMinimize.Click += (_, _) => WindowState = FormWindowState.Minimized;
        if (btnMaximize != null) btnMaximize.Click += (_, _) => WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
        if (btnClose != null) { btnClose.Click += (_, _) => Close(); btnClose.MouseEnter += (_, _) => btnClose.ForeColor = Color.FromArgb(253, 254, 255); btnClose.MouseLeave += (_, _) => btnClose.ForeColor = TextPrimary; }
        if (topBar != null) topBar.Paint += (_, pe) => { using var pen = new Pen(BorderColor); pe.Graphics.DrawLine(pen, 0, topBar.Height - 1, topBar.Width - 1, topBar.Height - 1); };
        Resize += (_, _) => UpdateMaximizeButtonText();
        _topBarTimer.Tick += (_, _) => HandleTopBarAutoHideTick();
        _topBarTimer.Start();
    }

    private static void StyleChromeButton(Button button, bool danger)
    {
        if (button == null) return;
        button.BackColor = PanelBg;
        button.ForeColor = TextPrimary;
        button.FlatAppearance.BorderSize = 0;
        button.FlatAppearance.MouseOverBackColor = danger ? Color.FromArgb(220, 38, 38) : Color.FromArgb(232, 238, 248);
        button.FlatAppearance.MouseDownBackColor = danger ? Color.FromArgb(185, 28, 28) : Color.FromArgb(218, 228, 243);
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
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:#f6f8fc;color:#18263d;min-height:100vh;display:grid;place-items:center;padding:32px}
.shell{width:min(720px,100%);background:#fdfeff;border:1px solid #d6e0ef;border-radius:8px;overflow:hidden}
.head{display:flex;align-items:center;gap:14px;padding:22px 26px;border-bottom:1px solid #d6e0ef;background:#fbfcff}
.mark{width:38px;height:38px;background:#ff6b35;flex:0 0 auto}
.eyebrow{font-size:12px;font-weight:700;color:#2563eb;margin:0 0 2px}
h1{font-size:20px;font-weight:700;margin:0;line-height:1.35}
.body{padding:24px 26px 26px}
.detail{font-size:13px;color:#5e6c84;margin:0 0 14px;line-height:1.7}
.url{display:block;direction:ltr;text-align:left;font-family:Consolas,"Courier New",monospace;font-size:13px;background:#f1f5fb;border:1px solid #d6e0ef;border-radius:6px;padding:9px 11px;color:#364762;margin:0 0 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.checks{margin:0 0 22px;padding:12px 16px;background:#fff5ef;border:1px solid #ffd9c8;border-radius:6px;color:#5e412e;font-size:13px;line-height:1.7}
.actions{display:flex;gap:10px;justify-content:flex-start}
.btn{font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;min-width:112px;padding:9px 18px;border-radius:6px;border:1px solid transparent;cursor:pointer}
.btn-primary{background:#2563eb;color:#fdfeff;font-weight:700}.btn-primary:hover{background:#1d4ed8}
.btn-secondary{background:#fdfeff;color:#364762;border-color:#d6e0ef}.btn-secondary:hover{background:#e8eef8}
</style>
</head>
<body>
<main class="shell">
<section class="head">
<div class="mark" aria-hidden="true"></div>
<div><p class="eyebrow">SELRS Desktop</p><h1>{{safeTitle}}</h1></div>
</section>
<section class="body">
<p class="detail">{{safeDetails}}</p>
<code class="url">{{safeUrl}}</code>
<p class="checks">تحقق من تشغيل خادم SELRS، ومن اتصال الجهاز بنفس الشبكة، ثم أعد المحاولة أو اختر خادما آخر.</p>
<div class="actions"><button class="btn btn-primary" onclick="window.chrome.webview.postMessage('retry')">إعادة المحاولة</button><button class="btn btn-secondary" onclick="window.chrome.webview.postMessage('chooser')">تغيير الخادم</button></div>
</section>
</main>
</body>
</html>
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
        return Uri.TryCreate(uri, UriKind.Absolute, out var parsed) ? parsed.ToString() : uri!.Trim();
    }
}
