using System;
using System.Windows.Forms;
namespace SelrsDesktop;

static class Program
{
    [STAThread]
    static void Main()
    {
#if NETFRAMEWORK
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new Form1());
#else
        ApplicationConfiguration.Initialize();
        Application.Run(new Form1());
#endif
    }
}
