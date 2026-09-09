import assert from "node:assert/strict";
import test from "node:test";
import { parsePhoneNumber } from "../src/modules/auth/phoneNumber.js";

test("normalizes Vietnamese local phone numbers", () => {
  assert.equal(parsePhoneNumber("0912 345 678"), "+84912345678");
  assert.equal(parsePhoneNumber("84 912-345-678"), "+84912345678");
});

test("keeps valid E.164 phone numbers", () => {
  assert.equal(parsePhoneNumber("+1 (415) 555-2671"), "+14155552671");
});

test("rejects invalid phone numbers", () => {
  assert.throws(() => parsePhoneNumber("09123"), /Vui lòng nhập số điện thoại hợp lệ/);
});
