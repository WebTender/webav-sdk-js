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

  async scanByUpload(file: string | Buffer | ReadStream | File, fileName: string, mimeType?: string): Promise<FileStatus> {
    let blob = new Blob();
    if (typeof file === "string") {
      blob = new Blob([Buffer.from(file, "base64")], { type: mimeType });
    } else if (file instanceof Buffer) {
      blob = new Blob([file], { type: mimeType });
    } else {
      blob = await streamToBlob(file as ReadStream, mimeType);
    }

    const formData = new FormData();
    formData.append("file", blob, fileName);
    const request = await this.client.post(`webav/scan`, formData);

    return await request.json();
  }

  async getStatus(jobId: string): Promise<FileStatus> {
    const request = await this.client.get(`webav/status/${jobId}`);
    return request.json();
  }

  async getRecentStatuses(page?: number): Promise<PaginatedFiles> {
    const request = await this.client.get(`webav/status`, { page });
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

function streamToBlob(stream: ReadStream, mimeType?: string) {
  if (mimeType !== undefined && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string or undefined')
  }
  return new Promise<Blob>((resolve, reject) => {
    const chunks = []
    stream
      .on('data', chunk => chunks.push(chunk))
      .once('end', () => {
        const blob = mimeType !== undefined
          ? new Blob(chunks, { type: mimeType })
          : new Blob(chunks)
        resolve(blob)
      })
      .once('error', reject)
  })
}
