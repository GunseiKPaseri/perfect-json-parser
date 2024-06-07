# perfect-json-parser

[![JSR](https://jsr.io/badges/@gunseikpaseri/perfect-json-parser)](https://jsr.io/@gunseikpaseri/parfect-json-parser)

A parser that allows editing while _maintaining the structure_ of json.

- support
- support order retenation ( minimal change )
- support comment (jsonc)

> [!WARNING]
> unsupport json5

## Usage

```ts
import { parse } from "jsr:@gunseikpaseri/perfect-json-parser";

const jsonFile = `
{
  "hoge": "fuga"
}
`;

const parsed = parse(jsonFile);

parsed.edit(["hoge"], "piyo");

const editedJson = parsed.stringify();

console.log(editedJson);
//{
//  "hoge": "piyo"
//}
```

## Internals

[chevrotain](https://chevrotain.io/) is used for parsing. Syntax diagram can be
seen from [json_sytax_diagram.html](./json_syntax_diagram.html)
