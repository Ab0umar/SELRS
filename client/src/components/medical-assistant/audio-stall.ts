export function hasOutgoingAudioStalled({
  now,
  startedAt,
  lastPcmAt,
  lastPacketAt,
}: {
  now: number;
  startedAt: number;
  lastPcmAt?: number;
  lastPacketAt?: number;
}) {
  if (lastPcmAt === undefined || now - lastPcmAt > 1000) return false;
  return lastPacketAt === undefined
    ? now - startedAt >= 12000
    : now - lastPacketAt >= 8000;
}
