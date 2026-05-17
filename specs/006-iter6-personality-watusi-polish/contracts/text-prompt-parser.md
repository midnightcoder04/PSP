# Contract — `TextExercise` Prompt Parser

## Goal

Render the `TextExercise.content.prompt` field with the same block-aware parser used by `InfoExercise`, so that numbered runs become `<ol>`, bulleted runs become `<ul>`, and prose paragraphs become `<p>`. Currently `TextExercise` renders the prompt as a single `<p>` blob.

## Shared module

```ts
// src/lib/markdownBlocks.ts

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'br' }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }

const NUMBERED = /^\s*\d+\.\s+(.*)$/
const BULLET = /^\s*[•\-*]\s+(.*)$/

export function parseBlocks(content: string): Block[] { /* … */ }
```

Patterns recognised (same as iter5's `InfoExercise`):

- Line matching `/^\s*\d+\.\s+(.+)$/` → numbered list item
- Line matching `/^\s*[•\-*]\s+(.+)$/` → bullet list item
- Blank line between paragraphs → paragraph break
- Otherwise → paragraph text (consecutive non-list, non-blank lines coalesce into one `<p>`)

## Behaviour

- Adjacent numbered lines coalesce into a single `<ol>`.
- Adjacent bulleted lines coalesce into a single `<ul>`.
- A blank line ends the current list/paragraph block.
- A numbered list starting with `5.` does NOT start at 5 — list rendering uses positional order. (Acceptable: workshop prompts are always 1, 2, 3, … from the start.)

## Test matrix

| ID | Input | Expected |
|---|---|---|
| TX1 | `"foo\n\nbar"` | `[{p:'foo'},{p:'bar'}]` |
| TX2 | `"1. one\n2. two"` | `[{ol:['one','two']}]` |
| TX3 | `"prose\n1. one\n2. two\ntail"` | `[{p:'prose'},{ol:['one','two']},{p:'tail'}]` |
| TX4 | `"• alpha\n• beta"` | `[{ul:['alpha','beta']}]` |
| TX5 | `"- alpha\n* beta\n• gamma"` | `[{ul:['alpha','beta','gamma']}]` (treats `-`, `*`, `•` as same bullet kind) |
| TX6 | Empty string | `[]` |
| TX7 | Single line `"hi"` | `[{p:'hi'}]` |
| TX8 | Power-Points actual prompt (verbatim from seed) | `[{p:'Reflect on the following …'}, {ol:[6 items]}, {p:'How do your top two attitude types interact?…'}]` |

## Component-level acceptance

After integration:

- `TextExercise` renders `content.prompt` via `parseBlocks` followed by the existing `<textarea>` / `placeholder` UI.
- Numbered lines are visually distinguishable as a list (left padding, marker).
- Existing prompts without numbered/bulleted lines render identically to before (no visual regression).
