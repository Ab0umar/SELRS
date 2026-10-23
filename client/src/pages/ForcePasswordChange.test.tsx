// file: client/src/pages/ForcePasswordChange.test.tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

const { changeUsernameMutate, changePasswordMutate } = vi.hoisted(() => ({
  changeUsernameMutate: vi.fn(),
  changePasswordMutate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
    auth: {
      changeUsername: {
        useMutation: () => ({
          mutateAsync: changeUsernameMutate,
          isPending: false,
        }),
      },
      changePassword: {
        useMutation: () => ({
          mutateAsync: changePasswordMutate,
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      name: "مستخدم التجربة",
      username: "saved-user",
      mustChangePassword: true,
    },
  }),
}));

import ForcePasswordChange from "./ForcePasswordChange";
import { CHANGE_PASSWORD_RULES_HINT } from "@/lib/change-password-validation";

const USERNAME_SAVE_LABEL = "حفظ اسم المستخدم";

function renderPage(): string {
  return renderToStaticMarkup(
    <Router ssrPath="/force-password-change">
      <ForcePasswordChange />
    </Router>,
  );
}

/** Full markup of each <form>…</form> block; the two forms are siblings, so a
    non-greedy match cannot spill from one into the other. */
function formBlocks(html: string): string[] {
  return html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
}

/** Opening tags of every <input ...> in the markup. */
function inputTags(html: string): string[] {
  return html.match(/<input\b[^>]*>/g) ?? [];
}

/** Opening tags of every <button ...> in the markup. */
function buttonTags(html: string): string[] {
  return html.match(/<button\b[^>]*>/g) ?? [];
}

function count(html: string, substring: string): number {
  return html.split(substring).length - 1;
}

/** Autocomplete hint matcher. React 19 SSR emits autoComplete with its JSX
    casing (autoComplete=) while other attributes come out lowercase
    (tabindex=); HTML treats attribute names case-insensitively, so match
    either here. Global-flag variants must stay short-lived: a reused global
    regex keeps lastIndex state between .test() calls. */
function autocompleteAttr(value: string, flags = ""): RegExp {
  return new RegExp(`auto[Cc]omplete="${value}"`, flags);
}

function countAutocomplete(html: string, value: string): number {
  return (html.match(autocompleteAttr(value, "g")) ?? []).length;
}

describe("ForcePasswordChange markup", () => {
  it("should_render_password_and_username_in_separate_forms", () => {
    const html = renderPage();
    const forms = formBlocks(html);

    expect(count(html, "<form")).toBe(2);
    expect(forms).toHaveLength(2);
    // Sibling forms, none nested: each block holds exactly one open/close pair.
    for (const form of forms) {
      expect(count(form, "<form")).toBe(1);
      expect(count(form, "</form>")).toBe(1);
    }
    // The read-only full-name field stays outside both forms.
    expect(forms.every(form => !form.includes("fullNameReadonly"))).toBe(true);
  });

  it("should_expose_password_autocomplete_hints_on_three_inputs", () => {
    const html = renderPage();

    expect(countAutocomplete(html, "current-password")).toBe(1);
    expect(countAutocomplete(html, "new-password")).toBe(2);

    const passwordInputs = inputTags(html).filter(tag =>
      tag.includes('type="password"'),
    );
    expect(passwordInputs).toHaveLength(3);
    for (const [field, autocomplete] of [
      ["currentPassword", "current-password"],
      ["newPassword", "new-password"],
      ["confirmPassword", "new-password"],
    ] as const) {
      const tag = passwordInputs.find(input =>
        input.includes(`name="${field}"`),
      );
      expect(tag).toBeDefined();
      expect(tag).toMatch(autocompleteAttr(autocomplete));
    }
  });

  it("should_pair_username_autocomplete_with_visible_and_hidden_fields", () => {
    const html = renderPage();

    expect(countAutocomplete(html, "username")).toBeGreaterThanOrEqual(2);

    // The hidden credential field pairs the saved username with the password
    // form for password managers, while staying out of a11y tree and tab order.
    const hiddenCredential = inputTags(html).find(
      tag =>
        tag.includes('type="text"') &&
        autocompleteAttr("username").test(tag) &&
        tag.includes('aria-hidden="true"') &&
        tag.includes('tabindex="-1"'),
    );
    expect(hiddenCredential).toBeDefined();
    expect(hiddenCredential).toContain('value="saved-user"');

    // The editable username field keeps its own autocomplete hint.
    const editableUsername = inputTags(html).find(
      tag =>
        tag.includes('id="usernameEditable"') &&
        autocompleteAttr("username").test(tag),
    );
    expect(editableUsername).toBeDefined();
    expect(editableUsername).not.toContain("aria-hidden");
  });

  it("should_render_three_password_fields_with_password_type", () => {
    const html = renderPage();

    for (const id of [
      "currentPasswordRequired",
      "newPasswordRequired",
      "confirmPasswordRequired",
    ]) {
      const tag = inputTags(html).find(input => input.includes(`id="${id}"`));
      expect(tag).toBeDefined();
      expect(tag).toContain('type="password"');
    }
  });

  it("should_give_each_form_a_native_submit_button", () => {
    const forms = formBlocks(renderPage());

    expect(forms).toHaveLength(2);
    for (const form of forms) {
      const submit = buttonTags(form).find(tag =>
        tag.includes('type="submit"'),
      );
      expect(submit).toBeDefined();
    }
  });

  it("should_name_the_icon_only_username_submit_button", () => {
    const [usernameForm] = formBlocks(renderPage());
    expect(usernameForm).toBeDefined();

    const submit = buttonTags(usernameForm ?? "").find(
      tag => tag.includes('type="submit"') && tag.includes("aria-label"),
    );
    expect(submit).toBeDefined();
    expect(submit).toContain(`aria-label="${USERNAME_SAVE_LABEL}"`);
  });

  it("should_show_the_password_rules_hint", () => {
    expect(renderPage()).toContain(CHANGE_PASSWORD_RULES_HINT);
  });

  it("should_not_render_alerts_or_invalid_flags_before_first_submit", () => {
    const html = renderPage();

    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('aria-invalid="true"');
  });
});
