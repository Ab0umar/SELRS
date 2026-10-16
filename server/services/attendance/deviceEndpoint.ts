type FingerprintDevice = "fk" | "zk";

export function getDeviceEndpoint(device: FingerprintDevice) {
  const ip =
    device === "fk"
      ? process.env.ATTENDANCE_DEVICE_IP
      : process.env.ZK_DEVICE_IP || process.env.ZK4370_IP;
  const portText =
    device === "fk"
      ? process.env.ATTENDANCE_DEVICE_PORT
      : process.env.ZK_DEVICE_PORT || process.env.ZK4370_PORT;
  const port = portText?.trim() ? Number(portText) : 0;
  if (
    portText?.trim() &&
    (!Number.isInteger(port) || port < 1 || port > 65535)
  ) {
    throw new Error(
      `${device.toUpperCase()} device port must be an integer from 1 to 65535 in env`,
    );
  }
  return { ip: ip?.trim() ?? "", port };
}

export function requireDeviceEndpoint(device: FingerprintDevice) {
  const endpoint = getDeviceEndpoint(device);
  if (!endpoint.ip || !endpoint.port) {
    const prefix = device === "fk" ? "ATTENDANCE_DEVICE" : "ZK_DEVICE";
    throw new Error(
      `Configure ${prefix}_IP and ${prefix}_PORT in this server's env`,
    );
  }
  return endpoint;
}
