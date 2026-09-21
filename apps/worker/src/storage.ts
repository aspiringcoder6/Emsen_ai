import { createHash, createHmac } from "node:crypto";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { workerConfig } from "./config.js";

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
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

function objectUrl(objectKey: string) {
  const endpoint = new URL(workerConfig.storage.endpoint);
  const basePath = endpoint.pathname.replace(/\/$/, "");
  const encodedKey = objectKey.split("/").map(encode).join("/");
  return new URL(`${endpoint.protocol}//${endpoint.host}${basePath}/${encode(workerConfig.storage.bucket)}/${encodedKey}`);
}

function authorization(url: URL, method: "DELETE" | "GET") {
  const amzDate = timestamp(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${workerConfig.storage.region}/s3/aws4_request`;
  const dateKey = hmac(`AWS4${workerConfig.storage.secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, workerConfig.storage.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hash(canonicalRequest)}`;
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${workerConfig.storage.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
}

export async function downloadMediaObject(objectKey: string, destination: string) {
  if (!workerConfig.storage.endpoint || !workerConfig.storage.accessKey || !workerConfig.storage.secretKey || !workerConfig.storage.bucket) {
    throw new Error("Kho lưu trữ video chưa được cấu hình cho worker.");
  }
  const url = objectUrl(objectKey);
  const response = await fetch(url, { headers: authorization(url, "GET") });
  if (!response.ok || !response.body) {
    throw new Error(`Không đọc được video thô từ kho lưu trữ (${response.status}).`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination, { flags: "wx" }));
}

export async function deleteMediaObject(objectKey: string) {
  const url = objectUrl(objectKey);
  const response = await fetch(url, { headers: authorization(url, "DELETE"), method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Không xóa được video lỗi khỏi kho lưu trữ (${response.status}).`);
  }
}
