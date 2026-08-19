export function closeMobileSidebarAfterNavigation(
  isMobile: boolean,
  setOpenMobile: (open: boolean) => void,
) {
  if (isMobile) {
    setOpenMobile(false);
  }
}
