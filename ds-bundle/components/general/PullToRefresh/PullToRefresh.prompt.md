PullToRefresh from selrs-ui. Use via `window.SELRSUI.PullToRefresh` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<unknown> | unknown;
  enabled?: boolean;
  className?: string;
}
```
