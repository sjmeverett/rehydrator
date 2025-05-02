export type AnyFn = (...input: any[]) => any;

export interface FnCall {
  name: string;
  args: unknown[];
}

export type FnCallSerializer = (call: FnCall) => unknown;
export type FnCallDeserializer = (data: unknown) => FnCall | undefined;

export interface FormatOptions {
  serialize: FnCallSerializer;
  deserialize: FnCallDeserializer;
}

export function createFormat({ serialize, deserialize }: FormatOptions) {
  return {
    serializable<Name extends string, Fn extends AnyFn>(
      name: Name,
      fn: Fn,
    ): Fn {
      return {
        [name]: ((...args) => {
          const result = fn(...args);

          return Object.assign(result, {
            toJSON() {
              return serialize({ name, args });
            },
          });
        }) as Fn,
      }[name];
    },

    createReviver(functions: AnyFn[]) {
      const map = new Map<string, AnyFn>();

      for (const fn of functions) {
        if (map.has(fn.name)) {
          throw new Error(`Duplicate function name "${fn.name}"`);
        }
        map.set(fn.name, fn);
      }

      return (_key: string, value: unknown) => {
        const call = deserialize(value);

        if (call) {
          const fn = map.get(call.name);

          if (!fn) {
            throw new Error(
              `Tried to deserialize unknown function call ${call.name}`,
            );
          }

          return fn(...call.args);
        }

        return value;
      };
    },
  };
}

export const defaultFormat = {
  serialize(call) {
    return { __fn: call.name, input: call.args };
  },

  deserialize(obj) {
    if (
      obj !== null &&
      typeof obj === "object" &&
      !Array.isArray(obj) &&
      Object.keys(obj).length === 2 &&
      "__fn" in obj &&
      typeof obj.__fn === "string" &&
      "input" in obj &&
      Array.isArray(obj.input)
    ) {
      return { name: obj.__fn, args: obj.input };
    } else {
      return undefined;
    }
  },
} satisfies FormatOptions;

export const shortFormat = {
  serialize(call) {
    return { [`$${call.name}`]: call.args };
  },

  deserialize(obj) {
    if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
      const keys = Object.keys(obj);
      const args = (obj as Record<string, unknown>)[keys[0]];

      if (keys.length === 1 && keys[0].startsWith("$") && Array.isArray(args)) {
        return { name: keys[0].substring(1), args };
      }
    }
  },
} satisfies FormatOptions;

const { serializable, createReviver } = createFormat(defaultFormat);

export { serializable, createReviver };
