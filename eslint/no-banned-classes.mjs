const BANNED = [
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide|placeholder|caret|accent)-(?:indigo|violet|purple|slate)-[0-9]{2,3}\b/,
  /\brounded-(?:2xl|3xl)\b/,
  /\bfrom-purple\b/,
  /\bbg-gradient-to-/,
  /\bshadow(?:-[a-z0-9]+)?\b/,
];

function check(value, node, context) {
  if (!value) return;
  for (const pattern of BANNED) {
    if (pattern.test(value)) {
      context.report({
        node,
        message: `Banned class in "${value}". See DESIGN.md. No default indigo/violet/purple/slate, no rounded-2xl/3xl, no purple gradients, no shadows.`,
      });
      return;
    }
  }
}

const rule = {
  meta: { type: "problem", docs: { description: "Block off-brand utility classes" }, schema: [] },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        const parent = node.parent;
        if (!parent) return;
        const inClass =
          (parent.type === "JSXAttribute" && parent.name?.name === "className") ||
          (parent.type === "CallExpression" && parent.callee?.name === "cn");
        if (inClass) check(node.value, node, context);
      },
      TemplateElement(node) {
        const parent = node.parent?.parent;
        if (parent?.type === "JSXAttribute" && parent.name?.name === "className") {
          check(node.value?.raw, node, context);
        }
      },
    };
  },
};

export default rule;
