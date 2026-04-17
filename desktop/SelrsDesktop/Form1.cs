using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SelrsDesktop;

public partial class Form1 : Form
{
    private const string DefaultHomeUrl = "http://192.168.0.100:4000";
    private readonly string _homeUrl;
    private readonly string _userDataDir;
    private string _lastUri = string.Empty;
    private const int WmNclbuttondown = 0xA1;
    private const int HtCaption = 0x2;
    private const int TopBarExpandedHeight = 40;
    private readonly System.Windows.Forms.Timer _topBarTimer = new() { Interval = 150 };
    private DateTime _lastTopEdgeHoverUtc = DateTime.UtcNow;

    public Form1()
    {
        var configuredUrl = Environment.GetEnvironmentVariable("SELRS_DESKTOP_URL");
        _homeUrl = NormalizeHomeUrl(configuredUrl);
        _userDataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SELRSDesktop",
            "WebView2");
        InitializeComponent();
        try { Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch {}
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
        EnableModernBorderlessShell();
#endif
    }

    private void EnableModernBorderlessShell()
    {
        FormBorderStyle = FormBorderStyle.None;
        topBar.Height = 0;
        topBar.Visible = false;
        MouseMove += HandleAnyMouseMove;
        webView.MouseMove += HandleAnyMouseMove;
        topBar.MouseMove += HandleAnyMouseMove;
        topBar.MouseDown += HandleTopBarMouseDown;
        titleLabel.MouseDown += HandleTopBarMouseDown;
        btnMinimize.Click += (_, _) => WindowState = FormWindowState.Minimized;
        btnMaximize.Click += (_, _) =>
        {
            WindowState = WindowState == FormWindowState.Maximized
                ? FormWindowState.Normal
                : FormWindowState.Maximized;
        };
        btnClose.Click += (_, _) => Close();
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
        if (!topBar.Visible) return;
        var clientPoint = PointToClient(Cursor.Position);
        var overTopArea = clientPoint.Y <= TopBarExpandedHeight + 6;
        if (overTopArea)
        {
            _lastTopEdgeHoverUtc = DateTime.UtcNow;
            return;
        }
        if ((DateTime.UtcNow - _lastTopEdgeHoverUtc).TotalMilliseconds < 700) return;
        HideTopBar();
    }

    private void ShowTopBar()
    {
        if (topBar.Visible && topBar.Height == TopBarExpandedHeight) return;
        topBar.Visible = true;
        topBar.Height = TopBarExpandedHeight;
    }

    private void HideTopBar()
    {
        if (!topBar.Visible) return;
        topBar.Height = 0;
        topBar.Visible = false;
    }

    private void UpdateMaximizeButtonText()
    {
        btnMaximize.Text = WindowState == FormWindowState.Maximized ? "[]" : "[ ]";
    }

    private async void HandleShown(object? sender, EventArgs e)
    {
        try
        {
            UpdateMaximizeButtonText();
            Directory.CreateDirectory(_userDataDir);
            CoreWebView2Environment env;
#if NETFRAMEWORK
            // Win7 fallback: force software rendering path for more stable composition.
            var options = new CoreWebView2EnvironmentOptions("--disable-gpu");
            env = await CoreWebView2Environment.CreateAsync(null, _userDataDir, options);
#else
            env = await CoreWebView2Environment.CreateAsync(null, _userDataDir);
#endif
            await webView.EnsureCoreWebView2Async(env);
            var currentUa = webView.CoreWebView2.Settings.UserAgent ?? string.Empty;
            if (currentUa.IndexOf("SELRSDesktop/1", StringComparison.OrdinalIgnoreCase) < 0)
            {
                webView.CoreWebView2.Settings.UserAgent = string.IsNullOrWhiteSpace(currentUa)
                    ? "SELRSDesktop/1"
                    : $"{currentUa} SELRSDesktop/1";
            }
            await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync("""
                (() => {
                  try {
                    window.__SELRS_DESKTOP = true;
                    const guard = (name) => {
                      try {
                        const loc = window.location;
                        const proto = Object.getPrototypeOf(loc);
                        const original = (loc[name] && loc[name].bind(loc)) || (proto[name] && proto[name].bind(loc));
                        if (!original) return;
                        const wrapped = (...args) => {
                          if (window.__allowReloadOnce === true) {
                            window.__allowReloadOnce = false;
                            return original(...args);
                          }
                          console.warn("[SELRS Desktop] blocked location." + name, args);
                        };
                        try { Object.defineProperty(loc, name, { value: wrapped, configurable: true }); } catch {}
                        try { Object.defineProperty(proto, name, { value: wrapped, configurable: true }); } catch {}
                      } catch {}
                    };
                    guard("reload");
                    guard("assign");
                    guard("replace");
                    window.addEventListener("beforeunload", (e) => {
                      if (window.__allowReloadOnce === true) return;
                      e.preventDefault();
                      e.returnValue = "";
                    }, true);
                    const ssPrefix = "__selrs_ss__";
                    try {
                      for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k || !k.startsWith(ssPrefix)) continue;
                        const sk = k.substring(ssPrefix.length);
                        const sv = localStorage.getItem(k);
                        if (sv != null && sessionStorage.getItem(sk) == null) {
                          sessionStorage.setItem(sk, sv);
                        }
                      }
                    } catch {}
                    window.setInterval(() => {
                      try {
                        for (let i = 0; i < sessionStorage.length; i++) {
                          const sk = sessionStorage.key(i);
                          if (!sk) continue;
                          const sv = sessionStorage.getItem(sk);
                          if (sv != null) {
                            localStorage.setItem(ssPrefix + sk, sv);
                          }
                        }
                      } catch {}
                    }, 1200);
                  } catch {}
                })();
                """);
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            webView.CoreWebView2.NavigationStarting += HandleNavigationStarting;
            webView.CoreWebView2.NewWindowRequested += (_, args) =>
            {
                args.Handled = true;
                if (!string.IsNullOrWhiteSpace(args.Uri))
                {
                    webView.CoreWebView2.Navigate(args.Uri);
                }
            };
            webView.CoreWebView2.NavigationCompleted += HandleNavigationCompleted;
            webView.CoreWebView2.Navigate(_homeUrl);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Failed to initialize SELRS desktop shell.\n{ex.Message}",
                "SELRS Desktop",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }

    private void HandleNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess) return;
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
        _lastUri = e.Uri;
    }

    private void HandleKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F5 || (e.Control && e.KeyCode == Keys.R))
        {
            e.SuppressKeyPress = true;
            e.Handled = true;
        }
    }

    private static string NormalizeUri(string value)
    {
        try
        {
            var uri = new Uri(value);
            var path = uri.AbsolutePath.TrimEnd('/');
            return $"{uri.Scheme}://{uri.Host}{(uri.IsDefaultPort ? "" : ":" + uri.Port)}{path}{uri.Query}";
        }
        catch
        {
            return value.Trim().TrimEnd('/');
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
}
