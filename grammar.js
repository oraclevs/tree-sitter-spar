/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'spar',

  extras: $ => [
    /\s+/,
    $.line_comment,
    $.block_comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.fn_call, $.namespace_ref],
    [$._expr, $.namespace_ref],
  ],

  rules: {

    // ═══════════════════════════════════════════════════════
    // TOP LEVEL
    // ═══════════════════════════════════════════════════════

    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.import_decl,
      $.var_decl,
      $.struct_decl,
      $.function_decl,
      $.impl_decl,
    ),

    // `#[emit]` — attribute on the next top-level var or section.
    attribute: $ => seq('#[', field('name', $.identifier), ']'),

    // ═══════════════════════════════════════════════════════
    // COMMENTS
    // ═══════════════════════════════════════════════════════

    line_comment: $ => token(seq('//', /.*/)),

    block_comment: $ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),

    // ═══════════════════════════════════════════════════════
    // IMPORTS
    // ═══════════════════════════════════════════════════════

    import_decl: $ => seq('import', optional('pkg'), choice(
      seq(field('path', $.string), optional(seq('as', field('alias', $.identifier)))),
      seq(field('path', $.import_name), optional(seq('as', field('alias', $.identifier)))),
      seq('{', commaSep1($.import_item), '}', 'from', field('path', $.string))
    ), ';'),
    import_name: $ => seq($.identifier, repeat(seq('/', $.identifier))),
    import_item: $ => seq($.identifier, optional(seq('as', $.identifier))),

    // ═══════════════════════════════════════════════════════
    // VARIABLE DECLARATIONS
    // ═══════════════════════════════════════════════════════

    var_decl: $ => seq(
      repeat($.attribute),
      optional(field('export_kw', 'export')),
      'var', optional('mut'),
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._expr))),
      ';'
    ),

    struct_decl: $ => seq(repeat($.attribute), optional(choice('export', 'private')),
      'struct', field('name', $.identifier), optional($.type_parameters),
      '{', repeat($.field_decl), '}', ';'),
    type_parameters: $ => seq('<', commaSep1($.identifier), '>'),
    type_arguments: $ => seq('<', commaSep1($._type), '>'),
    field_decl: $ => seq(field('name', $.identifier), ':', field('type', $._type),
      optional(seq('=', field('value', $._expr))), ';'),
    function_decl: $ => seq(optional('private'), optional('async'), 'fn',
      field('name', $.identifier), optional($.type_parameters), '(', optional(commaSep1($.parameter)), ')',
      optional(seq('->', $._type)), $.block, ';'),
    parameter: $ => choice(seq(optional('mut'), 'self'),
      seq($.identifier, ':', $._type, optional(seq('=', $._expr)))),
    tuple_binding: $ => seq('var', '(', $.identifier, ',', $.identifier,
      repeat(seq(',', $.identifier)), optional(','), ')', optional(seq(':', $._type)), '=', $._expr, ';'),
    block: $ => seq('{', repeat(choice($.var_decl, $.tuple_binding, $.return_stmt, $.expression_stmt)), '}'),
    return_stmt: $ => seq('return', optional($._expr), ';'),
    expression_stmt: $ => seq($._expr, ';'),
    impl_decl: $ => seq('impl', optional($.type_parameters), $._type, '{', repeat($.function_decl), '}', ';'),

    // ═══════════════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════════════

    _type: $ => choice(
      $.scalar_type,
      $.named_type,
      $.tuple_type,
    ),

    scalar_type: $ => choice(
      'str',
      'int',
      'float',
      'bool', 'void', 'Any', 'Record',
    ),

    named_type: $ => seq($.identifier, optional($.type_arguments)),

    tuple_type: $ => seq('(', $._type, ',', $._type, repeat(seq(',', $._type)), optional(','), ')'),

    // ═══════════════════════════════════════════════════════
    // EXPRESSIONS
    // Precedence (lowest → highest):
    //   1. ??  fallback          (right-associative)
    //   2. + - addition          (left-associative)
    //   3. * / multiplication    (left-associative)
    //   4. primary (atoms)
    // ═══════════════════════════════════════════════════════

    _expr: $ => choice(
      $.binary_expr,
      $.fn_call,
      $.namespace_ref,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.string,
      $.list_literal,
      $.tuple_literal,
      $.grouped_expr,
      $.field_access,
    ),

    field_access: $ => prec.left(11, seq($._expr, '.', field('name', choice($.identifier, $.integer_literal)))),

    binary_expr: $ => choice(
      // ?? right-associative, lowest precedence
      prec.right(1, seq(
        field('left',  $._expr),
        field('op',    '??'),
        field('right', $._expr),
      )),
      // + - left-associative
      prec.left(2, seq(
        field('left',  $._expr),
        field('op',    choice('+', '-')),
        field('right', $._expr),
      )),
      // * / left-associative, highest precedence
      prec.left(3, seq(
        field('left',  $._expr),
        field('op',    choice('*', '/')),
        field('right', $._expr),
      )),
    ),

    grouped_expr: $ => seq('(', $._expr, ')'),

    tuple_literal: $ => seq('(', $._expr, ',', $._expr, repeat(seq(',', $._expr)), optional(','), ')'),

    // ═══════════════════════════════════════════════════════
    // LITERALS
    // ═══════════════════════════════════════════════════════

    // Float must come before integer — try longer match first
    float_literal: $ => /[0-9]+\.[0-9]+/,

    integer_literal: $ => /[0-9]+/,

    boolean_literal: $ => choice('true', 'false'),

    // ═══════════════════════════════════════════════════════
    // STRINGS WITH INTERPOLATION
    // ═══════════════════════════════════════════════════════

    string: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.string_dollar,
        $.escape_sequence,
        $.interpolation,
      )),
      '"'
    ),

    // Any chars that are not ", \, $, or newline
    string_content: $ => token.immediate(/[^"\\$\n]+/),

    // A lone $ not followed by { — tree-sitter longest-match ensures
    // that ${ is claimed by interpolation before this rule fires
    string_dollar: $ => token.immediate('$'),

    // Standard escape sequences
    escape_sequence: $ => token.immediate(/\\[nrt\\"$]/),

    // String interpolation: ${expr}
    interpolation: $ => seq(
      token.immediate('${'),
      $._expr,
      '}'
    ),

    // ═══════════════════════════════════════════════════════
    // LIST LITERAL
    // ═══════════════════════════════════════════════════════

    list_literal: $ => seq(
      '[',
      optional(seq(
        $._expr,
        repeat(seq(',', $._expr)),
        optional(','),
      )),
      ']'
    ),

    // ═══════════════════════════════════════════════════════
    // NAMESPACE REFERENCE
    // ═══════════════════════════════════════════════════════

    namespace_ref: $ => seq(
      $.identifier,
      repeat(seq('::', $.identifier))
    ),

    // ═══════════════════════════════════════════════════════
    // FUNCTION CALL (built-ins: env(), str())
    // ═══════════════════════════════════════════════════════

    fn_call: $ => prec(10, seq(
      field('function', choice(
        $.identifier,
        alias('str', $.identifier),
      )),
      optional($.type_arguments),
      '(', optional(commaSep1($.named_argument)), ')'
    )),

    // ═══════════════════════════════════════════════════════
    // IDENTIFIER
    // ═══════════════════════════════════════════════════════

    named_argument: $ => seq(field('name', $.identifier), ':', field('value', $._expr)),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
  }
});

function commaSep1(rule) { return seq(rule, repeat(seq(',', rule)), optional(',')); }
