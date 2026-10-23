import { Ajv, ValidateFunction } from "ajv";

// Vendored FUB schemas include OpenAPI annotations and int32 formats. Types,
// required fields, enums and bounds are enforced; no coercion/default mutation.
const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: false });
const validators = new WeakMap<object, ValidateFunction>();
export const MAX_INPUT_BYTES = 256 * 1024;

export function boundInput(input: unknown): void {
  let elements = 0;
  function visit(value: unknown, depth: number): void {
    if (++elements > 10_000 || depth > 20) throw new Error("Tool input is too complex.");
    if (value && typeof value === "object") {
      if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("Tool input must be plain JSON.");
      for (const [key, child] of Object.entries(value)) {
        if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Unsafe property name in tool input.");
        visit(child, depth + 1);
      }
    }
  }
  visit(input, 0);
  if (Buffer.byteLength(JSON.stringify(input) ?? "") > MAX_INPUT_BYTES) throw new Error("Tool input exceeds 256 KiB.");
}

export function validateInput(tool: object, schema: object, args: unknown): void {
  boundInput(args);
  let validate = validators.get(tool);
  if (!validate) {
    validate = ajv.compile(schema);
    validators.set(tool, validate);
  }
  if (!validate(args)) throw new Error("Invalid tool arguments: check required fields, types, allowed fields and value limits.");
}
