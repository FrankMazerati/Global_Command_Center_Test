/**
 * Minimal ZIP reader used to open real OOXML documents in the browser.
 *
 * It reads the central directory and inflates entries with the native
 * DecompressionStream('deflate-raw') API, so no third-party archive library is required.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

export class ZipError extends Error {}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new ZipError(
      "This browser cannot decompress Office documents. Download the file to open it.",
    );
  }
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const searchFloor = Math.max(0, bytes.length - 66_000);
  for (let index = bytes.length - 22; index >= searchFloor; index -= 1) {
    if (view.getUint32(index, true) === EOCD_SIGNATURE) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new ZipError("This file is not a readable ZIP-based document.");

  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);

    if (!name.endsWith("/")) {
      files.set(name, method === 0 ? data : await inflateRaw(data));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

export function readText(files: Map<string, Uint8Array>, path: string): string | null {
  const entry = files.get(path);
  if (!entry) return null;
  return new TextDecoder().decode(entry);
}

export function parseXml(source: string): Document | null {
  if (typeof DOMParser === "undefined") return null;
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.getElementsByTagName("parsererror").length > 0) return null;
  return document;
}
