; Global variable declarations introduce bindings
(var_decl     name: (identifier) @definition.var)

; Section field declarations
(field_decl name: (identifier) @definition.field)

; Section paths are type-like definitions
(struct_decl name: (identifier) @definition.type)

; Import aliases introduce namespace bindings
(import_decl alias: (identifier) @definition.namespace)

; Namespace references are references to defined names
(namespace_ref (identifier) @reference)
