import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { JSONData, parse } from "./json.ts";
import type { JSONDataInnerObj, JSONValue } from "./json.ts";

const testCase: [string, string, JSONDataInnerObj, JSONValue][] = [
  ["simple json object", '{"hoge":"fuga","foo":"bar"}', {
    type: "root",
    value: {
      type: "object",
      item: [
        {
          type: "pair",
          key: "hoge",
          value: "fuga",
          space: {
            afterKey: "",
            afterValue: "",
            beforeKey: "",
            beforeValue: "",
          },
        },
        {
          type: "pair",
          key: "foo",
          value: "bar",
          space: {
            afterKey: "",
            afterValue: "",
            beforeKey: "",
            beforeValue: "",
          },
        },
      ],
    },
    space: { st: "", en: "" },
  }, { hoge: "fuga", foo: "bar" }],
  ["new lined json object", '{\n"hoge":"fuga"\n,"foo"\n:\n"bar"}\n', {
    type: "root",
    value: {
      type: "object",
      item: [
        {
          type: "pair",
          key: "hoge",
          value: "fuga",
          space: {
            afterKey: "",
            afterValue: "\n",
            beforeKey: "\n",
            beforeValue: "",
          },
        },
        {
          type: "pair",
          key: "foo",
          value: "bar",
          space: {
            afterKey: "\n",
            afterValue: "",
            beforeKey: "",
            beforeValue: "\n",
          },
        },
      ],
    },
    space: { st: "", en: "\n" },
  }, { hoge: "fuga", foo: "bar" }],
];

describe("success json parse", () => {
  testCase.forEach(([message, json, obj]) => {
    it(message, () => {
      assertEquals(parse(json).valueOf(), obj, `failed ${message}`);
    });
  });
});
describe("success generate json object", () => {
  testCase.forEach(([message, _, obj, result]) => {
    it(message, () => {
      assertEquals(new JSONData(obj).toObject(), result, `failed ${message}`);
    });
  });
});
describe("success json stringify", () => {
  testCase.forEach(([message, json, obj]) => {
    it(message, () => {
      assertEquals(new JSONData(obj).stringify(), json, `failed ${message}`);
    });
  });
});

const tinyTestcase: [string, string][] = [
  ["simple json object", '{"hoge":"fuga","foo":"bar"}'],
  ["simple json array", '["hoge",0,null,true,false]'],
  ["empty json array", "[,,]"],
  ["commaed json array", '{"hoge":"fuga",}'],
  ["simple json object with space", '{ "hoge": "fuga", "foo"  :  500  }'],
  ["simple json array with space", '[ "hoge" , 0 ,null ,true  , false  ]'],
];

describe("success json regenerate", () => {
  tinyTestcase.forEach(([message, json]) => {
    it(message, () => {
      assertEquals(parse(json).stringify(), json, `failed ${message}`);
    });
  });
});

const editTestcase: [
  string,
  string,
  (string | number)[],
  JSONValue,
  string,
][] = [
  [
    "simple json object",
    '{"hoge":"fuga","foo":"bar"}',
    ["hoge"],
    "piyo",
    '{"hoge":"piyo","foo":"bar"}',
  ],
  [
    "add json object",
    '{"hoge":"fuga","foo":"bar"}',
    ["mono"],
    "piyo",
    '{"hoge":"fuga","foo":"bar","mono":"piyo"}',
  ],
  [
    "simple json array",
    '["hoge",0,null,true,false]',
    [1],
    500,
    '["hoge",500,null,true,false]',
  ],
  [
    "add json array",
    '["hoge",0,null,true,false]',
    [6],
    500,
    '["hoge",0,null,true,false,,500]',
  ],
];

describe("success json regenerate", () => {
  editTestcase.forEach(([message, json, keys, value, afterJson]) => {
    it(message, () => {
      const js = parse(json);
      js.edit(keys, value);
      assertEquals(js.stringify(), afterJson, `failed ${message}`);
    });
  });
});

const eachTestcase: [string, string, (string | number)[], string][] = [
  [
    "simple json object",
    '{"hoge":"fuga","foo":"bar"}',
    [],
    '{"hoge":"xxx","foo":"xxx"}',
  ],
  [
    "nested json object",
    '{"hoge":"fuga","foo":{"piyo":"piyo"}}',
    ["foo"],
    '{"hoge":"fuga","foo":{"piyo":"xxx"}}',
  ],
  [
    "simple json array",
    '["hoge",0,null,true,false]',
    [],
    '["xxx","xxx","xxx","xxx","xxx"]',
  ],
  ["empty json array", "[,,]", [], '["xxx","xxx","xxx"]'],
];

describe("success json each", () => {
  eachTestcase.forEach(([message, json, keys, afterJson]) => {
    it(message, () => {
      const js = parse(json);
      js.eachPatch(keys, (_) => "xxx");
      assertEquals(js.stringify(), afterJson, `failed ${message}`);
    });
  });
});
