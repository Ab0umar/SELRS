class ClinicPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(1600);
    this.offset = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel)
      for (let i = 0; i < channel.length; i++) {
        const sample = Math.max(-1, Math.min(1, channel[i]));
        this.buffer[this.offset++] = Math.round(
          sample * (sample < 0 ? 32768 : 32767),
        );
        if (this.offset === this.buffer.length) {
          const bytes = new ArrayBuffer(this.buffer.length * 2);
          const view = new DataView(bytes);
          for (let j = 0; j < this.buffer.length; j++)
            view.setInt16(j * 2, this.buffer[j], true);
          this.port.postMessage(bytes, [bytes]);
          this.offset = 0;
        }
      }
    return true;
  }
}
registerProcessor("clinic-pcm-capture", ClinicPcmCapture);
