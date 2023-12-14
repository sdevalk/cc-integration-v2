import {Filestore} from './filestore.js';
import {existsSync} from 'node:fs';
import rdfDereferencer from 'rdf-dereference';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

// Required to use ESM in both TypeScript and JavaScript
const dereferencer = rdfDereferencer.default ?? rdfDereferencer;

const dir = './tmp/';
const filestore = new Filestore({dir});

beforeEach(async () => {
  await rimraf(dir);
});

describe('createHashFromIri', () => {
  it('creates a path from an IRI', async () => {
    const hash = filestore.createHashFromIri('http://localhost/resource');

    expect(hash).toEqual('d388f3dc1aaec96db5e05936bfb1aa0b');
  });
});

describe('createPathFromIri', () => {
  it('creates a path from an IRI', async () => {
    const path = filestore.createPathFromIri('http://localhost/resource');

    expect(path.endsWith('tmp/b/0/d388f3dc1aaec96db5e05936bfb1aa0b.nt')).toBe(
      true
    );
  });
});

describe('deleteByIri', () => {
  const filestore = new Filestore({dir: './tmp/'});
  const iri = 'http://localhost/resource';

  beforeEach(async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await filestore.save({iri, quadStream: data});
  });

  it('does not throw if a resource does not exist', async () => {
    await filestore.deleteByIri('http://localhost/doesnotexist');
  });

  it('deletes a resource', async () => {
    await filestore.deleteByIri(iri);

    const path = filestore.createPathFromIri(iri);
    expect(existsSync(path)).toBe(false);
  });
});

describe('deleteIfMatches', () => {
  const filestore = new Filestore({dir: './tmp/'});
  const iri1 = 'http://localhost/resource1';
  const iri2 = 'http://localhost/resource2';

  beforeEach(async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await filestore.save({iri: iri1, quadStream: data});
    await filestore.save({iri: iri2, quadStream: data});
  });

  it('deletes resources', async () => {
    const hashesOfIrisThatMustBeDeleted = [filestore.createHashFromIri(iri1)];
    const matchFn = async (hashOfIri: string) =>
      hashesOfIrisThatMustBeDeleted.includes(hashOfIri);

    const deleteCount = await filestore.deleteIfMatches(matchFn);

    expect(deleteCount).toBe(1);

    const pathOfIri1 = filestore.createPathFromIri(iri1);
    expect(existsSync(pathOfIri1)).toBe(false);

    const pathOfIri2 = filestore.createPathFromIri(iri2);
    expect(existsSync(pathOfIri2)).toBe(true);
  });
});

describe('save', () => {
  const filestore = new Filestore({dir: './tmp/'});
  const iri = 'http://localhost/resource';

  it('saves a resource', async () => {
    const {data} = await dereferencer.dereference('./fixtures/resource.ttl', {
      localFiles: true,
    });

    await filestore.save({iri, quadStream: data});

    const path = filestore.createPathFromIri(iri);
    expect(existsSync(path)).toBe(true);
  });
});
