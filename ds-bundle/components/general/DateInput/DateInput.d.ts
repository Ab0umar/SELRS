import * as React from 'react';

/**
 * DateInput — from selrs-ui@0.0.1.
 */
export interface DateInputProps {
  /** ISO yyyy-MM-dd string — same value convention the native date field used. */
  value?: string;
  /** Fires a native-input-shaped change event so existing `(e) => setX(e.target.value)` handlers keep working unchanged. */
  onChange?: (e: React$1.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  className?: string;
  inputClassName?: string;
  style?: React$1.CSSProperties;
  dir?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Date field can't really be "read only" and still pickable — treated the same as `disabled` (blocks opening the picker). */
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  /** ISO yyyy-MM-dd — earliest selectable date. */
  min?: string;
  /** ISO yyyy-MM-dd — latest selectable date. */
  max?: string;
  "aria-label"?: string;
}

export declare const DateInput: React.ComponentType<DateInputProps>;
