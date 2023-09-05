import type { ReadStream } from "fs";

export const VIRUS_STATUS_PENDING = 0;
export const VIRUS_STATUS_PASSED = 1;
export const VIRUS_STATUS_VIRUS = 2;
export const VIRUS_STATUS_UNABLE = 3;
export const VIRUS_STATUS_SKIPPED = 4;
export const VIRUS_STATUS_LABELS = [
  "Pending",
  "Passed",
  "Virus",
  "Unable",
  "Skipped",
];

export function getStatusLabel(status: VirusStatus) {
  if (status < 0 || status > VIRUS_STATUS_LABELS.length)
    throw new Error("Invalid status: " + status);

  return VIRUS_STATUS_LABELS[status] as VirusStatusLabel;
}

export type VirusStatus =
  | typeof VIRUS_STATUS_PENDING
  | typeof VIRUS_STATUS_PASSED
  | typeof VIRUS_STATUS_VIRUS
  | typeof VIRUS_STATUS_UNABLE
  | typeof VIRUS_STATUS_SKIPPED;

export type VirusStatusLabel =
  | "Pending"
  | "Passed"
  | "Virus"
  | "Unable"
  | "Skipped";

export interface FileStatus {
  id: string;
  virus_status: VirusStatus;
  virus_status_label: VirusStatusLabel;
  updated_at: string;
  created_at: string;
}

export interface PaginatedFiles {
  data: FileStatus[];
  last_page: number;
  per_page: number;
  current_page: number;
  to: null | number;
  from: null | number;
  total: number;
}

export function createWebAV(apiKey: null | string = null) {
  // Private variables
  let basePath = "https://api.webtender.host/api/";

  // Public functions
  async function scanByUpload(
    file: string | Buffer | ReadStream | File,
    fileName: string
  ) {
    let fileBuffer: Buffer;

    if (typeof file === "string") {
      fileBuffer = Buffer.from(file, "base64");
    } else if (file instanceof Buffer) {
      fileBuffer = file;
    } else {
      // Probably `file` is a ReadStream, convert it to a Buffer and create a new Blob from it.
      const chunks: any[] = [];
      for await (const chunk of file as ReadStream) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
    }

    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), fileName);
    const response = await sendRequest("POST", `webav/scan`, formData);

    return response as FileStatus;
  }

  async function getStatus(jobId: string) {
    const response = await sendRequest("GET", `webav/status/${jobId}`);

    return response as FileStatus;
  }

  return {
    setApiKey(key: string) {
      apiKey = key;
    },

    setBasePath(path: string) {
      // Ensure trailing slash
      basePath = path.replace(/\/+$/, "") + "/";
    },

    async getRecentStatuses() {
      const response = await sendRequest("GET", `webav/status`);

      return response as PaginatedFiles;
    },

    getStatus,

    async waitFor(
      jobId: string,
      timeoutSeconds = 600,
      pollIntervalSeconds = 0.1
    ) {
      const startTime = Date.now();
      while (true) {
        const status = await getStatus(jobId);

        if (status.virus_status !== VIRUS_STATUS_PENDING) {
          return status;
        }

        if (Date.now() - startTime > timeoutSeconds * 1000) {
          throw new Error(
            "Timeout waiting for file status after " +
            timeoutSeconds +
            " seconds"
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, pollIntervalSeconds * 1000)
        );
      }
    },

    scanByUpload,
    async scanByUrl(fileUrl: string) {
      const response = await sendRequest("POST", `webav/scan`, {
        file_url: fileUrl,
      });
      return response as FileStatus;
    },
  };

  // Private functions
  async function sendRequest(
    method: "GET" | "POST",
    uri: string,
    data: Record<string, any> | FormData = {}
  ) {
    if (!apiKey) throw new Error("API key is not set");

    if (method === "GET") {
      if (data instanceof FormData) {
        throw new Error("GET requests cannot have FormData");
      }

      const queryParams = new URLSearchParams({
        ...data,
        api_key: apiKey,
      });

      return (
        await fetch(`${basePath}${uri}?${queryParams}`, {
          headers: {
            Accept: "application/json",
            'X-WebTender-Api-Key': apiKey,
          },
        })
      ).json();
    } else if (method === "POST") {
      if (data instanceof FormData) {
        return await fetch(`${basePath}${uri}`, {
          method: "POST",
          body: data,
          headers: {
            Accept: "application/json",
            'X-WebTender-Api-Key': apiKey,
          },
        }).then((response) => {
          if (response.status === 413) {
            throw new Error("File is too large");
          }
          return response.json();
        });
      }

      return await fetch(`${basePath}${uri}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          Accept: "application/json",
          'X-WebTender-Api-Key': apiKey,
          "Content-Type": "application/json",
        },
      }).then((response) => response.json());
    }

    throw new Error("Invalid method: " + method);
  }
}
