SidebarMenuButton from selrs-ui. Use via `window.SELRSUI.SidebarMenuButton` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface SidebarMenuButtonProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | TooltipPrimitive.TooltipContentProps & React$1.RefAttributes<HTMLDivElement>;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
```
