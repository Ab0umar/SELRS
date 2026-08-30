# SELRSUI (selrs-ui@0.0.1)

This design system is the published selrs-ui React library, bundled as a single
browser global. All 285 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.SELRSUI`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.SELRSUI.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Accordion } = window.SELRSUI;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Accordion />);
```

## Tokens

387 CSS custom properties from selrs-ui. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (171): `--color-red-50`, `--color-red-100`, `--color-red-200`, …
- **spacing** (6): `--tw-space-y-reverse`, `--tw-space-x-reverse`, `--tw-inset-ring-shadow`, …
- **typography** (20): `--font-sans`, `--font-serif`, `--font-mono`, …
- **radius** (5): `--radius-xs`, `--radius-md`, `--radius-2xl`, …
- **shadow** (11): `--drop-shadow-lg`, `--tw-shadow`, `--tw-ring-shadow`, …
- **other** (174): `--spacing`, `--container-xs`, `--container-sm`, …

## Components

### general
- `Accordion`
- `AccordionContent`
- `AccordionItem`
- `AccordionTrigger`
- `Alert`
- `AlertDescription`
- `AlertDialog`
- `AlertDialogAction`
- `AlertDialogCancel`
- `AlertDialogContent`
- `AlertDialogDescription`
- `AlertDialogFooter`
- `AlertDialogHeader`
- `AlertDialogOverlay`
- `AlertDialogPortal`
- `AlertDialogTitle`
- `AlertDialogTrigger`
- `AlertTitle`
- `AppFormField`
- `AppShellStatus`
- `AspectRatio`
- `Avatar`
- `AvatarFallback`
- `AvatarImage`
- `Badge`
- `BrandLogo` —  : center-logo.png  logo.png  brand-fallback.svg     .
- `Breadcrumb`
- `BreadcrumbEllipsis`
- `BreadcrumbItem`
- `BreadcrumbLink`
- `BreadcrumbList`
- `BreadcrumbPage`
- `BreadcrumbSeparator`
- `Button`
- `ButtonGroup`
- `ButtonGroupSeparator`
- `ButtonGroupText`
- `Calendar`
- `CalendarDayButton`
- `Card`
- `CardAction`
- `CardContent`
- `CardDescription`
- `CardFooter`
- `CardHeader`
- `CardTitle`
- `Carousel`
- `CarouselContent`
- `CarouselItem`
- `CarouselNext`
- `CarouselPrevious`
- `ChartContainer`
- `ChartLegend`
- `ChartLegendContent`
- `ChartStyle`
- `ChartTooltip`
- `ChartTooltipContent`
- `Checkbox`
- `Collapsible`
- `CollapsibleContent`
- `CollapsibleTrigger`
- `Command`
- `CommandDialog`
- `CommandEmpty`
- `CommandGroup`
- `CommandInput`
- `CommandItem`
- `CommandList`
- `CommandSeparator`
- `CommandShortcut`
- `ConfirmDialog`
- `ContextMenu`
- `ContextMenuCheckboxItem`
- `ContextMenuContent`
- `ContextMenuGroup`
- `ContextMenuItem`
- `ContextMenuLabel`
- `ContextMenuPortal`
- `ContextMenuRadioGroup`
- `ContextMenuRadioItem`
- `ContextMenuSeparator`
- `ContextMenuShortcut`
- `ContextMenuSub`
- `ContextMenuSubContent`
- `ContextMenuSubTrigger`
- `ContextMenuTrigger`
- `DateInput`
- `Dialog`
- `DialogClose`
- `DialogContent`
- `DialogDescription`
- `DialogFooter`
- `DialogHeader`
- `DialogOverlay`
- `DialogPortal`
- `DialogTitle`
- `DialogTrigger`
- `Drawer`
- `DrawerClose`
- `DrawerContent`
- `DrawerDescription`
- `DrawerFooter`
- `DrawerHeader`
- `DrawerOverlay`
- `DrawerPortal`
- `DrawerTitle`
- `DrawerTrigger`
- `DropdownMenu`
- `DropdownMenuCheckboxItem`
- `DropdownMenuContent`
- `DropdownMenuGroup`
- `DropdownMenuItem`
- `DropdownMenuLabel`
- `DropdownMenuPortal`
- `DropdownMenuRadioGroup`
- `DropdownMenuRadioItem`
- `DropdownMenuSeparator`
- `DropdownMenuShortcut`
- `DropdownMenuSub`
- `DropdownMenuSubContent`
- `DropdownMenuSubTrigger`
- `DropdownMenuTrigger`
- `Empty`
- `EmptyContent`
- `EmptyDescription`
- `EmptyHeader`
- `EmptyMedia`
- `EmptyTitle`
- `Field`
- `FieldContent`
- `FieldDescription`
- `FieldError`
- `FieldGroup`
- `FieldLabel`
- `FieldLegend`
- `FieldSeparator`
- `FieldSet`
- `FieldTitle`
- `Form`
- `FormControl`
- `FormDescription`
- `FormField`
- `FormItem`
- `FormLabel`
- `FormMessage`
- `HoverCard`
- `HoverCardContent`
- `HoverCardTrigger`
- `Input`
- `InputGroup`
- `InputGroupAddon`
- `InputGroupButton`
- `InputGroupInput`
- `InputGroupText`
- `InputGroupTextarea`
- `InputOTP`
- `InputOTPGroup`
- `InputOTPSeparator`
- `InputOTPSlot`
- `Item`
- `ItemActions`
- `ItemContent`
- `ItemDescription`
- `ItemFooter`
- `ItemGroup`
- `ItemHeader`
- `ItemMedia`
- `ItemSeparator`
- `ItemTitle`
- `Kbd`
- `KbdGroup`
- `Label`
- `ManusDialog`
- `Menubar`
- `MenubarCheckboxItem`
- `MenubarContent`
- `MenubarGroup`
- `MenubarItem`
- `MenubarLabel`
- `MenubarMenu`
- `MenubarPortal`
- `MenubarRadioGroup`
- `MenubarRadioItem`
- `MenubarSeparator`
- `MenubarShortcut`
- `MenubarSub`
- `MenubarSubContent`
- `MenubarSubTrigger`
- `MenubarTrigger`
- `NavigationMenu`
- `NavigationMenuContent`
- `NavigationMenuIndicator`
- `NavigationMenuItem`
- `NavigationMenuLink`
- `NavigationMenuList`
- `NavigationMenuTrigger`
- `NavigationMenuViewport`
- `OfflinePageState`
- `Pagination`
- `PaginationContent`
- `PaginationEllipsis`
- `PaginationItem`
- `PaginationLink`
- `PaginationNext`
- `PaginationPrevious`
- `Popover`
- `PopoverAnchor`
- `PopoverContent`
- `PopoverTrigger`
- `Progress`
- `PullToRefresh`
- `RadioGroup`
- `RadioGroupItem`
- `ResizableHandle`
- `ResizablePanel`
- `ResizablePanelGroup`
- `ScrollArea`
- `ScrollBar`
- `Select`
- `SelectContent`
- `SelectGroup`
- `SelectItem`
- `SelectLabel`
- `SelectScrollDownButton`
- `SelectScrollUpButton`
- `SelectSeparator`
- `SelectTrigger`
- `SelectValue`
- `Separator`
- `Sheet`
- `SheetClose`
- `SheetContent`
- `SheetDescription`
- `SheetFooter`
- `SheetHeader`
- `SheetTitle`
- `SheetTrigger`
- `Sidebar`
- `SidebarContent`
- `SidebarFooter`
- `SidebarGroup`
- `SidebarGroupAction`
- `SidebarGroupContent`
- `SidebarGroupLabel`
- `SidebarHeader`
- `SidebarInput`
- `SidebarInset`
- `SidebarMenu`
- `SidebarMenuAction`
- `SidebarMenuBadge`
- `SidebarMenuButton`
- `SidebarMenuItem`
- `SidebarMenuSkeleton`
- `SidebarMenuSub`
- `SidebarMenuSubButton`
- `SidebarMenuSubItem`
- `SidebarProvider`
- `SidebarRail`
- `SidebarSeparator`
- `SidebarTrigger`
- `Skeleton`
- `Slider`
- `Spinner`
- `Switch`
- `Table`
- `TableBody`
- `TableCaption`
- `TableCell`
- `TableFooter`
- `TableHead`
- `TableHeader`
- `TableRow`
- `Tabs`
- `TabsContent`
- `TabsList`
- `TabsTrigger`
- `Textarea`
- `Toaster`
- `Toggle`
- `ToggleGroup`
- `ToggleGroupItem`
- `Tooltip`
- `TooltipContent`
- `TooltipProvider`
- `TooltipTrigger`
