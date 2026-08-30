Form from selrs-ui. Use via `window.SELRSUI.Form` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface FormProps {
  children: unknown;
  watch: react_hook_form.UseFormWatch<TFieldValues>;
  getValues: react_hook_form.UseFormGetValues<TFieldValues>;
  getFieldState: react_hook_form.UseFormGetFieldState<TFieldValues>;
  setError: react_hook_form.UseFormSetError<TFieldValues>;
  clearErrors: react_hook_form.UseFormClearErrors<TFieldValues>;
  setValue: react_hook_form.UseFormSetValue<TFieldValues>;
  setValues: react_hook_form.UseFormSetValues<TFieldValues>;
  trigger: react_hook_form.UseFormTrigger<TFieldValues>;
  formState: react_hook_form.FormState<TFieldValues>;
  resetField: react_hook_form.UseFormResetField<TFieldValues>;
  reset: react_hook_form.UseFormReset<TFieldValues>;
  resetDefaultValues: react_hook_form.UseFormResetDefaultValues<TFieldValues>;
  handleSubmit: react_hook_form.UseFormHandleSubmit<TFieldValues, TTransformedValues>;
  unregister: react_hook_form.UseFormUnregister<TFieldValues>;
  control: react_hook_form.Control<TFieldValues, TContext, TTransformedValues>;
  register: react_hook_form.UseFormRegister<TFieldValues>;
  setFocus: react_hook_form.UseFormSetFocus<TFieldValues>;
  subscribe: react_hook_form.UseFormSubscribe<TFieldValues>;
}
```

## Related

`FormControl`, `FormDescription`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`
