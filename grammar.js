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
      $.dynamic_decl,
      $.section_decl,
    ),

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

    import_decl: $ => seq(
      'import',
      field('path', $.string),
      optional(seq(
        'as',
        field('alias', $.identifier)
      )),
      ';'
    ),

    // ═══════════════════════════════════════════════════════
    // VARIABLE DECLARATIONS
    // ═══════════════════════════════════════════════════════

    var_decl: $ => seq(
      optional(field('export_kw', 'export')),
      'var',
      field('name', $.identifier),
      optional(field('optional_marker', '?')),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._expr))),
      ';'
    ),

    dynamic_decl: $ => seq(
      'dynamic',
      'var',
      field('name', $.identifier),
      optional(field('optional_marker', '?')),
      optional(seq('=', field('value', $.list_literal))),
      ';'
    ),

    // ═══════════════════════════════════════════════════════
    // SECTIONS
    // ═══════════════════════════════════════════════════════

    section_decl: $ => seq(
      optional(field('export_kw', 'export')),
      '[',
      field('path', $.section_path),
      ']',
      '{',
      repeat($._section_item),
      '}',
      ';'
    ),

    section_path: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier))
    ),

    _section_item: $ => choice(
      $.field_decl,
      $.spread_stmt,
    ),

    field_decl: $ => seq(
      field('name', $.identifier),
      optional(field('optional_marker', '?')),
      ':',
      field('type', $._type),
      optional(seq('=', field('value', $._expr))),
      ';'
    ),

    spread_stmt: $ => seq(
      '...',
      field('target', $.spread_ref),
      ';'
    ),

    spread_ref: $ => choice(
      $.identifier,
      seq($.identifier, '::', $.identifier),
    ),

    // ═══════════════════════════════════════════════════════
    // TYPES
    // ═══════════════════════════════════════════════════════

    _type: $ => choice(
      $.scalar_type,
      $.list_type,
    ),

    scalar_type: $ => choice(
      'str',
      'int',
      'float',
      'bool',
    ),

    list_type: $ => seq('[', $.scalar_type, ']'),

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
      $.grouped_expr,
    ),

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
      '(',
      optional(seq(
        $._expr,
        repeat(seq(',', $._expr)),
      )),
      ')'
    )),

    // ═══════════════════════════════════════════════════════
    // IDENTIFIER
    // ═══════════════════════════════════════════════════════

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
  }
});
