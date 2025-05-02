# Rehydrator

`rehydrator` lets you serialize otherwise unserializable values by capturing the
function call that generated them -- not just the output.

Great for DSLs, schema systems, and anywhere you want portable, replayable intent.

## Install

```bash
npm i -S rehydrator
```

## Usage

```ts
import { serializable, createReviver } from "rehydrator";

const date = serializable("date", (iso: str) => new Date(iso));

const data = {
  name: "Gabe Newell",
  dob: date("1962-11-03"),
};

const json = JSON.stringify(data);

// json = '{name: "Gabe Newell", dob: {__fn: "date", input: ["1962-11-03"]}}'

const rehydrated = JSON.parse(json, createReviver([date]));

assert(rehydrated.dob instanceof Date); // works!
```

That's basically it!

## Use for DSLs

This library is especially handy for DSLs, validators, or any structured
function-based system.

For example, a simple zod-style validator:

```ts
function string() {
  return (obj: unknown): obj is string => typeof obj === "string";
}

const schema = string();
```

Since `schema` is a function, ordinarily it wouldn't be serializable,
so we couldn't store a schema in a database for example.

However, with `rehydrator`, we can make it serializable:

```ts
const string = serializable(
  "string",
  () =>
    (obj: unknown): obj is string =>
      typeof obj === "string",
);

const schema = string();

const json = JSON.stringify(schema);

// json = '{"__fn": "string", "input": []}'
```

Now your schema is fully portable — you can store it in a database, share it
across environments, or reconstruct it on-demand.

## How does it work?

`serializable` wraps the function with another function that adds a `toJSON`
method to the original function's return value. `JSON.stringify` automatically
calls `toJSON` methods if they exist, which in this case will return a meta
object describing the function call, rather than the value itself.
