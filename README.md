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

## Formats

The default format is designed to minimize the chances of interpreting arbitrary
JSON data as a function call to be deserialized. The default deserializer
treats an object as a function call if it looks like the following:

```json
{ "__fn": "myFunctionName", "input": ["arg1", "arg2"] }
```

This is a bit verbose though, so I also defined a "short format", which looks
like this:

```json
{ "$myFunctionName": ["arg1", "arg2"] }
```

If the data you're serializing contains arbitrary object keys that start with
`$` and might be arrays, then this format will not be suitable, as the
deserializer will incorrectly guess that arbitrary data is a function call
to be deserialized. Otherwise, to use:

```ts
import { createFormat, shortFormat } from "rehydrator";

const { serializable, createReviver } = createFormat(shortFormat);

// use as normal
```

As an example of when not to use this format, perhaps you're defining some
sort of mongodb-style query language that uses special keys prefixed with `$`
signs:

```ts
const expr = serializable("expr", (options) => {
  /* ... */
});

// when this gets serialized, it will be:
// {"$expr": [{"$and": [1, 2]}]}
const data = expr({ $and: [1, 2] });
```

When this gets deserialized again, it will want to find a function called `and`,
which is probably not what you want.

### Custom formats

You can also create your own formats, by passing serializer and deserializer
functions to `createFormat`.
