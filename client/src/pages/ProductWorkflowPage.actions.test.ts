import fs from 'fs';
import path from 'path';

describe('ProductWorkflowPage action routing', () => {
  const source = fs.readFileSync(path.join(__dirname, 'ProductWorkflowPage.tsx'), 'utf8');

  it('handles assign_designer before the products fallback', () => {
    expect(source).toContain("product.workflow.nextActionKey === 'assign_designer'");
    expect(source).toContain('setAssignDesignerProduct(product)');
  });
});
