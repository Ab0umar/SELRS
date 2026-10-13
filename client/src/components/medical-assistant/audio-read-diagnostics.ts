type AudioNode = { read: () => Promise<unknown> };
type Source = { attach: (id: string) => Promise<AudioNode> };
export function observeAudioReads(source: unknown) {
  const stats = { requested: 0, completed: 0, rejected: 0, pending: 0 };
  if (!source || typeof (source as Partial<Source>).attach !== "function")
    return { stats, available: false, dispose: () => {} };
  const target = source as Source;
  const original = target.attach;
  const nodes = new Map<AudioNode, AudioNode["read"]>();
  let disposed = false;
  const wrapped: Source["attach"] = async function (this: Source, id) {
    const node = await original.call(this, id);
    if (disposed) return node;
    const read = node.read;
    nodes.set(node, read);
    node.read = function () {
      stats.requested++;
      stats.pending++;
      try {
        return read.call(this).then(
          (result) => {
            stats.completed++;
            stats.pending--;
            return result;
          },
          (error) => {
            stats.rejected++;
            stats.pending--;
            throw error;
          },
        );
      } catch (error) {
        stats.rejected++;
        stats.pending--;
        throw error;
      }
    };
    return node;
  };
  target.attach = wrapped;
  return {
    stats,
    available: true,
    dispose() {
      disposed = true;
      if (target.attach === wrapped) target.attach = original;
      for (const [node, read] of nodes) node.read = read;
      nodes.clear();
    },
  };
}

export function speechLoopState(recognizer: unknown) {
  try {
    const session = (
      recognizer as {
        internalData?: {
          privRequestSession?: {
            isRecognizing?: boolean;
            isSpeechEnded?: boolean;
          };
        };
      }
    )?.internalData?.privRequestSession;
    if (!session) return "Unavailable";
    return `Recognizing: ${String(session.isRecognizing)} · Speech ended: ${String(session.isSpeechEnded)}`;
  } catch {
    return "Unavailable";
  }
}
