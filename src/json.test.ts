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
  ["nested object", '{"hoge":{"fuga":{"piyo":"foo"}}}', {
    type: "root",
    value: {
      type: "object",
      item: [
        {
          type: "pair",
          key: "hoge",
          value: {
            type: "object",
            item: [
              {
                type: "pair",
                key: "fuga",
                value: {
                  type: "object",
                  item: [{
                    type: "pair",
                    key: "piyo",
                    value: "foo",
                    space: {
                      afterKey: "",
                      afterValue: "",
                      beforeKey: "",
                      beforeValue: "",
                    },
                  }],
                },
                space: {
                  afterKey: "",
                  afterValue: "",
                  beforeKey: "",
                  beforeValue: "",
                },
              },
            ],
          },
          space: {
            afterKey: "",
            afterValue: "",
            beforeKey: "",
            beforeValue: "",
          },
        },
      ],
    },
    space: {
      st: "",
      en: "",
    },
  }, { hoge: { fuga: { piyo: "foo" } } }],
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

const editTestcase: {
  message: string,
  jsonText: string,
  keys: (string | number)[],
  value: JSONValue, 
  afterValue: JSONValue,
  afterJsonText: string,
}[] = [
  {
    message: "simple json object",
    jsonText: '{"hoge":"fuga","foo":"bar"}',
    keys: ["hoge"],
    value: "fuga",
    afterValue: "piyo",
    afterJsonText: '{"hoge":"piyo","foo":"bar"}',
  },
  {
    message: "add json object",
    jsonText: '{"hoge":"fuga","foo":"bar"}',
    keys: ["mono"],
    value: undefined, 
    afterValue: "piyo",
    afterJsonText: '{"hoge":"fuga","foo":"bar","mono":"piyo"}',
  },
  {
    message: "simple json array",
    jsonText: '["hoge",0,null,true,false]',
    keys: [1],
    value: 0,
    afterValue: 500,
    afterJsonText: '["hoge",500,null,true,false]',
  },
  {
    message: "add json array",
    jsonText: '["hoge",0,null,true,false]',
    keys: [6],
    value: undefined,
    afterValue: 500,
    afterJsonText: '["hoge",0,null,true,false,,500]',
  },
  {
    message: "nested json object",
    jsonText: '{"hoge":"fuga","foo":{"bar":"piyo"}}',
    keys: ["foo"],
    value: {bar: "piyo"},
    afterValue: "piyo",
    afterJsonText: '{"hoge":"fuga","foo":"piyo"}',
  },
];

describe("success json value", () => {
  editTestcase.forEach(({message, jsonText, keys, value}) => {
    it(message, () => {
      const js = parse(jsonText);
      assertEquals(js.get(keys), value, `failed ${message}`);
    });
  });
});

describe("success json regenerate", () => {
  editTestcase.forEach(({message, jsonText, keys, afterValue, afterJsonText}) => {
    it(message, () => {
      const js = parse(jsonText);
      js.edit(keys, afterValue);
      assertEquals(js.stringify(), afterJsonText, `failed ${message}`);
    });
  });
});

const eachTestcase: {
  message: string
  jsonText: string
  keys: (string | number)[]
  xxxEdited: string
}[] = [
  {
    message: "simple json object",
    jsonText: '{"hoge":"fuga","foo":"bar"}',
    keys: [],
    xxxEdited: '{"hoge":"xxx","foo":"xxx"}',
  },
  {
    message: "nested json object",
    jsonText: '{"hoge":"fuga","foo":{"piyo":"piyo"}}',
    keys: ["foo"],
    xxxEdited: '{"hoge":"fuga","foo":{"piyo":"xxx"}}',
  },
  {
    message: "simple json array",
    jsonText: '["hoge",0,null,true,false]',
    keys: [],
    xxxEdited: '["xxx","xxx","xxx","xxx","xxx"]',
  },
  {
    message: "empty json array",
    jsonText: "[,,]",
    keys: [],
    xxxEdited: '["xxx","xxx","xxx"]'
  },
];

describe("success json each", () => {
  eachTestcase.forEach(({message, jsonText, keys, xxxEdited}) => {
    it(message, () => {
      const js = parse(jsonText);
      js.eachPatch(keys, (_) => "xxx");
      assertEquals(js.stringify(), xxxEdited, `failed ${message}`);
    });
  });
});
