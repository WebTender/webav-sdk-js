import { describe, it, expect, vi } from "vitest";
import WebAV, { createWebAV } from "./main";
import { config } from 'dotenv';

config();

describe("WebAV SDK JS - main.ts", () => {

  if (process.env.WEBTENDER_API_KEY && process.env.WEBTENDER_API_SECRET) {
    const av = new WebAV();
    it('Can get recent statuses', async () => {
      const statuses = await av.getRecentStatuses();

      expect(statuses.last_page).to.be.a('number')
      expect(statuses.per_page).to.be.a('number')
      expect(statuses.current_page).toEqual(1);
      expect(statuses.data).to.be.an('array')
    });
  } else {

    global.fetch = vi.fn();

    it("Mock - Can get recent statuses", async () => {
      const av = createWebAV();
      av.setApiKey("fake-123", 'fake-secret');
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
  }

  it("it should require an API key", () => {
    const av = createWebAV();
    av.setApiKey("", "");

    expect(() => av.getRecentStatuses()).rejects.toThrowError(
      "API Key and Secret must be set"
    );
  });

});

function createFetchResponse(statusCode, data) {
  if (statusCode === 200) {
    return {
      json: async () => data,
      status: statusCode,
    };
  }

  return {
    json: async () => data,
    status: statusCode,
  };
}
