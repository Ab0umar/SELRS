import * as React from 'react';

/**
 * ChartLegend — from selrs-ui@0.0.1.
 */
export interface ChartLegendProps {
  children?: React.ReactNode;
  dangerouslySetInnerHTML?: { __html: string; };
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** The size of icon in each legend item. */
  iconSize?: number;
  /** The type of icon in each legend item. */
  iconType?: "none" | "circle" | "line" | "rect" | "cross" | "diamond" | "plainline" | "square" | "star" | "triangle" | "wye";
  /** The layout of legend items inside the legend container. */
  layout?: "horizontal" | "vertical";
  /** Horizontal alignment of the whole Legend container: - `left`: shows the Legend to the left of the chart, and chart width */
  align?: "center" | "left" | "right";
  /** The color of the icon when the item is inactive. */
  inactiveColor?: string;
  /** Function to customize how content is serialized before rendering. This should return HTML elements, or strings. */
  formatter?: Formatter;
  /** The style of each text label which is a span element. */
  labelStyle?: React$1.CSSProperties;
  /** Renders the content of the legend. This should return HTML elements, not SVG elements. - If not set, the {@link DefaultL */
  content?: React$1.ReactElement<unknown, string | React$1.JSXElementConstructor<any>> | ((props: RechartsPrimitive.DefaultLegendContentProps) => ReactNode);
  /** CSS styles to be applied to the wrapper `div` element. */
  wrapperStyle?: React$1.CSSProperties;
  payloadUniqBy?: boolean | ((entry: RechartsPrimitive.LegendPayload) => unknown);
  /** If portal is defined, then Legend will use this element as a target for rendering using React Portal. If this is undefin */
  portal?: HTMLElement;
  /** Sorts Legend items. Defaults to `value` which means it will sort alphabetically by the label. If `null` is provided then */
  itemSorter?: "value" | "dataKey" | ((item: LegendPayload) => number | string);
  /** The alignment of the whole Legend container: - `bottom`: shows the Legend below chart, and chart height reduces automati */
  verticalAlign?: "top" | "bottom" | "middle";
}

export declare const ChartLegend: React.ComponentType<ChartLegendProps>;
