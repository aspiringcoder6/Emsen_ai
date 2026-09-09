import { HttpError } from "../../shared/http.js";

export function parsePhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");

  if (/^0\d{9}$/.test(compact)) {
    return `+84${compact.slice(1)}`;
  }
  if (/^84\d{9}$/.test(compact)) {
    return `+${compact}`;
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  throw new HttpError(
    400,
    "INVALID_PHONE_NUMBER",
    "Vui lòng nhập số điện thoại hợp lệ, ví dụ 0912 345 678.",
  );
}
