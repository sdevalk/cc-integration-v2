import {Filestore} from './filestore.js';
import {existsSync} from 'node:fs';
import rdfDereferencer from 'rdf-dereference';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

// Required to use ESM in both TypeScript and JavaScript
const dereferencer = rdfDereferencer.default ?? rdfDereferencer;

const dir = './tmp/';
const store = new Filestore({dir});

beforeEach(async () => {
  await rimraf(dir);
});

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

describe('deleteByIri', () => {
  const store = new Filestore({dir: './tmp/'});
  const iri = 'http://localhost/resource';

  beforeEach(async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await store.save({iri, quadStream: data});
  });

  it('does not throw if a resource does not exist', async () => {
    await store.deleteByIri('http://localhost/doesnotexist');
  });

  it('deletes a resource', async () => {
    await store.deleteByIri(iri);

    const path = store.createPathFromIri(iri);
    expect(existsSync(path)).toBe(false);
  });
});

describe('deleteIfMatches', () => {
  const store = new Filestore({dir: './tmp/'});
  const iri1 = 'http://localhost/resource1';
  const iri2 = 'http://localhost/resource2';

  beforeEach(async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await store.save({iri: iri1, quadStream: data});
    await store.save({iri: iri2, quadStream: data});
  });

  it('deletes resources', async () => {
    const hashesOfIrisThatMustBeDeleted = [store.createHashFromIri(iri1)];
    const matchFn = async (hashOfIri: string) =>
      hashesOfIrisThatMustBeDeleted.includes(hashOfIri);

    const deleteCount = await store.deleteIfMatches(matchFn);

    expect(deleteCount).toBe(1);

    const path1 = store.createPathFromIri(iri1);
    expect(existsSync(path1)).toBe(false);

    const path2 = store.createPathFromIri(iri2);
    expect(existsSync(path2)).toBe(true);
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
