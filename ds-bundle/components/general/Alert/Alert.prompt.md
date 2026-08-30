Alert from selrs-ui. Use via `window.SELRSUI.Alert` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AlertProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  variant?: "default" | "destructive";
}
```

## Related

`AlertDescription`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogOverlay`, `AlertDialogPortal`, `AlertDialogTitle`, `AlertDialogTrigger`, `AlertTitle`
