import * as React from 'react';

/**
 * AccordionItem — from selrs-ui@0.0.1.
 */
export interface AccordionItemProps {
  /** Whether or not an accordion item is disabled from user interaction. */
  disabled?: boolean;
  /** A string value for the accordion item. All items within an accordion should use a unique value. */
  value: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const AccordionItem: React.ComponentType<AccordionItemProps>;
