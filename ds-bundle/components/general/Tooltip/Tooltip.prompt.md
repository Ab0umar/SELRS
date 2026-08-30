Tooltip from selrs-ui. Use via `window.SELRSUI.Tooltip` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TooltipProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  /** The duration from when the pointer enters the trigger until the tooltip gets opened. This will override the prop with th */
  delayDuration?: number;
  /** When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger. */
  disableHoverableContent?: boolean;
}
```

## Related

`TooltipContent`, `TooltipProvider`, `TooltipTrigger`
