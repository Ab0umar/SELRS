export function releaseSpeechResources(actions: Array<(() => void) | undefined>) {
  for (const action of actions) {
    try { action?.(); }
    catch { /* Continue releasing independent resources after an SDK close failure. */ }
  }
}
