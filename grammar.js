const C = require("tree-sitter-c/grammar")


module.exports = grammar(C, {
  name: 'objc',

  conflicts: ($, original) => original.concat([
    [$._expression, $.protocol_type_specifier],
    [$.keyword_selector],
    [$.struct_specifier],
    [$.union_specifier],
    [$.enum_specifier]
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
      $.class_declaration_list
    ),

    _name: $ => field('name', $.identifier),

    _superclass_reference: $ => seq(
      ':', field('superclass', $.identifier)
    ),

    // Declarations

    class_interface: $ => seq(
      '@interface', $._name, optional($._superclass_reference),
      optional($._protocols),
      optional($._instance_variables),
      optional($._interface_declaration_list),
      '@end'
    ),

    category_interface: $ => seq(
      '@interface', $._name, '(', field('category', $.identifier),')',
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
      '@protocol', '<', commaSep1($.identifier), '>', ';'
    ),

    class_declaration_list: $ => seq(
      '@class', commaSep1($.identifier), ';'
    ),

    _protocols: $ => field('protocols', $.protocol_reference_list),

    protocol_reference_list: $ => seq(
      '<', commaSep1($.identifier), '>'
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
      $.method_definition
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

    // Primary expression

    _expression: ($, original) => choice(
      original,
      $.self,
      $.selector_expression,
      $.message_expression,
      $.protocol_expression,
      $.encode_expression
    ),

    self: $ => 'self',

    message_expression: $ => seq(
      '[',
      field('receiver', $._receiver),
      field('selector', $._message_selector),
      ']'
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
      field('argument', $._expression)
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
    )
  }
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
