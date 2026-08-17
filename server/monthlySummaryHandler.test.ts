import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authenticateRequest,
  generateMonthlySummaryForUser,
  getMonthlySummaryAutomation,
  getUsersWithTradesForRange,
  notifyOwner,
} = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  generateMonthlySummaryForUser: vi.fn(),
  getMonthlySummaryAutomation: vi.fn(),
  getUsersWithTradesForRange: vi.fn(),
  notifyOwner: vi.fn(),
}));

vi.mock("./db", () => ({
  getMonthlySummaryAutomation,
  getUsersWithTradesForRange,
}));
vi.mock("./monthlySummaryService", () => ({ generateMonthlySummaryForUser }));
vi.mock("./_core/notification", () => ({ notifyOwner }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));

import { generateScheduledMonthlySummaries } from "./monthlySummaryHandler";

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("month-end monthly summary callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates only missing summaries, safely reuses existing ones, and notifies the owner", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "month-end-task" });
    getMonthlySummaryAutomation.mockResolvedValue({ scheduleTaskUid: "month-end-task" });
    getUsersWithTradesForRange.mockResolvedValue([10, 20]);
    generateMonthlySummaryForUser
      .mockResolvedValueOnce({ summaryId: 1, reused: false })
      .mockResolvedValueOnce({ summaryId: 2, reused: true });
    const response = makeResponse();

    await generateScheduledMonthlySummaries({ originalUrl: "/api/scheduled/monthly-summary" } as never, response as never);

    expect(generateMonthlySummaryForUser).toHaveBeenCalledTimes(2);
    expect(notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Bashfx monthly summaries are ready" }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, completed: 1, reused: 1 }));
  });

  it("returns a successful skip for a stale or disabled schedule without generating an image", async () => {
    authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "stale-task" });
    getMonthlySummaryAutomation.mockResolvedValue({ scheduleTaskUid: "month-end-task" });
    const response = makeResponse();

    await generateScheduledMonthlySummaries({ originalUrl: "/api/scheduled/monthly-summary" } as never, response as never);

    expect(generateMonthlySummaryForUser).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ ok: true, skipped: "orphan-or-disabled" });
  });
});
