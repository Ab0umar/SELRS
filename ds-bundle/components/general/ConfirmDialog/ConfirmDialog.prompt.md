ConfirmDialog from selrs-ui. Use via `window.SELRSUI.ConfirmDialog` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```
