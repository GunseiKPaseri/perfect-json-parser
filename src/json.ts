import {
  type JSONInternal,
  type JSONInternalArray,
  type JSONInternalObject,
  JsonLexer,
  JsonParser,
  type JsonPrimitive,
} from "./json_parser.ts";

/**
 * Perfect internal representation of json, including whitespace
 */
export type JSONDataInnerObj = JSONInternal;

function stringifyJson(
  jsonobj: JSONDataInnerObj | JSONInternal["value"],
): string {
  if (typeof jsonobj === "object" && jsonobj !== null) {
    switch (jsonobj.type) {
      case "root": {
        return `${jsonobj.space.st}${
          stringifyJson(jsonobj.value)
        }${jsonobj.space.en}`;
      }
      case "array": {
        return `[${
          jsonobj.item.map((item) => {
            switch (item.type) {
              case "value":
                return `${item.spaceBeforeValue}${
                  stringifyJson(item.value)
                }${item.spaceAfterValue}`;
              case "empty":
                return item.space;
            }
          }).join(",")
        }]`;
      }
      case "object": {
        return `{${
          jsonobj.item.map((item) =>
            item.type === "empty"
              ? item.space
              : `${item.space.beforeKey ?? ""}${stringifyJson(item.key)}${
                item.space.afterKey ?? ""
              }:${item.space.beforeValue ?? ""}${stringifyJson(item.value)}${
                item.space.afterValue ?? ""
              }`
          )
        }}`;
      }
    }
  }
  // Json primitive
  return JSON.stringify(jsonobj);
}

type JSONArray = JSONValue[];
type JSONObject = { [key: string]: JSONValue };

/**
 * javascript object types compatible with json
 */
export type JSONValue =
  | JSONArray
  | JSONObject
  | JsonPrimitive
  | undefined;

function generateJsonObj(
  jsonobj: JSONDataInnerObj | JSONInternal["value"],
): JSONValue {
  if (typeof jsonobj === "object" && jsonobj !== null) {
    switch (jsonobj.type) {
      case "root": {
        return generateJsonObj(jsonobj.value);
      }
      case "array": {
        return jsonobj.item.map((item) => {
          switch (item.type) {
            case "value":
              return generateJsonObj(item.value);
            case "empty":
              return undefined;
          }
        });
      }
      case "object": {
        return Object.fromEntries(
          jsonobj.item.map((item) =>
            item.type === "pair" ? [item.key, generateJsonObj(item.value)] : []
          ),
        );
      }
    }
  }
  // Json primitive
  return jsonobj;
}

function fromJsonObj(obj: JSONValue): JSONInternal["value"] {
  if (Array.isArray(obj)) {
    return {
      type: "array",
      item: obj.map((value) => ({
        type: "value",
        value: fromJsonObj(value),
        spaceBeforeValue: "",
        spaceAfterValue: "",
      })),
    };
  } else if (obj === null || obj === undefined) {
    return null;
  } else if (typeof obj === "object") {
    return {
      type: "object",
      item: Object.entries(obj).map(([key, value]) => ({
        type: "pair",
        key,
        value: fromJsonObj(value),
        space: {
          beforeKey: "",
          afterKey: "",
          beforeValue: "",
          afterValue: "",
        },
      })),
    };
  }
  return obj;
}

function findObj(parent: JSONInternalObject, key: string | number) {
  for (const child of parent.item) {
    if (child.type === "empty") continue;
    if (child.key === key) {
      return child;
    }
  }
  return undefined;
}

function getJsonObj(
  jsonobj: JSONDataInnerObj,
  keys: (string | number)[],
) {
  if (keys.length === 0) {
    return jsonobj.value;
  }
  const parent = getJsonParentObj(jsonobj, keys);
  if (parent.type === "array") {
    const key = keys[keys.length - 1];
    if (typeof key !== "number") {
      return undefined;
    }
    const value = parent.item[key];
    if (value === undefined) return undefined;
    return value.type === "value" ? value.value : undefined;
  } else {
    const value = findObj(parent, keys[keys.length - 1]);
    return value === undefined ? undefined : value.value;
  }
}

function getJsonParentObj(
  jsonobj: JSONDataInnerObj,
  keys: (string | number)[],
) {
  if (typeof jsonobj.value !== "object" || jsonobj.value === null) {
    throw new Error("parent not found");
  }
  let obj: JSONInternalArray | JSONInternalObject = jsonobj.value;
  for (const key of keys.slice(0, -1)) {
    if (obj.type === "array") {
      if (typeof key !== "number") {
        throw new Error("parent not found");
      }
      const child = obj.item[key];
      if (typeof obj !== "object" || obj === null || child.type === "empty") {
        throw new Error("parent not found");
      }
      const value = child.value;
      if (typeof value !== "object" || value === null) {
        throw new Error("parent not found");
      }
      obj = value;
    } else {
      const result = findObj(obj, key);
      if (
        result === undefined || typeof result.value !== "object" ||
        result.value === null
      ) {
        throw new Error("parent not found");
      }
      obj = result.value;
    }
  }
  return obj;
}

// parser

const parser = new JsonParser();

function parseCore(
  text: string,
): ReturnType<InstanceType<typeof JsonParser>["json"]> {
  const lexingResult = JsonLexer.tokenize(text);
  parser.input = lexingResult.tokens;
  const p = parser.json();

  if (parser.errors.length > 0) {
    console.log(parser.errors);
    throw new Error(parser.errors.map((err) => err.message).join("\n"));
  }
  return p;
}

/**
 * parsed json struct
 */
export class JSONData {
  private jsonobj: JSONDataInnerObj;
  constructor(obj: JSONDataInnerObj) {
    this.jsonobj = obj;
  }
  /**
   * clone json
   * @returns cloned JSONObject
   */
  clone(): InstanceType<typeof JSONData> {
    return new JSONData(this.jsonobj);
  }
  /**
   * get as javascript object
   * @returns javascript object
   */
  valueOf(): JSONInternal {
    return Object.freeze(this.jsonobj);
  }
  /**
   * get as javascript object
   * @returns javascript object
   */
  toObject(): JSONValue {
    return generateJsonObj(this.jsonobj);
  }
  /**
   * edit each value
   * @keys
   * @returns generator
   */
  eachPatch(
    keys: (string | number)[],
    patch: (value: JSONValue, key: string | number) => JSONValue,
  ) {
    const values = getJsonObj(this.jsonobj, keys);
    if (typeof values !== "object" || values === null) return;
    let i = 0;
    for (const value of values.item) {
      switch (value.type) {
        case "value": {
          const patched = patch(generateJsonObj(value.value), i);
          value.value = fromJsonObj(patched);
          break;
        }
        case "pair": {
          const patched = patch(generateJsonObj(value.value), value.key);
          value.value = fromJsonObj(patched);
          break;
        }
        default: {
          // deno-lint-ignore no-explicit-any
          const expandedValue: any = value;
          delete expandedValue.space;
          delete expandedValue.type;
          const patched = patch(undefined, i);
          expandedValue.type = "value";
          expandedValue.value = patched;
          expandedValue.spaceBeforeValue = "";
          expandedValue.spaceAfterValue = "";
        }
      }
      i++;
    }
  }
  /**
   * get as json file
   * @returns json text
   */
  stringify(): string {
    return stringifyJson(this.jsonobj);
  }
  /**
   * edit json value
   * @param keys json key list
   * @param new value
   */
  edit(keys: (string | number)[], value: JSONValue) {
    const parent = getJsonParentObj(this.jsonobj, keys);
    const key = keys[keys.length - 1];
    if (parent.type === "array") {
      if (typeof key !== "number") {
        throw new Error("parent not found");
      }
      parent.item[key] = {
        type: "value",
        spaceBeforeValue: "",
        spaceAfterValue: "",
        value: fromJsonObj(value),
      };
    } else if (parent.type === "object" && typeof key === "string") {
      const targetObj = findObj(parent, key);
      if (targetObj === undefined) {
        parent.item = [...parent.item, {
          type: "pair",
          key,
          value: fromJsonObj(value),
          space: {
            beforeKey: "",
            afterKey: "",
            beforeValue: "",
            afterValue: "",
          },
        }];
      } else {
        targetObj.value = fromJsonObj(value);
      }
    }
  }

  /**
   * get javascript object
   * @param keys json key list
   * @returns javascript object
   */
  get(keys: (string | number)[]): JSONValue {
    const value = getJsonObj(this.jsonobj, keys);
    if (value === undefined) return undefined;
    return generateJsonObj(value);
  }
}

/**
 * parse json text
 * @param text Contents of json file
 * @returns parsed json object
 */
export function parse(text: string): InstanceType<typeof JSONData> {
  return new JSONData(parseCore(text));
}
