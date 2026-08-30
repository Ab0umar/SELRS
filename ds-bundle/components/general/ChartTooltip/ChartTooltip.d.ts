import * as React from 'react';

/**
 * ChartTooltip — from selrs-ui@0.0.1.
 */
export interface ChartTooltipProps {
  formatter?: unknown;
  labelStyle?: React$1.CSSProperties;
  separator?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  contentStyle?: React$1.CSSProperties;
  itemStyle?: React$1.CSSProperties;
  labelFormatter?: ((label: ReactNode, payload: readonly RechartsPrimitive.TooltipPayloadEntry<RechartsPrimitive.TooltipValueType, NameType>[]) => ReactNode) & ((label: any, payload: RechartsPrimitive.TooltipPayload) => ReactNode);
  itemSorter?: unknown;
  /** If true, then Tooltip is always displayed, once an activeIndex is set by mouse over, or programmatically. If false, then */
  active?: boolean;
  /** This option allows the tooltip to extend beyond the viewBox of the chart itself. */
  allowEscapeViewBox?: AllowInDimension;
  /** Specifies the duration of animation, the unit of this option is ms. */
  animationDuration?: number;
  /** The type of easing function. */
  animationEasing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | `cubic-bezier(${number},${number},${number},${number})` | "spring" | EasingFunction;
  /** Tooltip always attaches itself to the "Tooltip" axis. Which axis is it? Depends on the layout: - horizontal layout -> X  */
  axisId?: string | number;
  /** Renders the content of the tooltip. This should return HTML elements, not SVG elements. - If not set, the {@link Default */
  content?: React$1.ReactElement<unknown, string | React$1.JSXElementConstructor<any>> | ((props: RechartsPrimitive.TooltipContentProps<RechartsPrimitive.TooltipValueType, NameType>) => ReactNode);
  /** If set false, no cursor will be drawn when tooltip is active. If set a object, the option is the configuration of cursor */
  cursor?: boolean | React$1.SVGProps<SVGElement> | React$1.ReactElement<unknown, string | React$1.JSXElementConstructor<any>>;
  defaultIndex?: string | number;
  /** When an item of the payload has value null or undefined, this item won't be displayed. */
  filterNull?: boolean;
  /** If true, the tooltip will display information about hidden series. Defaults to false. Interacting with the hide property */
  includeHidden?: boolean;
  /** If set false, animation of tooltip will be disabled. If set "auto", the animation will be disabled in SSR and will respe */
  isAnimationActive?: boolean | "auto";
  /** The offset size between the position of tooltip and the mouse cursor position. When a number is provided, the same offse */
  offset?: number | RechartsPrimitive.Coordinate;
  payloadUniqBy?: boolean | ((entry: TooltipPayloadEntry) => unknown);
  /** If portal is defined, then Tooltip will use this element as a target for rendering using React Portal: https://react.dev */
  portal?: HTMLElement;
  /** If this field is set, the tooltip will be displayed at the specified position regardless of the mouse position. You can  */
  position?: Partial<RechartsPrimitive.Coordinate>;
  reverseDirection?: AllowInDimension;
  /** Defines whether the tooltip is reacting to the current data point, or to all data points at the current axis coordinate. */
  shared?: boolean;
  /** If `hover` then the Tooltip shows on mouse enter and hides on mouse leave. If `click` then the Tooltip shows after click */
  trigger?: "hover" | "click";
  useTranslate3d?: boolean;
  /** CSS styles to be applied to the wrapper `div` element. */
  wrapperStyle?: React$1.CSSProperties;
}

export declare const ChartTooltip: React.ComponentType<ChartTooltipProps>;
