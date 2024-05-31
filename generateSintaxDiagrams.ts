import { createSyntaxDiagramsCode } from "chevrotain";

import { JsonParser } from "./src/json_parser.ts";

const parser = new JsonParser();

const grammar = parser.getSerializedGastProductions();
const html = createSyntaxDiagramsCode(grammar);

Deno.writeTextFile("./json_syntax_diagram.html", html);
