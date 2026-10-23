// file: client/src/pages/ForcePasswordChange.test.tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

const useUtils = vi.hoisted(() => vi.fn());
const changeUsernameUseMutation = vi.hoisted(() => vi.fn());
const changePasswordUseMutation = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils,
    auth: {
      changeUsername: { useMutation: changeUsernameUseMutation },
      changePassword: { useMutation: changePasswordUseMutation },
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: useAuthMock,
}));

import ForcePasswordChange from "./ForcePasswordChange";

const USERNAME_SAVE_LABEL = "حفظ اسم المستخدم";

function renderPage(): string {
  return renderToStaticMarkup(
    <Router ssrPath="/force-password-change">
      <ForcePasswordChange />
    </Router>,
  );
}

/** Every <form ...>...</form> block. The two forms are siblings, so non-greedy matching is safe. */
function formBlocks(html: string): string[] {
  return html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
}

function passwordFormBlock(html: string): string {
  const block = formBlocks(html).find((form) =>
    form.includes('type="password"'),
  );
  if (!block) throw new Error("password form missing from markup");
  return block;
}

function usernameFormBlock(html: string): string {
  const block = formBlocks(html).find((form) =>
    form.includes('id="usernameEditable"'),
  );
  if (!block) throw new Error("username form missing from markup");
  return block;
}

/** Opening tag of the input with the given id (attribute order agnostic). */
function inputTag(html: string, id: string): string {
  const tag = html.match(new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*>`))?.[0];
  if (!tag) throw new Error(`input #${id} missing from markup`);
  return tag;
}

describe("ForcePasswordChange markup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: {
        name: "أحمد التجريبي",
        username: "testuser",
        mustChangePassword: true,
      },
      isAuthenticated: true,
    });
    useUtils.mockReturnValue({ auth: { me: { invalidate: vi.fn() } } });
    changeUsernameUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    changePasswordUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("should_render_two_sibling_forms_and_no_nested_form", () => {
    const html = renderPage();
    const forms = formBlocks(html);

    expect(forms).toHaveLength(2);
    // Each form's inner content must not contain another form (no nesting,
    // and the username/password forms must not swallow each other).
    for (const form of forms) {
      const inner = form.slice(
        form.indexOf(">") + 1,
        form.lastIndexOf("</form>"),
      );
      expect(inner).not.toContain("<form");
      // Native validation must stay off so Enter always reaches our handler.
      // React 19 serializes camelCase props verbatim (noValidate), while the
      // HTML parser lowercases attribute names, so match case-insensitively.
      expect(form.slice(0, form.indexOf(">"))).toMatch(/novalidate/i);
    }
  });

  it("should_use_submit_button_for_password_form", () => {
    const buttons =
      passwordFormBlock(renderPage()).match(/<button\b[^>]*>/g) ?? [];

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain('type="submit"');
  });

  it("should_set_current_password_autocomplete", () => {
    const tag = inputTag(renderPage(), "currentPasswordRequired");

    expect(tag).toContain('type="password"');
    // autoComplete may serialize camelCase (React 19 static markup).
    expect(tag).toMatch(/autocomplete="current-password"/i);
  });

  it("should_set_new_password_autocomplete_on_new_and_confirm", () => {
    const html = renderPage();

    for (const id of ["newPasswordRequired", "confirmPasswordRequired"]) {
      const tag = inputTag(html, id);
      expect(tag).toContain('type="password"');
      expect(tag).toMatch(/autocomplete="new-password"/i);
    }
  });

  it("should_set_username_autocomplete", () => {
    const tag = inputTag(renderPage(), "usernameEditable");

    expect(tag).not.toContain('type="password"');
    expect(tag).toMatch(/autocomplete="username"/i);
  });

  it("should_give_username_save_button_an_accessible_name", () => {
    const form = usernameFormBlock(renderPage());
    const buttons = form.match(/<button\b[^>]*>/g) ?? [];

    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain('type="submit"');
    expect(buttons[0]).toContain(`aria-label="${USERNAME_SAVE_LABEL}"`);

    // The glyph inside the icon-only button is decorative for screen readers.
    const saveButton = form.match(
      new RegExp(
        `<button[^>]*aria-label="${USERNAME_SAVE_LABEL}"[^>]*>[\\s\\S]*?</button>`,
      ),
    )?.[0];
    expect(saveButton).toBeDefined();
    expect(saveButton).toContain('aria-hidden="true"');
  });

  it("should_not_render_inline_errors_before_submit", () => {
    const html = renderPage();

    // The new-password rules hint is always rendered and referenced via
    // aria-describedby; the inline *errors* are the role=alert paragraphs,
    // which must only appear after a failed submit.
    expect(html).toContain('id="newPasswordRequired-rules"');
    expect(html).not.toContain('role="alert"');
  });
});
