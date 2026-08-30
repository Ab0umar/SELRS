CommandDialog from selrs-ui. Use via `window.SELRSUI.CommandDialog` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  filter?: (value: string, search: string, keywords?: string[]) => number;
}
```
