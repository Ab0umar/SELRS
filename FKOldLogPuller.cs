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
    public static extern int FK_LoadGeneralLogData(int handle, int readMark);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetGeneralLogData_1(
        int handle,
        ref int enrollNo,
        ref int verifyMode,
        ref int inOutMode,
        ref int year,
        ref int month,
        ref int day,
        ref int hour,
        ref int minute,
        ref int second);

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
        int timeout = int.Parse(GetArg(args, "--timeout", "5000"), CultureInfo.InvariantCulture);
        int protocol = int.Parse(GetArg(args, "--protocol", "0"), CultureInfo.InvariantCulture);
        int readMark = int.Parse(GetArg(args, "--readmark", "0"), CultureInfo.InvariantCulture);
        string outPath = GetArg(args, "--out", @"D:\Programs\fp\old_device_logs.csv");

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outPath)));

        Console.WriteLine("Connecting {0}:{1}, machine={2}, password={3}, protocol={4}, license={5}", ip, port, machineNo, password, protocol, license);
        int handle = FK.FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license);
        Console.WriteLine("Handle: {0}", handle);
        if (handle <= 0)
        {
            Console.Error.WriteLine("Connect failed. Try --protocol 1, check same subnet/firewall, or verify Net Pwd.");
            return 2;
        }

        try
        {
            SafeCall("FK_EnableDevice(false)", FK.FK_EnableDevice(handle, 0), handle, false);

            int load = FK.FK_LoadGeneralLogData(handle, readMark);
            Console.WriteLine("FK_LoadGeneralLogData({0}) => {1}, lastError={2}", readMark, load, FK.FK_GetLastError(handle));
            if (load < 0)
            {
                Console.Error.WriteLine("Load failed.");
                return 3;
            }

            int count = 0;
            using (var writer = new StreamWriter(outPath, false, new UTF8Encoding(false)))
            {
                writer.WriteLine("EnrollNo,VerifyMode,InOutMode,LogDateTime,Year,Month,Day,Hour,Minute,Second");

                while (true)
                {
                    int enroll = 0, verify = 0, inout = 0, y = 0, m = 0, d = 0, h = 0, min = 0, s = 0;
                    int rc = FK.FK_GetGeneralLogData_1(handle, ref enroll, ref verify, ref inout, ref y, ref m, ref d, ref h, ref min, ref s);

                    if (rc == 0)
                    {
                        break;
                    }
                    if (rc < 0)
                    {
                        Console.WriteLine("FK_GetGeneralLogData_1 => {0}, lastError={1}", rc, FK.FK_GetLastError(handle));
                        break;
                    }

                    string dt = "";
                    try
                    {
                        dt = new DateTime(y, m, d, h, min, s).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                    }
                    catch
                    {
                        dt = string.Format(CultureInfo.InvariantCulture, "{0:D4}-{1:D2}-{2:D2} {3:D2}:{4:D2}:{5:D2}", y, m, d, h, min, s);
                    }

                    writer.WriteLine("{0},{1},{2},{3},{4},{5},{6},{7},{8},{9}",
                        enroll, verify, inout, dt, y, m, d, h, min, s);
                    count++;

                    if (count % 1000 == 0)
                    {
                        Console.WriteLine("Rows: {0}", count);
                    }
                }
            }

            Console.WriteLine("Done. Rows: {0}", count);
            Console.WriteLine("CSV: {0}", outPath);
            return 0;
        }
        finally
        {
            try { FK.FK_EnableDevice(handle, 1); } catch { }
            FK.FK_DisConnect(handle);
        }
    }

    private static void SafeCall(string name, int result, int handle, bool fail)
    {
        if (result < 0)
        {
            Console.WriteLine("{0} => {1}, lastError={2}", name, result, FK.FK_GetLastError(handle));
            if (fail) throw new InvalidOperationException(name + " failed");
        }
    }

    private static string GetArg(string[] args, string name, string defaultValue)
    {
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                return args[i + 1];
            }
        }
        return defaultValue;
    }
}
