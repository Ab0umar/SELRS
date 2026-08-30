AppShellStatus from selrs-ui. Use via `window.SELRSUI.AppShellStatus` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AppShellStatusProps {
  booting: boolean;
  online: boolean;
  serverReachable: boolean;
  buildInfo: BuildInfo;
  updateAvailable: BuildInfo;
  apiIssue: ApiIssue;
  offlineCacheCount: number;
  offlineCacheTimeLabel: string;
  runtimeIssue: RuntimeIssue;
  onRetry: () => void;
  onReload: () => void;
  onRetrySync: () => void;
  onDismissRuntimeIssue: () => void;
  onCopyRuntimeIssue: () => void;
}
```
