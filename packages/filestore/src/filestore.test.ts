import {Filestore} from './filestore.js';
import {existsSync} from 'node:fs';
import rdfDereferencer from 'rdf-dereference';
import {describe, expect, it} from 'vitest';

// Required to use ESM in both TypeScript and JavaScript
const dereferencer = rdfDereferencer.default ?? rdfDereferencer;

const store = new Filestore({dir: './tmp/'});

describe('createHashFromIri', () => {
  it('creates a path from an IRI', async () => {
    const hash = store.createHashFromIri('http://localhost/resource');

    expect(hash).toEqual('d388f3dc1aaec96db5e05936bfb1aa0b');
  });
});

describe('createPathFromIri', () => {
  it('creates a path from an IRI', async () => {
    const path = store.createPathFromIri('http://localhost/resource');

    expect(path.endsWith('tmp/b/0/d388f3dc1aaec96db5e05936bfb1aa0b.nt')).toBe(
      true
    );
  });
});

describe('save', () => {
  const store = new Filestore({dir: './tmp/'});
  const iri = 'http://localhost/resource';

  it('saves a resource', async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await store.save({iri, quadStream: data});

    const path = store.createPathFromIri(iri);
    expect(existsSync(path)).toBe(true);
  });
});
