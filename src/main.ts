import WebTenderClient from '@webtender/api-client-node';
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

export default class WebAV {
  private client: WebTenderClient;

  constructor(apiKey?: string, apiSecret?: string) {
    this.client = new WebTenderClient(apiKey, apiSecret);
  }

  setApiKey(key: string, secret: string) {
    this.client.setApiKey(key);
    this.client.setApiSecret(secret);
  }

  setBasePath(path: string) {
    this.client.setBaseUrl(path);
  }

  async scanByUpload(file: string | Buffer | ReadStream | File, fileName: string): Promise<FileStatus> {
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
    const request = await this.client.post(`webav/scan`, formData);

    return await request.json();
  }

  async getStatus(jobId: string): Promise<FileStatus> {
    const request = await this.client.get(`webav/status/${jobId}`);
    return request.json();
  }

  async getRecentStatuses(): Promise<PaginatedFiles> {
    const request = await this.client.get(`webav/status`);
    return request.json();
  }

  async waitFor(jobId: string, timeoutSeconds = 600, pollIntervalSeconds = 0.1): Promise<FileStatus> {
    const startTime = Date.now();
    while (true) {
      const status = await this.getStatus(jobId);

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
  }

  async scanByUrl(fileUrl: string): Promise<FileStatus> {
    const response = await this.client.post(`webav/scan`, {
      file_url: fileUrl,
    });
    return await response.json();
  }
}

export function createWebAV(apiKey?: string, apiSecret?: string) {
  return new WebAV(apiKey, apiSecret);
}
