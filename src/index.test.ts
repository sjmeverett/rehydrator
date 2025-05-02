import test from "node:test";
import assert from "node:assert/strict";
import {
  serializable,
  createReviver,
  createFormat,
  shortFormat,
} from "./index.ts";

const string = serializable(
  "string",
  () => (v: unknown) => typeof v === "string",
);

const date = serializable("date", (iso) => new Date(iso));

const object = serializable(
  "object",
  (shape: Record<string, Function>) => (obj: any) =>
    typeof obj === "object" &&
    obj !== null &&
    Object.entries(shape).every(([k, v]) => v(obj[k])),
);

test("serializes and rehydrates a simple function call", () => {
  const schema = string();
  const json = JSON.stringify(schema);
  const revived = JSON.parse(json, createReviver([string]));
  assert.equal(revived("hello"), true);
  assert.equal(revived(123), false);
});

test("serializes and rehydrates a function with an argument", () => {
  const d = date("2020-01-01T00:00:00.000Z");
  const json = JSON.stringify(d);
  const revived = JSON.parse(json, createReviver([date]));
  assert.ok(revived instanceof Date);
  assert.equal(revived.toISOString(), "2020-01-01T00:00:00.000Z");
});

test("fails to rehydrate unknown function name", () => {
  const invalid = JSON.stringify({ __fn: "nonexistent", input: [] });

  assert.throws(() => {
    JSON.parse(invalid, createReviver([]));
  }, /unknown function call nonexistent/);
});

test("supports nested function values", () => {
  const schema = object({ name: string() });
  const json = JSON.stringify(schema);
  const revived = JSON.parse(json, createReviver([object, string]));
  assert.equal(revived({ name: "Alice" }), true);
  assert.equal(revived({ name: 123 }), false);
});

test("does not affect plain objects", () => {
  const input = { foo: "bar" };
  const json = JSON.stringify(input);
  const output = JSON.parse(json, createReviver([]));
  assert.deepEqual(output, input);
});

test("can rehydrate multiple registered functions", () => {
  const d = date("1999-12-31T23:59:59.999Z");
  const s = string();
  const json = JSON.stringify({ d, s });
  const revived = JSON.parse(json, createReviver([date, string]));
  assert.ok(revived.d instanceof Date);
  assert.equal(revived.s("test"), true);
});

test("shortFormat: serializes and deserializes a function call", () => {
  const { serializable, createReviver } = createFormat(shortFormat);

  const date = serializable("date", (iso: string) => new Date(iso));
  const json = JSON.stringify(date("1999-12-31"));

  assert.equal(json, JSON.stringify({ $date: ["1999-12-31"] }));

  const revive = createReviver([date]);
  const revived = JSON.parse(json, revive) as Date;
  assert.equal(revived.valueOf(), new Date("1999-12-31").valueOf());
});
