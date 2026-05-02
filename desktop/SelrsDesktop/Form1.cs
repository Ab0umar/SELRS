using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SelrsDesktop;

/// <summary>
/// Main form for the SELRS Desktop application, providing a WebView2-based shell
/// for browsing a configured web application with custom window chrome and navigation controls.
/// </summary>
public partial class Form1 : Form
{
    private const string DefaultHomeUrl = "http://192.168.0.100:4000";
    private static readonly (string id, string label, string url)[] UrlPresets = [
        ("local", "Local (192.168.0.100:4000)", "http://192.168.0.100:4000"),
        ("online", "Online (op.selrs.cc)", "https://op.selrs.cc"),
    ];
    private readonly string _homeUrl;
    private readonly string _userDataDir;
    private string _currentUrl;
    private string _lastUri = string.Empty;
    private const int WmNclbuttondown = 0xA1;
    private const int HtCaption = 0x2;
    private const int TopBarExpandedHeight = 40;
    private readonly System.Windows.Forms.Timer _topBarTimer = new() { Interval = 150 };
    private DateTime _lastTopEdgeHoverUtc = DateTime.UtcNow;

    public Form1()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL");
        var savedUrl = LoadSavedUrl();
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
        if (webView != null)
        {
            // Only navigate to _homeUrl here if not already set by other means
            webView.NavigationCompleted += (_, _) =>
            {
                // Optionally, handle post-navigation logic here
            };
            if (webView.CoreWebView2 != null)
            {
                webView.CoreWebView2.ContextMenuRequested += HandleContextMenuRequested;
                webView.CoreWebView2.Navigate(_homeUrl);
            }
            else
            {
                webView.CoreWebView2InitializationCompleted += (_, e) =>
                {
                    if (e.IsSuccess && webView.CoreWebView2 != null)
                    {
                        webView.CoreWebView2.ContextMenuRequested += HandleContextMenuRequested;
                        webView.CoreWebView2.Navigate(_homeUrl);
                    }
                };
            }
        }
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

    private void HandleNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
            // Do not call UpdateMaximizeButtonText() here, as it is also called on the Resize event,
            // which may be triggered by navigation failures and could cause infinite recursion.
        var message = $"Navigation failed.\nError: {e.WebErrorStatus}\nURL: {webView.Source}";
        Text = "SELRS Desktop - Offline";
        MessageBox.Show(message, "SELRS Desktop", MessageBoxButtons.OK, MessageBoxIcon.Warning);
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

    private void HandleShown(object? sender, EventArgs e)
    {
        // Set initial window size and position
        Width = 1200;
        Height = 800;
        StartPosition = FormStartPosition.CenterScreen;
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
}