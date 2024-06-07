import { createToken, EmbeddedActionsParser, Lexer } from "chevrotain";

const True = createToken({ name: "True", pattern: /true/ });
const False = createToken({ name: "False", pattern: /false/ });
const Null = createToken({ name: "Null", pattern: /null/ });
const LCurly = createToken({ name: "LCurly", pattern: /{/, label: "'{'" });
const RCurly = createToken({ name: "RCurly", pattern: /}/, label: "'}'" });
const LSquare = createToken({ name: "LSquare", pattern: /\[/, label: "'['" });
const RSquare = createToken({ name: "RSquare", pattern: /]/, label: "']'" });
const Comma = createToken({ name: "Comma", pattern: /,/, label: "','" });
const Colon = createToken({ name: "Colon", pattern: /:/, label: "':'" });
const CommentBlock = createToken({
  name: "CommentBlock",
  pattern: /\/\*.*?\*\//,
});
const CommentLine = createToken({ name: "CommentLine", pattern: /\/\/.*?\n/ });
const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
});
const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
});
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
});

const jsonTokens = [
  WhiteSpace,
  NumberLiteral,
  StringLiteral,
  RCurly,
  LCurly,
  LSquare,
  RSquare,
  Comma,
  Colon,
  CommentBlock,
  CommentLine,
  True,
  False,
  Null,
];

export const JsonLexer = new Lexer(jsonTokens);

// ----------------- parser -----------------

export type JsonPrimitive = string | number | boolean | null;

export type JSONInternalArrayItem =
  | {
    type: "value";
    value: JSONInternalValue;
    spaceBeforeValue: string;
    spaceAfterValue: string;
  }
  | { type: "empty"; space: string };
export type JSONInternalArray = {
  type: "array";
  item: JSONInternalArrayItem[];
};

export type JSONInternalValue =
  | JsonPrimitive
  | JSONInternalObject
  | JSONInternalArray;

export type JSONInternalObjectItem = {
  type: "pair";
  key: string;
  value: JSONInternalValue;
  space: {
    beforeKey: string;
    afterKey: string;
    beforeValue: string;
    afterValue: string;
  };
} | { type: "empty"; space: string };

export type JSONInternalObject = {
  type: "object";
  item: JSONInternalObjectItem[];
};

export type JSONInternal = {
  type: "root";
  space: { st: string; en: string };
  value: JsonPrimitive | JSONInternalArray | JSONInternalValue;
};

export class JsonParser extends EmbeddedActionsParser {
  constructor() {
    super(jsonTokens, { recoveryEnabled: true });
    // very important to call this after all the rules have been setup.
    // otherwise the parser may not work correctly as it will lack information
    // derived from the self analysis.
    this.performSelfAnalysis();
  }

  public json: () => JSONInternal = this.RULE("json", () => {
    const st = this.SUBRULE(this.ignoredText);
    const value = this.OR([
      { ALT: () => this.SUBRULE(this.object) },
      { ALT: () => this.SUBRULE(this.array) },
    ]);
    const en = this.SUBRULE2(this.ignoredText);
    return { type: "root" as const, value, space: { en, st } };
  });

  public object: () => JSONInternalObject = this.RULE("object", () => {
    // uncomment the debugger statement and open dev tools in chrome/firefox
    // to debug the parsing flow.
    // debugger;
    const item: JSONInternalObjectItem[] = [];

    this.CONSUME(LCurly);
    this.MANY_SEP({
      SEP: Comma,
      DEF: () => {
        item.push(this.SUBRULE(this.objectItem));
      },
    });
    this.CONSUME(RCurly);

    return { type: "object" as const, item };
  });

  public objectItem: () => JSONInternalObjectItem = this.RULE(
    "objectItem",
    () => {
      const beforeKey = this.SUBRULE(this.ignoredText);

      const objPair = this.OPTION(() => {
        const lit = this.CONSUME(StringLiteral);
        const afterKey = this.SUBRULE2(this.ignoredText);

        this.CONSUME(Colon);

        const beforeValue = this.SUBRULE3(this.ignoredText);
        const value = this.SUBRULE(this.value);
        const afterValue = this.SUBRULE4(this.ignoredText);

        // an empty json key is not valid, use "BAD_KEY" instead
        const key = lit.isInsertedInRecovery
          ? "BAD_KEY"
          : lit.image.slice(1, -1);
        return {
          type: "pair" as const,
          key,
          value,
          space: { beforeKey, afterKey, beforeValue, afterValue },
        };
      });
      return objPair ?? { type: "empty" as const, space: beforeKey };
    },
  );

  public array: () => JSONInternalArray = this.RULE("array", () => {
    const item: JSONInternalArrayItem[] = [];
    this.CONSUME(LSquare);
    item.push(this.SUBRULE(this.arrayItem));

    this.MANY(() => {
      this.CONSUME(Comma);
      item.push(this.SUBRULE2(this.arrayItem));
    });

    this.CONSUME(RSquare);

    return { type: "array" as const, item };
  });

  public arrayItem: () => JSONInternalArrayItem = this.RULE("arrayItem", () => {
    const space = this.SUBRULE(this.ignoredText);
    const first = this.OPTION2(() => {
      const value = this.SUBRULE(this.value);
      const spaceAfterValue = this.SUBRULE2(this.ignoredText);
      return { value, spaceAfterValue: spaceAfterValue };
    });

    if (first) {
      return {
        type: "value" as const,
        spaceBeforeValue: space,
        ...first,
      };
    } else {
      return { type: "empty" as const, space: space };
    }
  });

  public value: () => JSONInternalValue = this.RULE("value", () =>
    this.OR([
      {
        ALT: () => {
          const stringLiteral = this.CONSUME(StringLiteral).image;
          // chop of the quotation marks
          return stringLiteral.slice(1, -1);
        },
      },
      { ALT: () => Number(this.CONSUME(NumberLiteral).image) },
      { ALT: () => this.SUBRULE(this.object) },
      { ALT: () => this.SUBRULE(this.array) },
      {
        ALT: () => {
          this.CONSUME(True);
          return true;
        },
      },
      {
        ALT: () => {
          this.CONSUME(False);
          return false;
        },
      },
      {
        ALT: () => {
          this.CONSUME(Null);
          return null;
        },
      },
    ]));

  public ignoredText: () => string = this.RULE("ignoredText", () => {
    const space: string[] = [];

    this.MANY(() =>
      this.OR([
        { ALT: () => space.push(this.CONSUME(WhiteSpace).image) },
        { ALT: () => space.push(this.CONSUME(CommentBlock).image) },
        { ALT: () => space.push(this.CONSUME(CommentLine).image) },
      ])
    );
    return space.join("");
  });
}
