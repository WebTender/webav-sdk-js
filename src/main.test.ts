import { describe, it, expect, vi } from "vitest";
import { createWebAV } from "./main";

global.fetch = vi.fn();

function createFetchResponse(statusCode, data) {
  if (statusCode === 200) {
    return {
      json: () => new Promise((resolve) => resolve(data)),
      status: statusCode,
    };
  }

  return {
    json: () => new Promise((resolve, reject) => reject(data)),
  };
}

describe("WebAV SDK JS - main.ts", () => {
  it("it should require an API key", () => {
    const av = createWebAV();

    expect(async () => await av.getRecentStatuses()).rejects.toThrowError(
      "API key is not set"
    );
  });

  it("Can get recent statuses", async () => {
    const av = createWebAV();
    av.setApiKey("fake-123");
    // @ts-ignore
    fetch.mockResolvedValue(
      createFetchResponse(200, {
        data: [],
        last_page: 1,
        per_page: 1,
        current_page: 1,
      })
    );

    const response = await av.getRecentStatuses();
    expect(response).toEqual({
      data: [],
      last_page: 1,
      per_page: 1,
      current_page: 1,
    });
  });
});
