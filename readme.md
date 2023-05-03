# WebAV SDK for JavaScript / TypeScript

## Features

Scan user uploaded files for viruses using the [WebTender](https://webtender.host) [WebAV API](https://webav.io). Improve the security of your application by scanning files for viruses before they are served to your users.

- Scan files by URL
- Scan files by uploading
- Query file status
- Get recently scanned files

TypeScript support!


## Installation

```bash
npm install --save @webtender/webav-sdk-js
```

```bash
pnpm install @webtender/webav-sdk-js
```

```bash
yarn add @webtender/webav-sdk-js
```

## Get your API Key

You can get your API key from the [WebTender Console](https://console.webtender.host)

> View pricing [here](https://webav.io/pricing)

## Usage

```typescript
import { createWebAV, VIRUS_STATUS_PENDING } from '@webtender/webav-sdk-js';

(async () => {
  const av = createWebAV(process.env.WEB_TENDER_API_KEY);

  // You can scan by a public URL, e.g. a signed S3 url.
  const queuedFile = await av.scanByUrl("https://link.testfile.org/15MB");

  // The file is queued, it will be scanned asynchronously.
  // You can expect most files to be ready in a few seconds.
  console.log(
    queuedFile.id, // UUID
    queuedFile.virus_status_label, // Label status as a string ("Pending")
    queuedFile.virus_status // Integer status code (0 => VIRUS_STATUS_PENDING)
  );

  // You can subscribe to a webhook via the WebTender Console
  // to get notified when the file is ready
  // ...
  // Or, after some time you can query the status of the file
  const fileStatus = await av.getStatus(queuedFile.id);

  // Or await the result, this may take several minutes for large files
  const scanResult = await av.waitFor(queuedFile.id);
  console.log(scanResult.virus_status_label); // Hopefully => "Passed"

  // Get recently scanned files
  const paginatedFiles = await av.getRecentStatuses();
  for (const fileStatus of paginatedFiles.data) {
    console.log(
      fileStatus.id,
      fileStatus.virus_status_label,
      fileStatus.virus_status
    );
  }

  /*
  PaginatedFiles contains the following properties:
    data: FileStatus[];
    last_page: number;
    per_page: number;
    current_page: number;
    total: number;
  */
})();
```

## Security Notice

This package is intended to be used on your server, DO NOT provide your API key to end-users!