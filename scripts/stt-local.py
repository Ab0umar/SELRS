import argparse
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description="Transcribe Arabic recordings locally without API credits.")
    parser.add_argument("audio_dir", type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="ar")
    args = parser.parse_args()
    if not args.audio_dir.is_dir():
        parser.error("Audio directory does not exist")
    extensions = {".mp3", ".m4a", ".wav", ".webm", ".ogg", ".mp4", ".mpeg", ".mpga"}
    files = sorted(p for p in args.audio_dir.iterdir() if p.is_file() and p.suffix.lower() in extensions)
    if not files:
        parser.error("No supported audio files found")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        parser.exit(1, "Install the dependency first: python -m pip install faster-whisper\n")
    print(f"Loading {args.model}; the first run downloads model files.", flush=True)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    output = args.audio_dir / "_results_local"
    output.mkdir(exist_ok=True)
    summary = [f"# Local Whisper ({args.model})\n"]
    failed = 0
    for recording in files:
        print(f"Transcribing {recording.name} ...", flush=True)
        try:
            segments, _ = model.transcribe(str(recording), language=args.language, beam_size=5, vad_filter=True)
            transcript = "\n".join(segment.text.strip() for segment in segments)
            if not transcript.strip():
                raise ValueError("No speech detected")
            (output / f"{recording.name}.whisper.txt").write_text(transcript, encoding="utf-8")
            summary.append(f"## {recording.name}\n\n{transcript}\n")
            print(f"OK: {recording.name}", flush=True)
        except Exception as error:
            failed += 1
            summary.append(f"## {recording.name}\n\nFAILED: {error}\n")
            print(f"FAILED: {recording.name}: {error}", file=sys.stderr)
    (output / "summary.md").write_text("\n".join(summary), encoding="utf-8")
    print(f"Succeeded: {len(files) - failed}; failed: {failed}. Results: {output / 'summary.md'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
