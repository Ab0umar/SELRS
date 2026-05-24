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

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetLastError(int handle);

    // Load all user IDs — returns count or error
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_ReadAllUserID(int handle);

    // Iterate through loaded users (returns 1 while records remain, 0 when done)
    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetAllUserID(int handle, ref int enrollNo, ref int backupNum, ref int privilege, ref int enable);

    // Get name for a specific enrollNo
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

        Console.WriteLine("Connecting {0}:{1} machine={2} protocol={3} license={4}", ip, port, machineNo, protocol, license);
        int handle = FK.FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license);
        Console.WriteLine("Handle: {0}", handle);
        if (handle <= 0)
        {
            Console.Error.WriteLine("Connect failed. lastError=" + FK.FK_GetLastError(handle));
            return 2;
        }

        try
        {
            int total = FK.FK_ReadAllUserID(handle);
            Console.WriteLine("FK_ReadAllUserID => {0}, lastError={1}", total, FK.FK_GetLastError(handle));
            if (total < 0)
            {
                Console.Error.WriteLine("ReadAllUserID failed.");
                return 3;
            }

            int count = 0;
            using (var writer = new StreamWriter(outPath, false, new UTF8Encoding(false)))
            {
                writer.WriteLine("EnrollNo,Name,Privilege,Enable");

                while (true)
                {
                    int enrollNo = 0, backupNum = 0, privilege = 0, enable = 0;
                    int rc = FK.FK_GetAllUserID(handle, ref enrollNo, ref backupNum, ref privilege, ref enable);
                    if (rc <= 0) break;

                    var nameBuf = new byte[64];
                    FK.FK_GetUserName(handle, enrollNo, nameBuf);
                    var name = Encoding.Default.GetString(nameBuf).Split('\0')[0].Trim().Replace(",", " ");

                    writer.WriteLine("{0},{1},{2},{3}",
                        enrollNo,
                        name,
                        privilege,
                        enable);
                    count++;
                }
            }

            Console.WriteLine("Done. Users: {0}", count);
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
