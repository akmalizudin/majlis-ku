// Formats MediaRecorder can produce, best first. The server converts every one of them to AAC (.m4a).
const CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

export function pickRecorderMime(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of CANDIDATES) {
    try {
      if (isTypeSupported(type)) return type;
    } catch {
      return null;
    }
  }
  return null;
}