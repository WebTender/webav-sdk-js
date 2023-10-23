import WebAV from "@webtender/webav-sdk-js";
import dotenv from "dotenv";
dotenv.config();

(async () => {
  const av = new WebAV();

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
  // to get notified when a file is ready
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
