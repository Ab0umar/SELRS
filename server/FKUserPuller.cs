using System;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

internal static class FK
{
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int FK_ConnectNet(int machineNo, string ip, int port, int timeout, int protocol, int password, int license);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern void FK_DisConnect(int handle);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_EnableDevice(int handle, int enable);

    // Load all user records into device buffer
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_LoadUserInfo(int handle);

    // Iterate through loaded user records (returns 1 while records remain, 0 when done)
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
    public static extern int FK_GetUserInfo_1(
        int handle,
        ref int enrollNo,
        ref int privilege,
        ref int enable,
        StringBuilder name,
        StringBuilder password);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetLastError(int handle);
}

internal sealed class Program
{
    private static int Main(string[] args)
    {
        string ip = GetArg(args, "--ip", "192.168.0.10");
        int port = int.Parse(GetArg(args, "--port", "5005"), CultureInfo.InvariantCulture);
        int machineNo = int.Parse(GetArg(args, "--machine", "1"), CultureInfo.InvariantCulture);
        int password = int.Parse(GetArg(args, "--password", "0"), CultureInfo.InvariantCulture);
        int license = int.Parse(GetArg(args, "--license", "1261"), CultureInfo.InvariantCulture);
        int timeout = int.Parse(GetArg(args, "--timeout", "10000"), CultureInfo.InvariantCulture);
        int protocol = int.Parse(GetArg(args, "--protocol", "0"), CultureInfo.InvariantCulture);
        string outPath = GetArg(args, "--out", @"E:\users.csv");

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outPath)));

        Console.WriteLine("Connecting {0}:{1}, machine={2}, password={3}, protocol={4}, license={5}", ip, port, machineNo, password, protocol, license);
        int handle = FK.FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license);
        Console.WriteLine("Handle: {0}", handle);
        if (handle <= 0)
        {
            Console.Error.WriteLine("Connect failed.");
            return 2;
        }

        try
        {
            int load = FK.FK_LoadUserInfo(handle);
            Console.WriteLine("FK_LoadUserInfo => {0}, lastError={1}", load, FK.FK_GetLastError(handle));
            if (load < 0)
            {
                Console.Error.WriteLine("LoadUserInfo failed.");
                return 3;
            }

            int count = 0;
            using (var writer = new StreamWriter(outPath, false, new UTF8Encoding(false)))
            {
                writer.WriteLine("EnrollNo,Name,Privilege,Enable");

                while (true)
                {
                    int enrollNo = 0, privilege = 0, enable = 0;
                    var name = new StringBuilder(64);
                    var pwd = new StringBuilder(32);

                    int rc = FK.FK_GetUserInfo_1(handle, ref enrollNo, ref privilege, ref enable, name, pwd);
                    if (rc <= 0) break;

                    writer.WriteLine("{0},{1},{2},{3}",
                        enrollNo,
                        name.ToString().Replace(",", " "),
                        privilege,
                        enable);
                    count++;
                }
            }

            Console.WriteLine("Done. Users: {0}", count);
            Console.WriteLine("CSV: {0}", outPath);
            return 0;
        }
        finally
        {
            try { FK.FK_EnableDevice(handle, 1); } catch { }
            FK.FK_DisConnect(handle);
        }
    }

    private static string GetArg(string[] args, string name, string defaultValue)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }
        return defaultValue;
    }
}
