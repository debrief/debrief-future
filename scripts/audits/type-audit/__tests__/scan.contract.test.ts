import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { scan } from '../scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const CONTRACTS_DIR = path.join(
  REPO_ROOT,
  'specs',
  '206-audit-non-linkml-types',
  'contracts',
);

describe('scanner — output contract', () => {
  it('output validates against scan-output.schema.json (and transitively type-declaration-record.schema.json)', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });

    const scanOutputSchema = JSON.parse(
      fs.readFileSync(path.join(CONTRACTS_DIR, 'scan-output.schema.json'), 'utf8'),
    );
    const recordSchema = JSON.parse(
      fs.readFileSync(path.join(CONTRACTS_DIR, 'type-declaration-record.schema.json'), 'utf8'),
    );

    const ajv = new Ajv2020({ strict: false, allErrors: true });
    ajv.addSchema(recordSchema, 'type-declaration-record.schema.json');
    const validate = ajv.compile(scanOutputSchema);

    const valid = validate(output);
    if (!valid) {
      // eslint-disable-next-line no-console
      console.error(validate.errors);
    }
    expect(valid).toBe(true);
  });
});
