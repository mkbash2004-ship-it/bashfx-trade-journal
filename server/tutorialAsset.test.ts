import { describe, expect, it } from "vitest";
import { BASHFX_TUTORIAL_STEPS, BASHFX_TUTORIAL_VIDEO_URL } from "../shared/tutorial";

describe("Bashfx tutorial asset", () => {
  it("references the deployed MP4 asset and the full journal workflow", () => {
    expect(BASHFX_TUTORIAL_VIDEO_URL).toMatch(/^\/manus-storage\/.*\.mp4$/);
    expect(BASHFX_TUTORIAL_STEPS).toHaveLength(6);
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("required date");
    expect(BASHFX_TUTORIAL_STEPS.join(" ")).toContain("weekly Gold Room summary");
  });
});
