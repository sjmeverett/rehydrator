export type AnyFn = (...input: any[]) => any;

export interface SerializedCall {
  __fn: string;
  input: unknown[];
}

export function serializable<Name extends string, Fn extends AnyFn>(
  name: Name,
  fn: Fn,
): Fn {
  return {
    [name]: ((...input) => {
      const result = fn(...input);

      return Object.assign(result, {
        toJSON(): SerializedCall {
          return {
            __fn: name,
            input,
          };
        },
      });
    }) as Fn,
  }[name];
}

export function isSerializedCall(obj: unknown): obj is SerializedCall {
  return (
    obj !== null &&
    typeof obj === "object" &&
    Object.keys(obj).length === 2 &&
    "__fn" in obj &&
    typeof obj.__fn === "string" &&
    "input" in obj &&
    Array.isArray(obj.input)
  );
}

export function createReviver(functions: AnyFn[]) {
  const map = new Map(functions.map((fn) => [fn.name, fn]));

  return (_key: string, value: unknown) => {
    if (isSerializedCall(value)) {
      const fn = map.get(value.__fn);

      if (!fn) {
        throw new Error(
          `Tried to deserialize unknown function call ${value.__fn}`,
        );
      }

      return fn(...value.input);
    }

    return value;
  };
}
