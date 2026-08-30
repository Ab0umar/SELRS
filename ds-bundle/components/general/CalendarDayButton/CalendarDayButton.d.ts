import * as React from 'react';

/**
 * CalendarDayButton — from selrs-ui@0.0.1.
 */
export interface CalendarDayButtonProps {
  /** The day to render. */
  day: CalendarDay;
  /** The modifiers to apply to the day. */
  modifiers: Modifiers;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}

export declare const CalendarDayButton: React.ComponentType<CalendarDayButtonProps>;
