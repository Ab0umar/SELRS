// Tabs, deep links and the theme toggle for the public landing page.
// The markup is static, so these listeners only toggle attributes on it.

type TabGroup = {
  tabs: HTMLElement[];
  open: (tab: HTMLElement, focus?: boolean) => void;
};

const NEXT_KEYS_RTL: Record<string, number> = { ArrowLeft: 1, ArrowRight: -1 };
const NEXT_KEYS_VERTICAL: Record<string, number> = { ...NEXT_KEYS_RTL, ArrowDown: 1, ArrowUp: -1 };

function tabGroup(root: HTMLElement, selector: string, scrollTabIntoView: boolean): TabGroup {
  const tabs = Array.from(root.querySelectorAll<HTMLElement>(selector));
  const open = (tab: HTMLElement, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = root.querySelector<HTMLElement>(`#${t.getAttribute("aria-controls")}`);
      if (panel) panel.hidden = !on;
    }
    if (scrollTabIntoView) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (focus) tab.focus();
  };
  return { tabs, open };
}

function onKeys(
  container: HTMLElement | null,
  group: TabGroup,
  keys: Record<string, number>,
  listeners: Array<() => void>,
) {
  if (!container) return;
  const handler = (e: KeyboardEvent) => {
    const i = group.tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const n = group.tabs.length;
    const step = keys[e.key];
    const j = step ? (i + step + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    group.open(group.tabs[j], true);
  };
  container.addEventListener("keydown", handler);
  listeners.push(() => container.removeEventListener("keydown", handler));
}

export function setupLanding(root: HTMLElement, navigate: (to: string) => void): () => void {
  const listeners: Array<() => void> = [];
  const listen = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ) => {
    el.addEventListener(type, fn);
    listeners.push(() => el.removeEventListener(type, fn));
  };

  const tabsBox = root.querySelector<HTMLElement>("#a-tabs");
  const main = tabGroup(root, '.tabbar [role="tab"]', true);
  const sub = tabGroup(root, '.svc-tabs [role="tab"]', true);
  const proc = tabGroup(root, '.proc-tabs [role="tab"]', false);
  const byId = (id: string) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);

  const scrollToTabs = () => {
    if (tabsBox && tabsBox.getBoundingClientRect().top < 0) tabsBox.scrollIntoView({ block: "start" });
  };
  const setHash = (id: string) => history.replaceState(history.state, "", `#${id}`);

  const goTo = (id: string) => {
    const el = id ? byId(id) : null;
    if (!el) return false;
    const panel = el.closest<HTMLElement>(".tab-panel");
    const subPanel = el.closest<HTMLElement>(".svc-panel");
    if (panel) {
      const tab = byId(`t-${panel.id.slice(4)}`);
      if (tab) main.open(tab);
    }
    if (subPanel) {
      const tab = byId(`t-${subPanel.id.slice(4)}`);
      if (tab) sub.open(tab);
    } else if (el.id === "tab-services" && sub.tabs[0]) {
      sub.open(sub.tabs[0]);
    }
    (el === panel || el === subPanel ? tabsBox ?? el : el).scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  for (const t of main.tabs) {
    listen(t, "click", () => {
      main.open(t);
      if (t.id === "t-services" && sub.tabs[0]) sub.open(sub.tabs[0]);
      setHash(t.getAttribute("aria-controls") ?? "");
      scrollToTabs();
    });
  }
  for (const t of sub.tabs) {
    listen(t, "click", () => {
      sub.open(t);
      setHash(t.getAttribute("aria-controls") ?? "");
      scrollToTabs();
    });
  }
  for (const t of proc.tabs) {
    listen(t, "click", () => {
      proc.open(t);
      if (matchMedia("(max-width: 900px)").matches) {
        byId("edu-steps")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  onKeys(root.querySelector<HTMLElement>('.tabbar [role="tablist"]'), main, NEXT_KEYS_RTL, listeners);
  onKeys(root.querySelector<HTMLElement>(".svc-tabs"), sub, NEXT_KEYS_RTL, listeners);
  onKeys(root.querySelector<HTMLElement>(".proc-tabs"), proc, NEXT_KEYS_VERTICAL, listeners);

  // In-page anchors open the tab that holds them; site paths go through the router.
  listen(root, "click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.target === "_blank") return;
    const href = a.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (goTo(id)) {
        e.preventDefault();
        setHash(id);
      }
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      e.preventDefault();
      navigate(href);
    }
  });

  const themeBtn = root.querySelector<HTMLButtonElement>("#themeBtn");
  if (themeBtn) {
    listen(themeBtn, "click", () => {
      const dark = root.dataset.theme !== "dark";
      root.dataset.theme = dark ? "dark" : "light";
      themeBtn.setAttribute("aria-pressed", String(dark));
      themeBtn.textContent = dark ? "الوضع الفاتح" : "الوضع الداكن";
    });
  }

  const fromHash = () => {
    if (location.hash.length > 1) goTo(decodeURIComponent(location.hash.slice(1)));
  };
  fromHash();
  window.addEventListener("hashchange", fromHash);
  listeners.push(() => window.removeEventListener("hashchange", fromHash));

  return () => {
    for (const off of listeners) off();
  };
}
