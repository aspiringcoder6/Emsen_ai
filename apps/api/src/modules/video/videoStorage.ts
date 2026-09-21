import { createHash, createHmac } from "node:crypto";
import { config } from "../../config.js";
import { HttpError } from "../../shared/http.js";

let bucketReady = false;

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectKey(value: string) {
  return value.split("/").map(encode).join("/");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function timestamp(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signingKey(dateStamp: string) {
  const dateKey = hmac(`AWS4${config.mediaStorage.secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, config.mediaStorage.region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function storageUrl(objectKey?: string) {
  const endpoint = new URL(config.mediaStorage.endpoint);
  const basePath = endpoint.pathname.replace(/\/$/, "");
  const path = `${basePath}/${encode(config.mediaStorage.bucket)}${objectKey ? `/${encodeObjectKey(objectKey)}` : ""}`;
  return new URL(`${endpoint.protocol}//${endpoint.host}${path}`);
}

function signature(params: {
  amzDate: string;
  canonicalRequest: string;
  dateStamp: string;
}) {
  const scope = `${params.dateStamp}/${config.mediaStorage.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${params.amzDate}\n${scope}\n${hash(params.canonicalRequest)}`;
  return createHmac("sha256", signingKey(params.dateStamp)).update(stringToSign).digest("hex");
}

async function signedRequest(method: "DELETE" | "HEAD" | "PUT", objectKey?: string) {
  const url = storageUrl(objectKey);
  const now = new Date();
  const amzDate = timestamp(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${config.mediaStorage.region}/s3/aws4_request`;
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.mediaStorage.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature({ amzDate, canonicalRequest, dateStamp })}`;
  return fetch(url, {
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    method,
  });
}

function requireStorage() {
  if (!config.mediaStorage.enabled) {
    throw new HttpError(
      503,
      "MEDIA_STORAGE_NOT_CONFIGURED",
      "Kho lưu trữ video chưa được kết nối. Bạn vẫn có thể tạo dự án và tải video lên sau.",
    );
  }
}

export function mediaStorageConfigured() {
  return config.mediaStorage.enabled;
}

export async function ensureMediaBucket() {
  requireStorage();
  if (bucketReady || !config.mediaStorage.autoCreateBucket) return;
  try {
    const existing = await signedRequest("HEAD");
    if (existing.ok) {
      bucketReady = true;
      return;
    }
    if (existing.status !== 404) {
      throw new Error(`Bucket check failed with ${existing.status}`);
    }
    const created = await signedRequest("PUT");
    if (!created.ok && created.status !== 409) {
      throw new Error(`Bucket creation failed with ${created.status}`);
    }
    bucketReady = true;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      503,
      "MEDIA_STORAGE_UNAVAILABLE",
      "Kho lưu trữ video chưa phản hồi. Vui lòng thử lại sau.",
    );
  }
}

export function createVideoUploadUrl(objectKey: string) {
  const ticket = createPresignedObjectUrl("PUT", objectKey);
  return { expiresAt: ticket.expiresAt, uploadUrl: ticket.url };
}

function createPresignedObjectUrl(method: "GET" | "PUT", objectKey: string) {
  requireStorage();
  const url = storageUrl(objectKey);
  const now = new Date();
  const amzDate = timestamp(now);
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${config.mediaStorage.region}/s3/aws4_request`;
  const query = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${config.mediaStorage.accessKey}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(config.mediaStorage.uploadExpiresSeconds)],
    ["X-Amz-SignedHeaders", "host"],
  ].map(([key, value]) => `${encode(key!)}=${encode(value!)}`).sort().join("&");
  const canonicalRequest = [
    method,
    url.pathname,
    query,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const objectSignature = signature({ amzDate, canonicalRequest, dateStamp });
  return {
    expiresAt: new Date(now.getTime() + config.mediaStorage.uploadExpiresSeconds * 1_000).toISOString(),
    url: `${url.toString()}?${query}&X-Amz-Signature=${objectSignature}`,
  };
}

export function createVideoPlaybackUrl(objectKey: string) {
  const ticket = createPresignedObjectUrl("GET", objectKey);
  return { expiresAt: ticket.expiresAt, playbackUrl: ticket.url };
}

export async function inspectVideoObject(objectKey: string) {
  requireStorage();
  try {
    const response = await signedRequest("HEAD", objectKey);
    if (response.status === 404) {
      throw new HttpError(409, "VIDEO_UPLOAD_NOT_FOUND", "Video chưa tải lên hoàn tất. Hãy thử tải lại tệp này.");
    }
    if (!response.ok) throw new Error(`Object check failed with ${response.status}`);
    const sizeBytes = Number(response.headers.get("content-length"));
    return {
      etag: response.headers.get("etag")?.replaceAll('"', "") ?? null,
      mimeType: response.headers.get("content-type"),
      sizeBytes: Number.isSafeInteger(sizeBytes) ? sizeBytes : null,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      503,
      "MEDIA_STORAGE_UNAVAILABLE",
      "Chưa thể xác nhận video trong kho lưu trữ. Vui lòng thử lại.",
    );
  }
}

export async function deleteVideoObject(objectKey: string) {
  requireStorage();
  const response = await signedRequest("DELETE", objectKey);
  if (!response.ok && response.status !== 404) {
    throw new HttpError(503, "MEDIA_STORAGE_UNAVAILABLE", "Chưa thể xóa video khỏi kho lưu trữ.");
  }
}
