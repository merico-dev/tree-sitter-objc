const C = require("tree-sitter-c/grammar")


module.exports = grammar(C, {
  name: 'objc',

  conflicts: ($, original) => original.concat([
    [$._expression, $.protocol_type_specifier],
    [$.keyword_selector],
    [$.struct_specifier],
    [$.union_specifier],
    [$.enum_specifier],
    [$.block_declarator, $.abstract_block_declarator],
  ]),

  rules: {
    _top_level_item: ($, original) => choice(
      original,
      $.class_interface,
      $.class_implementation,
      $.category_interface,
      $.category_implementation,
      $.protocol_declaration,
      $.protocol_declaration_list,
      $.class_declaration_list,
      $._import
    ),

    _name: $ => field('name', $.identifier),

    _superclass_reference: $ => seq(
      ':', field('superclass', $.identifier)
    ),

    _import: $ => choice(
      $.preproc_import,
      $.module_import
    ),

    preproc_import: $ => seq(
      '#import',
      field('path',
        choice(
          $.system_lib_string,
          $.string_literal
        )
      )
    ),

    module_import: $ => seq(
      '@import', field('module', $.module_path)
    ),

    module_path: $ => /[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*/,

    // Declarations

    class_interface: $ => seq(
      '@interface', $._name, optional($._superclass_reference),
      optional($._protocols),
      optional($._instance_variables),
      optional($._interface_declaration_list),
      '@end'
    ),

    category_interface: $ => seq(
      '@interface', $._name, '(', field('category', optional($.identifier)), ')',
      optional($._protocols),
      optional($._interface_declaration_list),
      '@end'
    ),

    protocol_declaration: $ => seq(
      '@protocol', $._name,
      optional($._protocols),
      optional($._interface_declaration_list),
      '@end'
    ),

    protocol_declaration_list: $ => seq(
      '@protocol', '<', commaSep1(seq($.identifier, optional('*'))), '>', ';'
    ),

    class_declaration_list: $ => seq(
      '@class', commaSep1($.identifier), ';'
    ),

    _protocols: $ => field('protocols', $.protocol_reference_list),

    protocol_reference_list: $ => seq(
      '<', commaSep1(seq($.identifier, optional('*'))), '>'
    ),

    _instance_variables: $ => seq(
      '{', repeat1($._instance_variable_declaration) ,'}'
    ),

    _instance_variable_declaration: $ => choice(
      $._visibility_specification,
      $.field_declaration
    ),

    _visibility_specification: $ => choice(
      $.private,
      $.public,
      $.protected
    ),

    private: $ => '@private',

    public: $ => '@public',

    protected: $ => '@protected',

    _interface_declaration_list: $ => repeat1($._interface_declaration),

    _interface_declaration: $ => choice(
      $.declaration,
      $.method_declaration,
      $.property_declaration,
      $.preproc_call
    ),

    method_declaration: $ => seq(
      field('scope', $._class_member_scope),
      field('return_type', optional($._method_type)),
      field('selector', $._method_selector),
      ';'
    ),

    _class_member_scope: $ => choice(
      $.class_scope,
      $.instance_scope
    ),

    class_scope: $ => '+',

    instance_scope: $ => '-',

    property_declaration: $ => seq(
      '@property',
      optional($._property_attribute_list),
      field('type', $._type_identifier),
      optional('*'),
      field('name', $.identifier),
      ';'
    ),

    _property_attribute_list: $ => seq(
      '(', commaSep1($._property_attribute), ')'
    ),

    _property_attribute: $ => choice(
      $.getter,
      $.setter,
      $.readwrite,
      $.readonly,
      $.strong,
      $.weak,
      $.copy,
      $.assign,
      $.retain,
      $.nonatomic
    ),

    getter: $ => seq(
      'getter', '=', field('name', $.identifier)
    ),

    setter: $ => seq(
      'setter', '=', field('name', $.identifier)
    ),

    readwrite: $ => 'readwrite',

    readonly: $ => 'readonly',

    strong: $ => 'strong',

    weak: $ => 'weak',

    copy: $ => 'copy',

    assign: $ => 'assign',

    retain: $ => 'retain',

    nonatomic: $ => 'nonatomic',

    // Add support for Blocks: Declaration
    _declarator: ($, original) => choice(
      original,
      $.block_declarator
    ),

    _abstract_declarator: ($, original) => choice(
      original,
      $.abstract_block_declarator
    ),

    block_declarator: $ => seq(
      '(',
      '^',
      field('declarator', optional($.identifier)),
      ')',
      field('parameters', $.parameter_list),
      repeat($.attribute_specifier)
    ),

    abstract_block_declarator: $ => seq(
      '(',
      '^',
      field('declarator', optional($._abstract_declarator)),
      ')',
      field('parameters', $.parameter_list)
    ),

    // Add support for for in statement
    for_in_statement: $ => seq(
      'for',
      '(',
      field('declaration', seq($._declaration_specifiers, $._declarator)),
      'in',
      field('expression', $._expression),
      ')',
      field('body', $.compound_statement)
    ),

    _non_case_statement: ($, original) => choice(
      original,
      $.for_in_statement
    ),

    // Implementation

    class_implementation: $ => seq(
      '@implementation', $._name, optional($._superclass_reference),
      optional($._instance_variables),
      optional($._implementation_definition_list),
      '@end'
    ),

    category_implementation: $ => seq(
      '@implementation', $._name, '(', field('category', $.identifier),')',
      optional($._implementation_definition_list),
      '@end'
    ),

    _implementation_definition_list: $ => repeat1($._implementation_definition),

    _implementation_definition: $ => choice(
      $.function_definition,
      $.declaration,
      $.method_definition,
      $.synthesize,
      $.dynamic,
      $.preproc_call,
    ),

    synthesize: $ => seq(
      '@synthesize', $._synthesize_property_list,';'
    ),

    _synthesize_property_list: $ => commaSep1($.synthesize_property),

    synthesize_property: $ => seq(
      field('property', $.identifier),
      optional(seq('=', field('instance_variable', $.identifier)))
    ),

    dynamic: $ => seq(
      '@dynamic',
      field('property', $.identifier),
      ';'
    ),

    method_definition: $ => seq(
      field('scope', $._class_member_scope),
      field('return_type', optional($._method_type)),
      field('selector', $._method_selector),
      optional($.declaration_list),
      field('body', $.compound_statement)
    ),

    // Selectors

    _method_selector: $ => choice(
      $._unary_selector,
      seq(
        $.keyword_selector,
        optional(commaSep1($.parameter_declaration)),
        optional(seq(',', '...'))),
    ),

    _unary_selector: $ => $.identifier,

    keyword_selector: $ => repeat1($.keyword_declarator),

    keyword_declarator: $ => seq(
      field('keyword', optional($.identifier)),
      ':',
      field('type', optional($._method_type)),
      $._name
    ),

    _method_type: $ => seq(
      '(', $.type_descriptor ,')'
    ),

    // Type specifiers

    _type_identifier: ($, original) => choice(
      original,
      '_Bool',
      '_Complex',
      '_Imaginary',
      $.protocol_type_specifier
    ),

    protocol_type_specifier: $ => seq(
      $.identifier, $._protocols
    ),

    struct_specifier: ($, original) => choice(
      original,
      seq(
        'struct',
        field('name', optional($.identifier)),
        field('body', seq('@defs', '(', field('class_name', $.identifier),')'))
      )
    ),

    type_qualifier: ($, original) => choice(
      original,
      '__strong',
      '__weak',
      '__nonnull',
      '__nullable',
      '__null_unspecified',
      '_Nonnull',
      '_Nullable',
      '_Null_unspecified',
      $.protocol_qualifier
    ),

    protocol_qualifier: $ => choice(
      'in',
      'out',
      'inout',
      'bycopy',
      'byref',
      'oneway'
    ),

    boolean_constant: $ => choice(
      '__objc_yes',
      '__objc_no',
      'true',
      'false',
    ),

    // Primary expression

    _expression: ($, original) => choice(
      original,
      $.self,
      $.selector_expression,
      $.message_expression,
      $.protocol_expression,
      $.encode_expression,
      $.available_expression,
      $.block_expression,
      $.objc_at_expression
    ),

    _assignment_left_expression: ($, original) => choice(
      original,
      $.self,
    ),

    self: $ => 'self',

    message_expression: $ => seq(
      token(prec(1, '[')),
      field('receiver', $._receiver),
      field('selector', $._message_selector),
      token(prec(1, ']')),
    ),

    _receiver: $ => choice(
      $._expression,
      $.super
    ),

    super: $ => 'super',

    _message_selector: $ => choice(
      $.identifier,
      $.keyword_argument_list
    ),

    keyword_argument_list: $ => repeat1($.keyword_argument),

    keyword_argument: $ => seq(
      optional(field('keyword', $.identifier)),
      ':',
      field('argument', commaSep1($._expression))
    ),

    selector_expression: $ => seq(
      '@selector', '(', $._selector_name, ')'
    ),

    _selector_name: $ => choice(
      $.identifier,
      repeat1($.keyword_name)
    ),

    keyword_name: $ => choice(
      seq($.identifier, ':'),
      ':'
    ),

    protocol_expression: $ => seq(
      '@protocol', '(', $.identifier, ')'
    ),

    encode_expression: $ => seq(
      '@encode', '(', $.identifier, ')'
    ),

    // Add support for Blocks: Expression
    block_expression: $ => seq(
      '^',
      optional(field('return_type',$._type_specifier)),
      optional(field('parameters', $.parameter_list)),
      field('body', $.compound_statement)
    ),

    // Add support for at expression
    _key_value_pair: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression)
    ),

    _key_value_list: $ => choice(
      commaSep1($._key_value_pair),
    ),

    dictionary_literal: $ => seq(
      '{',
      optional($._key_value_list),
      '}'
    ),

    _expression_list: $ => choice(
      commaSep1($._expression)
    ),

    array_literal: $ => seq(
      '[',
      optional($._expression_list),
      ']'
    ),

    objc_at_expression: $ => seq(
      '@',
      choice(
        $.identifier,
        seq('(', $._expression, ')'),
        $.string_literal,
        $.number_literal,
        $.char_literal,
        $.boolean_constant,
        $.array_literal,
        $.dictionary_literal,
      )
    ),

    system_type: $ => choice(
      'iOS',
      'iOSApplicationExtension',
      'macOS',
      'macOSApplicationExtension',
      'macCatalyst',
      'macCatalystApplicationExtension',
      'watchOS',
      'watchOSApplicationExtension',
      'tvOS',
      'tvOSApplicationExtension',
      'swift',
    ),

    system_version: $ => choice(seq(field('system_type', $.system_type), field('version_number', $.number_literal)), '*'),

    available_expression: $ => seq(
      '@available', '(', commaSep($.system_version), ')'
    ),

  }
});

function commaSep (rule) {
  return optional(commaSep1(rule))
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
