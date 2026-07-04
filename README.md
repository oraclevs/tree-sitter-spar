# tree-sitter-spar

**[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the [Spar](https://github.com/oraclevs/spar) configuration language.**

Tree-sitter is a parser generator that produces fast, incremental, error-tolerant parse trees. Editors that use Tree-sitter for syntax highlighting — Neovim, Helix, Zed, and others — consume grammars like this one to understand the structure of source files.

---

## What this provides

- **Full parse tree** for all Spar constructs: variables, sections, imports, functions, expressions, schema declarations
- **Syntax highlighting** via `queries/highlights.scm`
- **Auto-indent** rules via `queries/indents.scm`
- **Scope tracking** via `queries/locals.scm` (used by editors for rename and reference lookup)

---

## Building from source

You need Node.js and the `tree-sitter` CLI:

```bash
npm install -g tree-sitter-cli
```

Then inside this repo:

```bash
npm install
tree-sitter generate   # produces src/parser.c from grammar.js
tree-sitter test       # runs the corpus tests in test/corpus/
```

The generated `src/parser.c` is excluded from version control — always build it locally or in CI.

---

## Grammar coverage

The grammar covers the full Spar language as of v0.1:

| Construct | Example |
|-----------|---------|
| Variable declarations | `var port: int = 8080;` |
| Export / dynamic | `export var name: str = "x";` |
| Section declarations | `[Server] { ... };` |
| Private sections | `private [Defaults] { ... };` |
| Schema sections | `[Server]<Schema> { host: str; }` |
| Imports | `import "file.spar" as alias;` |
| Schema imports | `import schema "schema.spar";` |
| Spread statements | `...OtherSection;` |
| Function declarations | `function f(x: int) -> str { ... }` |
| String interpolation | `"Hello ${name}!"` |
| Arithmetic | `a + b * c` |
| Fallback operator | `env("KEY") ?? "default"` |
| Function calls | `env("HOST")`, `str(42)` |
| List literals | `["a", "b", "c"]` |
| Block and line comments | `/* ... */` and `// ...` |

---

## Editor integration

### Neovim (nvim-treesitter)

Add the grammar to your nvim-treesitter config:

```lua
local parser_config = require('nvim-treesitter.parsers').get_parser_configs()

parser_config.spar = {
  install_info = {
    url           = 'https://github.com/oraclevs/tree-sitter-spar',
    files         = { 'src/parser.c' },
    branch        = 'main',
    generate_requires_npm = false,
    requires_generate_from_grammar = false,
  },
  filetype = 'spar',
}

vim.filetype.add({ extension = { spar = 'spar' } })
```

Then install:

```vim
:TSInstall spar
```

> nvim-treesitter integration has not been formally tested by the project — contributions and reports are welcome.

### Helix

Helix has built-in Tree-sitter support. To use this grammar before it is merged upstream, add to your `languages.toml`:

```toml
[[grammar]]
name   = "spar"
source = { git = "https://github.com/oraclevs/tree-sitter-spar", rev = "main" }

[[language]]
name          = "spar"
scope         = "source.spar"
file-types    = ["spar"]
roots         = [".git"]
comment-token = "//"
grammar       = "spar"
indent        = { tab-width = 4, unit = "    " }
```

Then fetch and build:

```bash
hx --grammar fetch
hx --grammar build
```

> Helix integration has not been formally tested by the project — contributions and reports are welcome.

### Zed

Community grammar support for Zed is possible once `tree-sitter-spar` is submitted to the [zed-industries/extensions](https://github.com/zed-industries/extensions) registry. This is planned but not yet done.

---

## Relationship to spar and spar-ls

- This grammar is independent of the [spar compiler](https://github.com/oraclevs/spar) — it is used for editor display only, not for validation or evaluation.
- [spar-ls](https://github.com/oraclevs/spar-ls) provides LSP-based diagnostics, hover, and completions; it runs alongside the Tree-sitter grammar in editors that support both.

---

## License

MIT — see [LICENSE](LICENSE).
