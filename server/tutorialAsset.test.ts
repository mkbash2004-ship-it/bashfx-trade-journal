import { describe, expect, it } from "vitest";
import { BASHFX_TUTORIAL_STEPS, BASHFX_TUTORIAL_VIDEO_URL } from "../shared/tutorial";

describe("Bashfx tutorial asset", () => {
  it("references the revised deployed MP4 asset and the complete multi-market workflow", () => {
    expect(BASHFX_TUTORIAL_VIDEO_URL).toMatch(/^\/manus-storage\/.*\.mp4$/);
    expect(BASHFX_TUTORIAL_VIDEO_URL).toContain("tutorial_revised");
    expect(BASHFX_TUTORIAL_STEPS).toHaveLength(9);
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("required date");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("weekly Gold Room summary");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("Trader Name");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("monthly summary");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("Community feedback");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("WAT reminders");
  });
});
