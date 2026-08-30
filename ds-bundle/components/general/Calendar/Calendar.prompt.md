Calendar from selrs-ui. Use via `window.SELRSUI.Calendar` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CalendarProps {
  /** Enable the selection of a single day, multiple days, or a range of days. */
  mode?: "single" | "multiple" | "range";
  /** Whether the selection is required. */
  required?: boolean;
  /** Class name to add to the root element. */
  className?: string;
  /** Change the class names used by DayPicker. Use this prop when you need to change the default class names — for example, w */
  classNames?: Partial<ClassNames> & Partial<DeprecatedUI<string>>;
  /** Change the class name for the day matching the `modifiers`. */
  modifiersClassNames?: ModifiersClassNames;
  /** Style to apply to the root element. */
  style?: React$1.CSSProperties;
  /** Change the inline styles of the HTML elements. */
  styles?: Partial<Styles> & Partial<DeprecatedUI<React$1.CSSProperties>>;
  /** Change the class name for the day matching the {@link modifiers}. */
  modifiersStyles?: ModifiersStyles;
  /** A unique id to add to the root element. */
  id?: string;
  /** The initial month to show in the calendar. Use this prop to let DayPicker control the current month. If you need to set  */
  defaultMonth?: Date;
  /** The month displayed in the calendar. As opposed to `defaultMonth`, use this prop with `onMonthChange` to change the mont */
  month?: Date;
  /** The number of displayed months. */
  numberOfMonths?: number;
  /** The earliest month to start the month navigation. */
  startMonth?: Date;
  fromDate?: Date;
  fromMonth?: Date;
  fromYear?: number;
  /** The latest month to end the month navigation. */
  endMonth?: Date;
  toDate?: Date;
  toMonth?: Date;
  toYear?: number;
  /** Paginate the month navigation displaying the `numberOfMonths` at a time. */
  pagedNavigation?: boolean;
  /** Render the months in reversed order (when {@link numberOfMonths} is set) to display the most recent month first. */
  reverseMonths?: boolean;
  /** Hide the navigation buttons. This prop won't disable the navigation: to disable the navigation, use {@link disableNaviga */
  hideNavigation?: boolean;
  /** Disable the navigation between months. This prop won't hide the navigation: to hide the navigation, use {@link hideNavig */
  disableNavigation?: boolean;
  /** Show dropdowns to navigate between months or years. - `label`: Displays the month and year as a label. Default value. -  */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  /** Reverse the order of years in the dropdown when using `captionLayout="dropdown"` or `captionLayout="dropdown-years"`. */
  reverseYears?: boolean;
  /** Adjust the positioning of the navigation buttons. - `around`: Displays the buttons on either side of the caption. - `aft */
  navLayout?: "around" | "after";
  /** Display always 6 weeks per each month, regardless of the month’s number of weeks. Weeks will be filled with the days fro */
  fixedWeeks?: boolean;
  /** Hide the row displaying the weekday row header. */
  hideWeekdays?: boolean;
  /** Show the outside days (days falling in the next or the previous month). **Note:** when a {@link broadcastCalendar} is se */
  showOutsideDays?: boolean;
  /** Show the week numbers column. Weeks are numbered according to the local week index. */
  showWeekNumber?: boolean;
  /** Animate navigating between months. */
  animate?: boolean;
  /** Display the weeks in the month following the broadcast calendar. Setting this prop will ignore {@link weekStartsOn} (alw */
  broadcastCalendar?: boolean;
  /** Use ISO week dates instead of the locale setting. Setting this prop will ignore `weekStartsOn` and `firstWeekContainsDat */
  ISOWeek?: boolean;
  /** The time zone (IANA or UTC offset) to use in the calendar (experimental). See [Wikipedia](https://en.wikipedia.org/wiki/ */
  timeZone?: string;
  /** Keep calendar math at noon in the configured {@link timeZone} to avoid historical second-level offsets drifting dates ac */
  noonSafe?: boolean;
  /** Change the components used for rendering the calendar elements. */
  components?: Partial<CustomComponents>;
  /** Add a footer to the calendar, acting as a live region. Use this prop to communicate the calendar's status to screen read */
  footer?: React.ReactNode;
  /** When a selection mode is set, DayPicker will focus the first selected day (if set) or today's date (if not disabled). Us */
  autoFocus?: boolean;
  initialFocus?: boolean;
  /** Apply the `disabled` modifier to the matching days. Disabled days cannot be selected when in a selection mode is set. */
  disabled?: boolean | ((date: Date) => boolean) | Date | Date[] | DateRange | DateBefore | DateAfter | DateInterval | DayOfWeek | Matcher[];
  /** Apply the `hidden` modifier to the matching days. Will hide them from the calendar. */
  hidden?: boolean | ((date: Date) => boolean) | Date | Date[] | DateRange | DateBefore | DateAfter | DateInterval | DayOfWeek | Matcher[];
  /** The today’s date. Default is the current date. This date will get the `today` modifier to style the day. */
  today?: Date;
  /** Add modifiers to the matching days. */
  modifiers?: Record<string, Matcher | Matcher[]>;
  /** Labels creators to override the defaults. Use this prop to customize the aria-label attributes in DayPicker. */
  labels?: Partial<Labels>;
  /** Formatters used to format dates to strings. Use this prop to override the default functions. */
  formatters?: Partial<Formatters>;
  /** The text direction of the calendar. Use `ltr` for left-to-right (default) or `rtl` for right-to-left. */
  dir?: string;
  /** The role attribute to add to the container element. */
  role?: "dialog" | "application";
  /** A cryptographic nonce ("number used once") which can be used by Content Security Policy for the inline `style` attribute */
  nonce?: string;
  /** Add a `title` attribute to the container element. */
  title?: string;
  /** Add the language tag to the container element. When omitted, DayPicker uses the active locale code (`locale.code`). Set  */
  lang?: string;
  /** The locale object used to localize dates. Pass a locale from `react-day-picker/locale` to localize the calendar. */
  locale?: Partial<DayPickerLocale>;
  /** The numeral system to use when formatting dates. - `latn`: Latin (Western Arabic) - `arab`: Arabic-Indic - `arabext`: Ea */
  numerals?: "latn" | "arab" | "arabext" | "deva" | "geez" | "beng" | "guru" | "gujr" | "orya" | "tamldec" | "telu" | "knda" | "mlym" | "thai" | "mymr" | "khmr" | "laoo" | "tibt";
  /** The index of the first day of the week (0 - Sunday). Overrides the locale's default. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** The day of January that is always in the first week of the year. */
  firstWeekContainsDate?: 1 | 4;
  /** Enable `DD` and `DDDD` for week year tokens when formatting or parsing dates. */
  useAdditionalWeekYearTokens?: boolean;
  /** Enable `YY` and `YYYY` for day of year tokens when formatting or parsing dates. */
  useAdditionalDayOfYearTokens?: boolean;
  /** Replace the default date library with a custom one. Experimental: not guaranteed to be stable (may not respect semver). */
  dateLib?: Partial<DateLib>;
  buttonVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost";
}
```

## Related

`CalendarDayButton`
