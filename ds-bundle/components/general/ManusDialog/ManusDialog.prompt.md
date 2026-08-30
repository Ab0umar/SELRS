ManusDialog from selrs-ui. Use via `window.SELRSUI.ManusDialog` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}
```
