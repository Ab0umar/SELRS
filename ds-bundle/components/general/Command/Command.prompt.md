Command from selrs-ui. Use via `window.SELRSUI.Command` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CommandProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Accessible label for this command menu. Not shown visibly. */
  label?: string;
  /** Optionally set to `false` to turn off the automatic filtering and sorting. If `false`, you must conditionally render val */
  shouldFilter?: boolean;
  /** Custom filter function for whether each command menu item should matches the given search query. It should return a numb */
  filter?: (value: string, search: string, keywords?: string[]) => number;
  /** Optional controlled state of the selected command menu item. */
  value?: string;
  /** Optionally set to `true` to turn on looping around when using the arrow keys. */
  loop?: boolean;
  /** Optionally set to `true` to disable selection via pointer events. */
  disablePointerSelection?: boolean;
  /** Set to `false` to disable ctrl+n/j/p/k shortcuts. Defaults to `true`. */
  vimBindings?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Related

`CommandDialog`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList`, `CommandSeparator`, `CommandShortcut`
