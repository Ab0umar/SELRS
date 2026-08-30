Accordion from selrs-ui. Use via `window.SELRSUI.Accordion` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface AccordionProps {
  type: "single" | "multiple";
  /** The controlled stateful value of the accordion item whose content is expanded. */
  value?: string | string[];
  /** The value of the item whose content is expanded when the accordion is initially rendered. Use `defaultValue` if you do n */
  defaultValue?: string | string[];
  /** Whether or not an accordion is disabled from user interaction. */
  disabled?: boolean;
  /** The layout in which the Accordion operates. */
  orientation?: "horizontal" | "vertical";
  /** The language read direction. */
  dir?: "ltr" | "rtl";
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}
```

## Related

`AccordionContent`, `AccordionItem`, `AccordionTrigger`
