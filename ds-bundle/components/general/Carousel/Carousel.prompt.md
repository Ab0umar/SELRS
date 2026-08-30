Carousel from selrs-ui. Use via `window.SELRSUI.Carousel` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CarouselProps {
  opts?: Partial<OptionsType>;
  plugins?: CreatePluginType<LoosePluginType, {}>[];
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
}
```

## Related

`CarouselContent`, `CarouselItem`, `CarouselNext`, `CarouselPrevious`
