import { describe, expect, it, vi } from "vitest";
import { closeMobileSidebarAfterNavigation } from "../client/src/lib/mobileSidebarNavigation";

describe("mobile sidebar navigation", () => {
  it("closes the mobile menu after the trader selects a destination", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(true, setOpenMobile);

    expect(setOpenMobile).toHaveBeenCalledWith(false);
  });

  it("leaves the desktop sidebar unchanged after page navigation", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(false, setOpenMobile);

    expect(setOpenMobile).not.toHaveBeenCalled();
  });
});
