export async function startPcmCapture(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
  write: (bytes: ArrayBuffer) => void,
  onError: () => void,
) {
  if (context.sampleRate !== 16000)
    throw new Error("Browser could not provide 16 kHz audio.");
  await context.audioWorklet.addModule(
    `${import.meta.env.BASE_URL}medical-pcm-worklet.js`,
  );
  const node = new AudioWorkletNode(context, "clinic-pcm-capture", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 1,
    channelCountMode: "explicit",
  });
  const mute = context.createGain();
  mute.gain.value = 0;
  node.port.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) write(event.data);
  };
  node.onprocessorerror = onError;
  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);
  return () => {
    node.port.onmessage = null;
    node.onprocessorerror = null;
    node.port.close();
    source.disconnect(node);
    node.disconnect();
    mute.disconnect();
  };
}
