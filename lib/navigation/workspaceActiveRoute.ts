type WorkspaceRouteItem = Readonly<{
  href?: string;
}>;

type WorkspaceRouteGroup = Readonly<{
  items: readonly WorkspaceRouteItem[];
}>;

export function getWorkspaceActiveNavigationKey(
  pathname: string,
  groups: readonly WorkspaceRouteGroup[],
): string | undefined {
  let active: { hrefLength: number; key: string } | undefined;

  groups.forEach((group, groupIndex) => {
    group.items.forEach((item, itemIndex) => {
      const href = item.href;
      if (!href) return;
      const isRoot = href.split('/').filter(Boolean).length === 1;
      const matches = pathname === href || (!isRoot && pathname.startsWith(`${href}/`));
      if (!matches || (active && active.hrefLength >= href.length)) return;
      active = { hrefLength: href.length, key: `${groupIndex}:${itemIndex}` };
    });
  });

  return active?.key;
}
