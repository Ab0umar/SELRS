using System;
using System.Collections.Generic;
using System.Data.OleDb;
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

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_ReadAllUserID(int handle);

    [DllImport("FKAttend.dll", CallingConvention = CallingConvention.StdCall)]
    public static extern int FK_GetAllUserID(int handle, ref int enrollNo, ref int backupNum, ref int privilege, ref int enable);
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
        string mdbPath  = GetArg(args, "--mdb",  @"D:\Programs\fp\Taurus.mdb");
        string outPath  = GetArg(args, "--out",  @"E:\users.csv");

        var dir = Path.GetDirectoryName(Path.GetFullPath(outPath));
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        // Step 1: read names from Taurus.mdb
        var names = new Dictionary<int, string>();
        if (File.Exists(mdbPath))
        {
            try
            {
                // try ACE first, fall back to Jet
                string[] providers = { "Microsoft.ACE.OLEDB.12.0", "Microsoft.Jet.OLEDB.4.0" };
                OleDbConnection mdbConn = null;
                foreach (var prov in providers)
                {
                    try
                    {
                        mdbConn = new OleDbConnection(string.Format("Provider={0};Data Source={1};", prov, mdbPath));
                        mdbConn.Open();
                        break;
                    }
                    catch { mdbConn = null; }
                }
                if (mdbConn != null)
                {
                    using (mdbConn)
                    using (var cmd = mdbConn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT EmpNo, EmpName FROM RS_Emp";
                        using (var rdr = cmd.ExecuteReader())
                        {
                            while (rdr.Read())
                            {
                                int no;
                                if (int.TryParse(rdr["EmpNo"].ToString(), out no))
                                {
                                    string nm = (rdr["EmpName"] ?? "").ToString().Trim();
                                    if (!string.IsNullOrEmpty(nm))
                                        names[no] = nm;
                                }
                            }
                        }
                    }
                    Console.WriteLine("MDB names loaded: {0}", names.Count);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("MDB read failed: {0}", ex.Message);
            }
        }
        else
        {
            Console.WriteLine("MDB not found at: {0}", mdbPath);
        }

        // Step 2: get enrollNos from device
        var deviceIds = new HashSet<int>();
        Console.WriteLine("Connecting {0}:{1} machine={2} protocol={3}", ip, port, machineNo, protocol);
        int handle = FK.FK_ConnectNet(machineNo, ip, port, timeout, protocol, password, license);
        Console.WriteLine("Handle: {0}", handle);
        if (handle > 0)
        {
            try
            {
                int total = FK.FK_ReadAllUserID(handle);
                Console.WriteLine("FK_ReadAllUserID => {0}", total);
                while (true)
                {
                    int en = 0, bk = 0, priv = 0, ena = 0;
                    if (FK.FK_GetAllUserID(handle, ref en, ref bk, ref priv, ref ena) <= 0) break;
                    if (en > 0) deviceIds.Add(en);
                }
                Console.WriteLine("Device IDs: {0}", deviceIds.Count);
            }
            finally
            {
                try { FK.FK_EnableDevice(handle, 1); } catch { }
                FK.FK_DisConnect(handle);
            }
        }
        else
        {
            Console.WriteLine("Device connect failed — using MDB only");
        }

        // Step 3: union of both sources
        var allIds = new HashSet<int>(deviceIds);
        foreach (var id in names.Keys) allIds.Add(id);
        Console.WriteLine("Total unique IDs: {0}", allIds.Count);

        // Step 4: write CSV
        using (var writer = new StreamWriter(outPath, false, new UTF8Encoding(false)))
        {
            writer.WriteLine("EnrollNo,Name");
            foreach (var id in allIds)
            {
                string name = names.ContainsKey(id) ? names[id].Replace(",", " ") : "";
                writer.WriteLine("{0},{1}", id, name);
            }
        }

        Console.WriteLine("Done. Rows: {0}", allIds.Count);
        return 0;
    }

    private static string GetArg(string[] args, string name, string defaultValue)
    {
        for (int i = 0; i < args.Length - 1; i++)
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        return defaultValue;
    }
}
