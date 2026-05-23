import fs from "fs";
import type { Request, Response } from "express";

export function serveCommsMediaWithRange(
  req: Request,
  res: Response,
  filePath: string,
  mime: string,
  baseName: string,
  options?: { forceDownload?: boolean },
): void {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const forceDownload = options?.forceDownload ?? String(req.query.download || "") === "1";

  const setDisposition = () => {
    if (forceDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(baseName)}"`);
      return;
    }
    if (
      mime.startsWith("application/pdf") ||
      mime.startsWith("text/html") ||
      mime.startsWith("text/plain") ||
      mime.startsWith("text/csv") ||
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime.startsWith("audio/") ||
      mime.startsWith("model/") ||
      mime.includes("epub")
    ) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(baseName)}"`);
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(baseName)}"`);
    }
  };

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      res.end();
      return;
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      res.end();
      return;
    }

    end = Math.min(end, fileSize - 1);
    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunkSize);
    res.setHeader("Content-Type", mime);
    setDisposition();
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Length", fileSize);
  res.setHeader("Content-Type", mime);
  setDisposition();
  res.sendFile(filePath);
}
