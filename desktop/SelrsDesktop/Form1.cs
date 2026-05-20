using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SelrsDesktop;

/// <summary>
/// Main form for the SELRS Desktop application, providing a WebView2-based shell
/// for browsing a configured web application with custom window chrome and navigation controls.
/// </summary>
public partial class Form1 : Form
{
    private const string DefaultHomeUrl = "http://192.168.1.100:4000";
    private static readonly (string id, string label, string url)[] UrlPresets = [
        ("local", "Local (localhost:4000)", "http://192.168.1.100:4000"),
        ("lan", "LAN (192.168.0.100:4000)", "http://192.168.0.100:4000"),
        ("online", "Online (op.selrs.cc)", "https://op.selrs.cc"),
    ];
    private string _homeUrl;
    private readonly string _userDataDir;
    private string _currentUrl;
    private string _lastUri = string.Empty;
    private readonly bool _hasSavedUrl;
    private const int WmNclbuttondown = 0xA1;
    private const int HtCaption = 0x2;
    private const int TopBarExpandedHeight = 40;
    private readonly System.Windows.Forms.Timer _topBarTimer = new() { Interval = 150 };
    private DateTime _lastTopEdgeHoverUtc = DateTime.UtcNow;

    public Form1()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL");
        var savedUrl = LoadSavedUrl();
        _hasSavedUrl = !string.IsNullOrWhiteSpace(savedUrl);
        _homeUrl = NormalizeHomeUrl(configuredUrl ?? savedUrl);
        _currentUrl = _homeUrl;
        _userDataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SELRSDesktop",
            "WebView2");
        InitializeComponent();
        try
        {
            Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        }
        catch (Exception ex)
        {
            // Log the exception for troubleshooting
            try
            {
                var logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SELRSDesktop",
                    "error.log");
                Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
                File.AppendAllText(logPath, $"[{DateTime.Now}] Failed to set icon: {ex}\n");
            }
            catch
            {
                // As a fallback, write to debug output
                System.Diagnostics.Debug.WriteLine($"Failed to set icon: {ex}");
            }
        }
        KeyPreview = true;
        KeyDown += HandleKeyDown;
        Shown += HandleShown;
        var chromeMode = (Environment.GetEnvironmentVariable("SELRS_WINDOW_CHROME") ?? "").Trim().ToLowerInvariant();
        var forceModernChrome = chromeMode == "modern" || chromeMode == "borderless";
#if NETFRAMEWORK
        if (forceModernChrome)
        {
            EnableModernBorderlessShell();
        }
        else
        {
            // Win7 default: use native window chrome to avoid rendering artifacts with custom borderless shell.
            FormBorderStyle = FormBorderStyle.Sizable;
            ControlBox = true;
            MinimizeBox = true;
            MaximizeBox = true;
            topBar.Visible = false;
            topBar.Height = 0;
            DoubleBuffered = true;
        }
#else
        if (forceModernChrome)
        {
            EnableModernBorderlessShell();
        }
        else
        {
            // Optionally, handle the case for non-modern chrome if needed.
            FormBorderStyle = FormBorderStyle.Sizable;
            ControlBox = true;
            MinimizeBox = true;
            MaximizeBox = true;
            topBar.Visible = false;
            topBar.Height = 0;
            DoubleBuffered = true;
        }
#endif
    }

    private void EnableModernBorderlessShell()
    {
        FormBorderStyle = FormBorderStyle.None;
        if (topBar != null)
        {
            topBar.Visible = false;
            topBar.MouseMove += HandleAnyMouseMove;
            topBar.MouseDown += HandleTopBarMouseDown;
        }
        MouseMove += HandleAnyMouseMove;
        if (webView != null)
        {
            webView.MouseMove += HandleAnyMouseMove;
        }
        if (titleLabel != null)
        {
            // Removed call to UpdateMaximizeButtonIcon() as it is not defined.
        }
        if (btnMinimize != null)
        {
            btnMinimize.Click += (_, _) => WindowState = FormWindowState.Minimized;
        }
        if (btnMaximize != null)
        {
            btnMaximize.Click += (_, _) =>
            {
                WindowState = WindowState == FormWindowState.Maximized
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
            };
        }
        if (btnClose != null)
        {
            btnClose.Click += (_, _) => Close();
        }
        Resize += (_, _) => UpdateMaximizeButtonText();
        _topBarTimer.Tick += (_, _) => HandleTopBarAutoHideTick();
        _topBarTimer.Start();
    }

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    private void HandleTopBarMouseDown(object? sender, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        ReleaseCapture();
        SendMessage(Handle, WmNclbuttondown, HtCaption, 0);
    }

    private void HandleAnyMouseMove(object? sender, MouseEventArgs e)
    {
        var clientPoint = PointToClient(Cursor.Position);
        if (clientPoint.Y <= 3 || (topBar.Visible && clientPoint.Y <= TopBarExpandedHeight + 6))
        {
            _lastTopEdgeHoverUtc = DateTime.UtcNow;
            ShowTopBar();
        }
    }

    private void HandleTopBarAutoHideTick()
    {
        var clientPoint = PointToClient(Cursor.Position);
        var overTopArea = clientPoint.Y <= TopBarExpandedHeight + 6;
        if (clientPoint.Y <= 3)
        {
            _lastTopEdgeHoverUtc = DateTime.UtcNow;
            ShowTopBar();
            return;
        }
        if (!topBar.Visible) return;
        if (overTopArea)
        {
            _lastTopEdgeHoverUtc = DateTime.UtcNow;
            return;
        }
        topBar.Height = 0;
        topBar.Visible = false;
    }

    private void HideTopBar()
    {
        if (!topBar.Visible) return;
        topBar.Height = 0;
        topBar.Visible = false;
    }

private void UpdateMaximizeButtonText()
{
    // Update the maximize button's text/icon depending on the window state
    if (btnMaximize != null)
    {
        btnMaximize.Text = WindowState == FormWindowState.Maximized ? "❐" : "□";
        // Optionally, set an icon or tooltip here as well
    }
}

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
            {
                throw new InvalidOperationException("WebView2 initialized without CoreWebView2.");
            }

            webView.CoreWebView2.ContextMenuRequested += HandleContextMenuRequested;
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
            Text = "SELRS Desktop";
            return;
        }

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
        {
            e.Cancel = true;
            return;
        }

        _lastUri = e.Uri;
    }

    private static string NormalizeHomeUrl(string? value)
    {
        var candidate = string.IsNullOrWhiteSpace(value) ? DefaultHomeUrl : value.Trim();
        if (!candidate.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !candidate.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            candidate = $"https://{candidate}";
        }
        return Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
            ? uri.ToString()
            : DefaultHomeUrl;
    }

    private string LoadSavedUrl()
    {
        try
        {
            var configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SELRSDesktop",
                "url_config.txt");
            if (File.Exists(configPath))
            {
                var saved = File.ReadAllText(configPath).Trim();
                return string.IsNullOrWhiteSpace(saved) ? "" : saved;
            }
        }
        catch { }
        return "";
    }

    private void SaveUrl(string url)
    {
        try
        {
            var configDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SELRSDesktop");
            Directory.CreateDirectory(configDir);
            var configPath = Path.Combine(configDir, "url_config.txt");
            File.WriteAllText(configPath, url);
        }
        catch { }
    }

    private bool ShowStartupUrlChooser()
    {
        using var dialog = new Form
        {
            Text = "Choose SELRS connection",
            StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedDialog,
            MinimizeBox = false,
            MaximizeBox = false,
            ShowInTaskbar = false,
            ClientSize = new Size(420, 260)
        };

        var title = new Label
        {
            Text = "Choose where SELRS should open",
            Font = new Font("Segoe UI", 11F, FontStyle.Bold),
            AutoSize = false,
            Location = new Point(20, 18),
            Size = new Size(380, 26)
        };

        var group = new Panel
        {
            Location = new Point(20, 56),
            Size = new Size(380, 126)
        };

        var buttons = new RadioButton[UrlPresets.Length];
        for (var i = 0; i < UrlPresets.Length; i++)
        {
            var preset = UrlPresets[i];
            var button = new RadioButton
            {
                Text = preset.label,
                Tag = preset.url,
                AutoSize = false,
                Location = new Point(0, i * 38),
                Size = new Size(360, 28),
                Checked = NormalizeHomeUrl(preset.url) == _currentUrl
            };
            buttons[i] = button;
            group.Controls.Add(button);
        }

        var hasCheckedButton = false;
        foreach (var button in buttons)
        {
            if (!button.Checked) continue;
            hasCheckedButton = true;
            break;
        }

        if (!hasCheckedButton)
        {
            buttons[0].Checked = true;
        }

        var openButton = new Button
        {
            Text = "Open",
            DialogResult = DialogResult.OK,
            Location = new Point(220, 206),
            Size = new Size(84, 32)
        };
        var cancelButton = new Button
        {
            Text = "Cancel",
            DialogResult = DialogResult.Cancel,
            Location = new Point(316, 206),
            Size = new Size(84, 32)
        };

        dialog.AcceptButton = openButton;
        dialog.CancelButton = cancelButton;
        dialog.Controls.Add(title);
        dialog.Controls.Add(group);
        dialog.Controls.Add(openButton);
        dialog.Controls.Add(cancelButton);

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return false;
        }

        string? selected = null;
        foreach (var button in buttons)
        {
            if (!button.Checked) continue;
            selected = button.Tag?.ToString();
            break;
        }
        if (string.IsNullOrWhiteSpace(selected))
        {
            return false;
        }

        var normalized = NormalizeHomeUrl(selected);
        _homeUrl = normalized;
        _currentUrl = normalized;
        SaveUrl(normalized);
        return true;
    }

    private void SwitchUrl(string newUrl)
    {
        var normalized = NormalizeHomeUrl(newUrl);
        if (normalized == _currentUrl) return;
        _currentUrl = normalized;
        SaveUrl(normalized);
        if (webView.CoreWebView2 != null)
        {
            webView.CoreWebView2.Navigate(normalized);
        }
        else
        {
            MessageBox.Show(
                "WebView is not initialized yet. Please try again in a moment.",
                "Navigation Error",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
    }

    private void ShowUrlSwitchMenu(CoreWebView2ContextMenuRequestedEventArgs args)
    {
        args.Handled = true;
        var menu = new ContextMenuStrip();
        foreach (var (id, label, url) in UrlPresets)
        {
            var item = new ToolStripMenuItem(label);
            if (NormalizeHomeUrl(url) == _currentUrl)
                item.Checked = true;
            item.Click += (_, _) => SwitchUrl(url);
            menu.Items.Add(item);
        }
        menu.Closed += (s, e) => menu.Dispose();
        menu.Show(webView, new System.Drawing.Point((int)args.Location.X, (int)args.Location.Y));
    }

    private void HandleKeyDown(object? sender, KeyEventArgs e)
    {
        // Handle escape key to close context menus or exit fullscreen
        if (e.KeyCode == Keys.Escape)
        {
            e.Handled = true;
        }
    }

    private async void HandleShown(object? sender, EventArgs e)
    {
        // Set initial window size and position
        Width = 1200;
        Height = 800;
        StartPosition = FormStartPosition.CenterScreen;
        if (!_hasSavedUrl &&
            string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL")) &&
            !ShowStartupUrlChooser())
        {
            Close();
            return;
        }

        await InitializeWebViewAsync();
    }

    private void HandleContextMenuRequested(object? sender, CoreWebView2ContextMenuRequestedEventArgs e)
    {
        ShowUrlSwitchMenu(e);
    }

    private void ShowTopBar()
    {
        if (topBar.Visible) return;
        topBar.Visible = true;
        topBar.Height = TopBarExpandedHeight;
    }

    private static string NormalizeUri(string? uri)
    {
        if (string.IsNullOrWhiteSpace(uri)) return string.Empty;
        if (Uri.TryCreate(uri, UriKind.Absolute, out var parsed))
        {
            return parsed.ToString();
        }
        return uri.Trim();
    }

    private void ShowStartupErrorPage(string title, string details)
    {
        var safeTitle = WebUtility.HtmlEncode(title);
        var safeDetails = WebUtility.HtmlEncode(details);
        var safeUrl = WebUtility.HtmlEncode(_homeUrl);
        var html = $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #172033;
      background: #f5f7fb;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    main {
      width: min(680px, calc(100vw - 48px));
      background: #fff;
      border: 1px solid #d8dee9;
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, .08);
    }
    h1 {
      font-size: 22px;
      margin: 0 0 12px;
    }
    p {
      margin: 8px 0;
      line-height: 1.5;
    }
    code {
      background: #eef2f7;
      border-radius: 4px;
      padding: 2px 5px;
    }
  </style>
</head>
<body>
  <main>
    <h1>{{safeTitle}}</h1>
    <p>{{safeDetails}}</p>
    <p>Configured URL: <code>{{safeUrl}}</code></p>
    <p>Check that the SELRS server is running and reachable from this machine.</p>
  </main>
</body>
</html>
""";

        Text = "SELRS Desktop - Offline";
        try
        {
            if (webView.CoreWebView2 != null)
            {
                webView.NavigateToString(html);
                return;
            }
        }
        catch (Exception ex)
        {
            LogError("Failed to render startup error page", ex);
        }

        var label = new Label
        {
            Dock = DockStyle.Fill,
            TextAlign = System.Drawing.ContentAlignment.MiddleCenter,
            Padding = new Padding(32),
            Text = $"{title}{Environment.NewLine}{details}{Environment.NewLine}{_homeUrl}"
        };
        Controls.Remove(webView);
        Controls.Add(label);
        label.BringToFront();
    }

    private static void LogError(string message, Exception? exception)
    {
        try
        {
            var logPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SELRSDesktop",
                "error.log");
            Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
            File.AppendAllText(logPath, $"[{DateTime.Now}] {message}{Environment.NewLine}{exception}{Environment.NewLine}");
        }
        catch
        {
            System.Diagnostics.Debug.WriteLine($"{message}: {exception}");
        }
    }
}
