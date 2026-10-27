import test from "node:test";
import assert from "node:assert/strict";
import { convertInteger } from "../public/converter.mjs";

test("converts hexadecimal, binary and octal through a shared integer", () => {
  assert.deepEqual(convertInteger("2a", 16), { 2: "101010", 8: "52", 10: "42", 16: "2A" });
  assert.equal(convertInteger("-101010", 2)[10], "-42");
  assert.equal(convertInteger("52", 8)[16], "2A");
});

test("rejects digits outside the selected base", () => {
  assert.throws(() => convertInteger("102", 2), /base-2/);
  assert.throws(() => convertInteger("", 10), /Enter an integer/);
});
