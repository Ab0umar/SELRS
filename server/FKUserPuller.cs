using System;
using System.Collections.Generic;
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

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetLastError(int handle);

    // Punch log functions (known to work)
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_LoadGeneralLogData(int handle, int readMark);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetGeneralLogData_1(
        int handle, ref int enrollNo, ref int verifyMode, ref int inOutMode,
        ref int year, ref int month, ref int day, ref int hour, ref int minute, ref int second);

    // User info functions
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_ReadAllUserID(int handle);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetAllUserID(int handle, ref int enrollNo, ref int backupNum, ref int privilege, ref int enable);

    // Try ANSI byte[] buffer
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetUserName(int handle, int enrollNo, [Out] byte[] name);
}

internal sealed class Program
{
    private static int Main(string[] args)
    {
        string ip       = GetArg(args, "--ip",       "192.168.0.10");
        int    port     = int.Parse(GetArg(args, "--port",     "5005"),  CultureInfo.InvariantCulture);
        int    machineNo= int.Parse(GetArg(args, "--machine",  "1"),     CultureInfo.InvariantCulture);
        int    password = int.Parse(GetArg(args, "--password", "0"),     CultureInfo.InvariantCulture);
        int    license  = int.Parse(GetArg(args, "--license",  "1261"),  CultureInfo.InvariantCulture);
        int    timeout  = int.Parse(GetArg(args, "--timeout",  "10000"), CultureInfo.InvariantCulture);
        int    protocol = int.Parse(GetArg(args, "--protocol", "0"),     CultureInfo.InvariantCulture);
        string outPath  = GetArg(args, "--out", @"E:\users.csv");

        var dir = Path.GetDirectoryName(Path.GetFullPath(outPath));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        Console.WriteLine("Connecting {0}:{1} machine={2} protocol={3}", ip, port, machineNo, protocol);
        int handle = FK.FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license);
        Console.WriteLine("Handle: {0}", handle);
        if (handle <= 0)
        {
            Console.Error.WriteLine("Connect failed. lastError=" + FK.FK_GetLastError(handle));
            return 2;
        }

        try
        {
            // Step 1: collect all enrollNos from punch logs (reliable)
            var allIds = new HashSet<int>();
            int load = FK.FK_LoadGeneralLogData(handle, 0);
            Console.WriteLine("FK_LoadGeneralLogData => {0}", load);
            if (load >= 0)
            {
                while (true)
                {
                    int en = 0, vm = 0, io = 0, y = 0, mo = 0, d = 0, h = 0, mi = 0, s = 0;
                    int rc = FK.FK_GetGeneralLogData_1(handle, ref en, ref vm, ref io, ref y, ref mo, ref d, ref h, ref mi, ref s);
                    if (rc <= 0) break;
                    if (en > 0) allIds.Add(en);
                }
            }
            Console.WriteLine("Unique enrollNos from punch logs: {0}", allIds.Count);

            // Step 2: collect names from user registry
            var names = new Dictionary<int, string>();
            int total = FK.FK_ReadAllUserID(handle);
            Console.WriteLine("FK_ReadAllUserID => {0}", total);
            if (total >= 0)
            {
                while (true)
                {
                    int en = 0, bk = 0, priv = 0, ena = 0;
                    int rc = FK.FK_GetAllUserID(handle, ref en, ref bk, ref priv, ref ena);
                    if (rc <= 0) break;
                    allIds.Add(en); // also add registered-but-never-punched users

                    // Try getting name — attempt multiple encodings
                    var buf = new byte[128];
                    int nr = FK.FK_GetUserName(handle, en, buf);
                    if (nr >= 0)
                    {
                        // Try Windows-1256 (Arabic) first, fall back to Default
                        string n = "";
                        try { n = Encoding.GetEncoding(1256).GetString(buf).Split('\0')[0].Trim(); } catch { }
                        if (string.IsNullOrEmpty(n))
                            n = Encoding.Default.GetString(buf).Split('\0')[0].Trim();
                        if (!string.IsNullOrEmpty(n))
                            names[en] = n;
                    }
                }
            }
            Console.WriteLine("Users with names: {0}, total unique IDs: {1}", names.Count, allIds.Count);

            // Step 3: write CSV
            int count = 0;
            using (var writer = new StreamWriter(outPath, false, new UTF8Encoding(false)))
            {
                writer.WriteLine("EnrollNo,Name");
                foreach (var id in allIds)
                {
                    string name = names.ContainsKey(id) ? names[id].Replace(",", " ") : "";
                    writer.WriteLine("{0},{1}", id, name);
                    count++;
                }
            }

            Console.WriteLine("Done. Rows: {0}", count);
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
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        return defaultValue;
    }
}
