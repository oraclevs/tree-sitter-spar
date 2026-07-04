; Indent inside section bodies
(section_decl "{" @indent)
(section_decl "}" @dedent)

; Indent inside list literals that span multiple lines
(list_literal "[" @indent)
(list_literal "]" @dedent)

; Indent inside grouped expressions
(grouped_expr "(" @indent)
(grouped_expr ")" @dedent)

; Indent inside string interpolation
(interpolation "${" @indent)
(interpolation "}"  @dedent)
