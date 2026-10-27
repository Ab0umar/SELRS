const sections: Record<string, string[]> = {
  "/admin-hub/legacy-patients": ["/admin-hub/op-history"],
  "/admin-hub/ai": ["/admin-hub/auto-reply", "/admin-hub/medical-assistant"],
  "/admin-hub/external-doctors": ["/admin-hub/external-referrals"],
};

export function consolidateAdminDirectory<
  T extends { href: string; label: string; helper: string },
>(
  cards: T[],
  canAccess: (path: string) => boolean,
): (T & { searchTerms: string })[] {
  const children = new Set(Object.values(sections).flat());
  return cards
    .filter((card) => !children.has(card.href))
    .flatMap((card) => {
      const paths = [card.href, ...(sections[card.href] ?? [])];
      const destination = paths.find(canAccess);
      if (!destination) return [];
      const keywords = cards
        .filter((item) => paths.includes(item.href))
        .map((item) => `${item.label} ${item.helper}`)
        .join(" · ");
      return [{ ...card, href: destination, searchTerms: keywords }];
    });
}
