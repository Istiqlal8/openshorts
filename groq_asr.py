"""Groq Whisper transcription (TRANSCRIBE_BACKEND=groq).

Offloads ASR to Groq's hosted whisper so a CPU-only host does not spend the
length of the video transcribing. Returns the same transcript contract as
transcribe_backends.transcribe_media() (see that module's docstring).

Audio is extracted as 16 kHz mono MP3 and split into chunks small enough for
Groq's upload limit; each chunk's timestamps are shifted by the measured
duration of the chunks before it, so words keep absolute file timestamps.
"""
import glob
import os
import subprocess
import tempfile

import requests

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3")
# 30 min at 32 kbps mono is ~7 MB, well under the 25 MB free-tier upload cap.
CHUNK_SECONDS = 1800

_LANG_CODES = {
    "indonesian": "id", "english": "en", "malay": "ms", "arabic": "ar",
    "javanese": "jw", "sundanese": "su", "spanish": "es", "portuguese": "pt",
    "french": "fr", "german": "de", "japanese": "ja", "chinese": "zh",
    "korean": "ko", "hindi": "hi", "turkish": "tr",
}


def _extract_chunks(media_path, out_dir):
    pattern = os.path.join(out_dir, "chunk%03d.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", media_path, "-vn", "-ac", "1",
         "-ar", "16000", "-b:a", "32k", "-f", "segment",
         "-segment_time", str(CHUNK_SECONDS), pattern],
        check=True, timeout=1800,
    )
    return sorted(glob.glob(os.path.join(out_dir, "chunk*.mp3")))


def _duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True, timeout=60, check=True,
    )
    return float(out.stdout.strip())


def _request_chunk(path, api_key):
    data = [
        ("model", GROQ_MODEL),
        ("response_format", "verbose_json"),
        ("timestamp_granularities[]", "word"),
        ("timestamp_granularities[]", "segment"),
    ]
    language = os.environ.get("GROQ_LANGUAGE", "").strip()
    if language:
        data.append(("language", language))
    with open(path, "rb") as fh:
        resp = requests.post(
            GROQ_URL, headers={"Authorization": f"Bearer {api_key}"},
            data=data, files={"file": (os.path.basename(path), fh, "audio/mpeg")},
            timeout=600,
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def _attach_words(segments, words):
    """Give each segment the words whose start falls inside it."""
    i = 0
    for seg_index, seg in enumerate(segments):
        is_last = seg_index == len(segments) - 1
        while i < len(words) and (is_last or words[i]["start"] < seg["end"]):
            seg["words"].append(words[i])
            i += 1
    return segments


def _shift_chunk(result, offset):
    words = [
        {"word": " " + w["word"].strip(), "start": float(w["start"]) + offset,
         "end": float(w["end"]) + offset}
        for w in result.get("words") or [] if w.get("word", "").strip()
    ]
    segments = [
        {"start": float(s["start"]) + offset, "end": float(s["end"]) + offset,
         "text": s.get("text", ""), "words": []}
        for s in result.get("segments") or []
    ]
    return _attach_words(segments, words)


def _language_code(name, text):
    code = _LANG_CODES.get((name or "").strip().lower())
    if code:
        return code
    if name and len(name) == 2:
        return name.lower()
    try:
        import py3langid
        return py3langid.classify((text or "")[:4000])[0]
    except Exception:
        return "en"


def transcribe_with_groq(media_path):
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    segments, language_name, offset = [], None, 0.0
    with tempfile.TemporaryDirectory(prefix="groq_asr_") as tmp:
        for chunk in _extract_chunks(media_path, tmp):
            result = _request_chunk(chunk, api_key)
            language_name = language_name or result.get("language")
            segments.extend(_shift_chunk(result, offset))
            offset += _duration(chunk)
    segments = [s for s in segments if s["words"] or s["text"].strip()]
    text = " ".join(s["text"].strip() for s in segments if s["text"].strip())
    return {
        "text": text,
        "language": _language_code(language_name, text),
        "segments": segments,
    }
