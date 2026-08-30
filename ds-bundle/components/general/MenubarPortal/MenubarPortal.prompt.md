MenubarPortal from selrs-ui. Use via `window.SELRSUI.MenubarPortal` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface MenubarPortalProps {
  children?: React.ReactNode;
  /** Specify a container element to portal the content into. */
  container?: Element | DocumentFragment;
  /** Used to force mounting when more control is needed. Useful when controlling animation with React animation libraries. */
  forceMount?: true;
}
```
