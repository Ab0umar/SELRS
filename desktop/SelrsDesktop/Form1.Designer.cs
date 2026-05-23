namespace SelrsDesktop;

partial class Form1
{
    /// <summary>
    ///  Required designer variable.
    /// </summary>
    private System.ComponentModel.IContainer components = null;

    /// <summary>
    ///  Clean up any resources being used.
    /// </summary>
    /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
        {
            components.Dispose();
        }
        base.Dispose(disposing);
    }

    #region Windows Form Designer generated code

    /// <summary>
    ///  Required method for Designer support - do not modify
    ///  the contents of this method with the code editor.
    /// </summary>
    private void InitializeComponent()
    {
        this.topBar = new System.Windows.Forms.Panel();
        this.btnMinimize = new System.Windows.Forms.Button();
        this.btnMaximize = new System.Windows.Forms.Button();
        this.btnClose = new System.Windows.Forms.Button();
        this.titleLabel = new System.Windows.Forms.Label();
        this.webView = new Microsoft.Web.WebView2.WinForms.WebView2();
        this.topBar.SuspendLayout();
        ((System.ComponentModel.ISupportInitialize)(this.webView)).BeginInit();
        this.SuspendLayout();
        // 
        // topBar
        // 
        this.topBar.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(248)))), ((int)(((byte)(250)))), ((int)(((byte)(252)))));
        this.topBar.Controls.Add(this.titleLabel);
        this.topBar.Controls.Add(this.btnMinimize);
        this.topBar.Controls.Add(this.btnMaximize);
        this.topBar.Controls.Add(this.btnClose);
        this.topBar.Dock = System.Windows.Forms.DockStyle.Top;
        this.topBar.Location = new System.Drawing.Point(0, 0);
        this.topBar.Name = "topBar";
        this.topBar.Size = new System.Drawing.Size(1280, 40);
        this.topBar.TabIndex = 0;
        // 
        // btnMinimize
        // 
        this.btnMinimize.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(248)))), ((int)(((byte)(250)))), ((int)(((byte)(252)))));
        this.btnMinimize.Dock = System.Windows.Forms.DockStyle.Right;
        this.btnMinimize.FlatAppearance.BorderSize = 0;
        this.btnMinimize.FlatAppearance.MouseDownBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(210)))), ((int)(((byte)(222)))), ((int)(((byte)(240)))));
        this.btnMinimize.FlatAppearance.MouseOverBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(229)))), ((int)(((byte)(236)))), ((int)(((byte)(246)))));
        this.btnMinimize.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
        this.btnMinimize.Font = new System.Drawing.Font("Segoe UI Semibold", 11F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
        this.btnMinimize.ForeColor = System.Drawing.Color.FromArgb(((int)(((byte)(50)))), ((int)(((byte)(65)))), ((int)(((byte)(90)))));
        this.btnMinimize.Location = new System.Drawing.Point(1144, 0);
        this.btnMinimize.Name = "btnMinimize";
        this.btnMinimize.Size = new System.Drawing.Size(44, 40);
        this.btnMinimize.TabIndex = 0;
        this.btnMinimize.Text = "–";
        this.btnMinimize.UseVisualStyleBackColor = false;
        // 
        // btnMaximize
        // 
        this.btnMaximize.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(248)))), ((int)(((byte)(250)))), ((int)(((byte)(252)))));
        this.btnMaximize.Dock = System.Windows.Forms.DockStyle.Right;
        this.btnMaximize.FlatAppearance.BorderSize = 0;
        this.btnMaximize.FlatAppearance.MouseDownBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(210)))), ((int)(((byte)(222)))), ((int)(((byte)(240)))));
        this.btnMaximize.FlatAppearance.MouseOverBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(229)))), ((int)(((byte)(236)))), ((int)(((byte)(246)))));
        this.btnMaximize.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
        this.btnMaximize.Font = new System.Drawing.Font("Segoe UI", 10F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
        this.btnMaximize.ForeColor = System.Drawing.Color.FromArgb(((int)(((byte)(50)))), ((int)(((byte)(65)))), ((int)(((byte)(90)))));
        this.btnMaximize.Location = new System.Drawing.Point(1188, 0);
        this.btnMaximize.Name = "btnMaximize";
        this.btnMaximize.Size = new System.Drawing.Size(44, 40);
        this.btnMaximize.TabIndex = 1;
        this.btnMaximize.Text = "□";
        this.btnMaximize.UseVisualStyleBackColor = false;
        // 
        // btnClose
        // 
        this.btnClose.BackColor = System.Drawing.Color.FromArgb(((int)(((byte)(248)))), ((int)(((byte)(250)))), ((int)(((byte)(252)))));
        this.btnClose.Dock = System.Windows.Forms.DockStyle.Right;
        this.btnClose.FlatAppearance.BorderSize = 0;
        this.btnClose.FlatAppearance.MouseDownBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(185)))), ((int)(((byte)(28)))), ((int)(((byte)(28)))));
        this.btnClose.FlatAppearance.MouseOverBackColor = System.Drawing.Color.FromArgb(((int)(((byte)(220)))), ((int)(((byte)(38)))), ((int)(((byte)(38)))));
        this.btnClose.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
        this.btnClose.Font = new System.Drawing.Font("Segoe UI Semibold", 10F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
        this.btnClose.ForeColor = System.Drawing.Color.FromArgb(((int)(((byte)(50)))), ((int)(((byte)(65)))), ((int)(((byte)(90)))));
        this.btnClose.Location = new System.Drawing.Point(1232, 0);
        this.btnClose.Name = "btnClose";
        this.btnClose.Size = new System.Drawing.Size(48, 40);
        this.btnClose.TabIndex = 2;
        this.btnClose.Text = "×";
        this.btnClose.UseVisualStyleBackColor = false;
        // 
        // titleLabel
        // 
        this.titleLabel.AutoSize = true;
        this.titleLabel.Font = new System.Drawing.Font("Segoe UI Semibold", 10F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
        this.titleLabel.ForeColor = System.Drawing.Color.FromArgb(((int)(((byte)(17)))), ((int)(((byte)(28)))), ((int)(((byte)(48)))));
        this.titleLabel.Location = new System.Drawing.Point(14, 11);
        this.titleLabel.Name = "titleLabel";
        this.titleLabel.Size = new System.Drawing.Size(42, 15);
        this.titleLabel.TabIndex = 3;
        this.titleLabel.Text = "SELRS";
        // 
        // webView
        // 
        this.webView.AllowExternalDrop = false;
        this.webView.CreationProperties = null;
        this.webView.DefaultBackgroundColor = System.Drawing.Color.White;
        this.webView.Dock = System.Windows.Forms.DockStyle.Fill;
        this.webView.Location = new System.Drawing.Point(0, 40);
        this.webView.Name = "webView";
        this.webView.Size = new System.Drawing.Size(1280, 760);
        this.webView.TabIndex = 1;
        this.webView.ZoomFactor = 1D;
        // 
        // Form1
        // 
        this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
        this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
        this.ClientSize = new System.Drawing.Size(1280, 800);
        this.Controls.Add(this.webView);
        this.Controls.Add(this.topBar);
        this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.None;
        this.Name = "Form1";
        this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
        this.Text = "SELRS";
        this.WindowState = System.Windows.Forms.FormWindowState.Maximized;
        this.topBar.ResumeLayout(false);
        this.topBar.PerformLayout();
        ((System.ComponentModel.ISupportInitialize)(this.webView)).EndInit();
        this.ResumeLayout(false);
    }

    #endregion

    private System.Windows.Forms.Panel topBar;
    private System.Windows.Forms.Button btnMinimize;
    private System.Windows.Forms.Button btnMaximize;
    private System.Windows.Forms.Button btnClose;
    private System.Windows.Forms.Label titleLabel;
    private Microsoft.Web.WebView2.WinForms.WebView2 webView;
}
