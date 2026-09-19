// Read-only source inventory. This does not claim browser or provider verification.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const walk = (folder) =>
  fs
    .readdirSync(folder, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)],
    );
const pages = walk('app/admin')
  .filter((file) => file.endsWith('page.tsx'))
  .sort();
const files = new Map();
function inspect(file) {
  file = file.replaceAll('\\', '/');
  if (files.has(file)) return;
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const record = { file, imports: [], buttons: [], forms: [], links: [], requests: [] };
  files.set(file, record);
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const target = spec.startsWith('@/')
        ? spec.slice(2)
        : spec.startsWith('.')
          ? path.join(path.dirname(file), spec)
          : null;
      if (target && (target.startsWith('components') || target.startsWith('app'))) {
        const found = [target, `${target}.tsx`, `${target}.ts`].find(
          (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
        );
        if (found) {
          record.imports.push(found.replaceAll('\\', '/'));
          inspect(found);
        }
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      const attrs = Object.fromEntries(
        node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((attr) => [attr.name.getText(tree), attr.initializer?.getText(tree) ?? 'true']),
      );
      const line = tree.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const text = ts.isJsxOpeningElement(node)
        ? node.parent
            .getText(tree)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 220)
        : '';
      if (tag === 'button') record.buttons.push({ line, text, ...attrs });
      if (tag === 'form') record.forms.push({ line, ...attrs });
      if ((tag === 'a' || tag === 'Link') && attrs.href)
        record.links.push({ line, text, href: attrs.href });
    }
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'fetch')
      record.requests.push({
        line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        code: node.getText(tree).slice(0, 750),
      });
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
for (const page of pages) inspect(page);
inspect('app/admin/layout.tsx');
const result = {
  generatedAt: new Date().toISOString(),
  scope: 'Static source inventory only; runtime evidence is separate.',
  routes: pages.map(
    (file) =>
      `/${file
        .replaceAll('\\', '/')
        .replace(/^app\//, '')
        .replace(/\/page.tsx$/, '')}`,
  ),
  files: [...files.values()],
};
fs.mkdirSync('.gh-task-cache', { recursive: true });
fs.writeFileSync('.gh-task-cache/admin-source-inventory.json', JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    {
      pages: result.routes.length,
      files: files.size,
      buttons: result.files.reduce((sum, item) => sum + item.buttons.length, 0),
      forms: result.files.reduce((sum, item) => sum + item.forms.length, 0),
      requests: result.files.reduce((sum, item) => sum + item.requests.length, 0),
      suspiciousButtons: result.files.flatMap((item) =>
        item.buttons
          .filter((button) => button.type === '"button"' && !button.onClick && !button.disabled)
          .map((button) => ({ file: item.file, ...button })),
      ),
    },
    null,
    2,
  ),
);
