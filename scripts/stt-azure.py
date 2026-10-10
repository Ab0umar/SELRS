import argparse
import os
from pathlib import Path
import sys
import threading
import time


def transcribe(path, key, region):
    import azure.cognitiveservices.speech as speech
    from faster_whisper.audio import decode_audio

    audio = decode_audio(str(path))
    stream = speech.audio.PushAudioInputStream(
        stream_format=speech.audio.AudioStreamFormat(samples_per_second=16000, bits_per_sample=16, channels=1)
    )
    config = speech.SpeechConfig(subscription=key, region=region)
    config.speech_recognition_language = "ar-EG"
    recognizer = speech.SpeechRecognizer(
        speech_config=config,
        audio_config=speech.audio.AudioConfig(stream=stream),
    )
    finished = threading.Event()
    lines = []
    errors = []

    def recognized(event):
        if event.result.reason == speech.ResultReason.RecognizedSpeech:
            lines.append(event.result.text)
            print(f"Recognized segment {len(lines)}", flush=True)

    def canceled(event):
        if event.reason == speech.CancellationReason.Error:
            errors.append(event.error_details)
        finished.set()

    recognizer.recognized.connect(recognized)
    recognizer.canceled.connect(canceled)
    recognizer.session_stopped.connect(lambda event: finished.set())
    started = time.perf_counter()
    stream_closed = False
    recognition_started = False
    try:
        recognizer.start_continuous_recognition_async().get()
        recognition_started = True
        stream.write((audio.clip(-1, 1) * 32767).astype("<i2").tobytes())
        stream.close()
        stream_closed = True
        if not finished.wait(timeout=max(120, len(audio) / 16000 * 2 + 60)):
            raise TimeoutError("Azure recognition timed out")
    finally:
        if not stream_closed:
            stream.close()
        if recognition_started:
            recognizer.stop_continuous_recognition_async().get()
    if errors:
        raise RuntimeError("; ".join(errors))
    if not lines:
        raise ValueError("No speech recognized")
    return "\n".join(lines), time.perf_counter() - started, len(audio) / 16000


def main():
    parser = argparse.ArgumentParser(description="Test Azure Egyptian Arabic transcription on recorded audio.")
    parser.add_argument("audio_dir", type=Path)
    args = parser.parse_args()
    try:
        from dotenv import load_dotenv
        import azure.cognitiveservices.speech
        from faster_whisper.audio import decode_audio
    except ImportError:
        parser.exit(1, 'Install: python -m pip install azure-cognitiveservices-speech python-dotenv faster-whisper "av<19"\n')
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    key = os.environ.get("AZURE_SPEECH_KEY", "").strip()
    region = os.environ.get("AZURE_SPEECH_REGION", "").strip()
    if not key or not region:
        parser.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the project's .env")
    if not args.audio_dir.is_dir():
        parser.error("Audio directory does not exist")
    extensions = {".mp3", ".m4a", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga", ".flac"}
    files = sorted(p for p in args.audio_dir.iterdir() if p.is_file() and p.suffix.lower() in extensions)
    if not files:
        parser.error("No supported audio files found")
    output = args.audio_dir / "_results_azure"
    output.mkdir(exist_ok=True)
    summary = ["# Azure Speech comparison (ar-EG)\n"]
    failed = 0
    for recording in files:
        print(f"Transcribing {recording.name} ...", flush=True)
        try:
            text, elapsed, duration = transcribe(recording, key, region)
            (output / f"{recording.name}.azure.txt").write_text(text, encoding="utf-8")
            summary.append(f"## {recording.name}\n\nRecognition time: {elapsed:.2f} seconds; audio duration: {duration:.2f} seconds\n\n{text}\n")
            print(f"OK: {elapsed:.2f} seconds", flush=True)
        except Exception as error:
            failed += 1
            summary.append(f"## {recording.name}\n\nFAILED: {error}\n")
            print(f"FAILED: {recording.name}: {error}", file=sys.stderr)
    (output / "summary.md").write_text("\n".join(summary), encoding="utf-8")
    print(f"Succeeded: {len(files) - failed}; failed: {failed}. Results: {output / 'summary.md'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
