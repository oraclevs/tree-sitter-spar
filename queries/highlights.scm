; ─── Keywords ────────────────────────────────────────────────────────────────

"var"     @keyword
"export"  @keyword.modifier
"import"  @keyword.import
"as"      @keyword
["struct" "fn" "impl" "return" "mut" "async"] @keyword

; ─── Type keywords ───────────────────────────────────────────────────────────

(scalar_type) @type.builtin

; ─── Boolean literals ────────────────────────────────────────────────────────

(boolean_literal) @constant.builtin

; ─── Number literals ─────────────────────────────────────────────────────────

(integer_literal) @number
(float_literal)   @number.float

; ─── String literals ─────────────────────────────────────────────────────────

(string)          @string
(string_content)  @string
(string_dollar)   @string
(escape_sequence) @string.escape

; ─── String interpolation ────────────────────────────────────────────────────

(interpolation "${" @punctuation.special)
(interpolation "}"  @punctuation.special)

; ─── Comments ────────────────────────────────────────────────────────────────

(line_comment)  @comment @spell
(block_comment) @comment @spell

; ─── Identifiers ─────────────────────────────────────────────────────────────

(identifier) @variable

; ─── Import path ─────────────────────────────────────────────────────────────

(import_decl path: (string) @string.special)
(import_decl path: (import_name) @namespace)
(import_decl alias: (identifier) @namespace)

(struct_decl name: (identifier) @type)
(named_type (identifier) @type)
(type_parameters (identifier) @type.parameter)
(function_decl name: (identifier) @function)
(named_argument name: (identifier) @variable.parameter)

; ─── Field names ─────────────────────────────────────────────────────────────

(field_decl name: (identifier) @variable.member)
(var_decl   name: (identifier) @variable)

; ─── Namespace references ────────────────────────────────────────────────────

; The first segment of a :: reference is a namespace
(namespace_ref
  (identifier) @namespace
  ("::")
  (identifier) @variable)

; "global" is a reserved namespace keyword
((namespace_ref (identifier) @keyword)
  (#eq? @keyword "global"))

; ─── Function calls ──────────────────────────────────────────────────────────

(fn_call function: (identifier) @function.builtin)

; ─── Binary operators ────────────────────────────────────────────────────────

(binary_expr op: "??" @operator)
(binary_expr op: "+"  @operator)
(binary_expr op: "-"  @operator)
(binary_expr op: "*"  @operator)
(binary_expr op: "/"  @operator)

; ─── Punctuation ─────────────────────────────────────────────────────────────

"["  @punctuation.bracket
"]"  @punctuation.bracket
"{"  @punctuation.bracket
"}"  @punctuation.bracket
"("  @punctuation.bracket
")"  @punctuation.bracket
";"  @punctuation.delimiter
":"  @punctuation.delimiter
","  @punctuation.delimiter
"."  @punctuation.delimiter
"="  @operator
"::" @operator
