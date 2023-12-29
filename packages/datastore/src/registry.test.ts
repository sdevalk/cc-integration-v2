import {Connection} from './connection.js';
import {Queue} from './queue.js';
import {Registry} from './registry.js';
import {join} from 'node:path';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

const tmpDir = './tmp';
const dataFile = join(tmpDir, 'registry.sqlite');
let connection: Connection;

beforeEach(async () => {
  await rimraf(tmpDir);
  connection = await Connection.new({path: dataFile});
});

describe('new', () => {
  it('returns a new instance', async () => {
    const registry = new Registry({connection});

    expect(registry).toBeInstanceOf(Registry);
  });
});

describe('save', async () => {
  it('saves an item', async () => {
    const registry = new Registry({connection});
    const iri = 'https://example.org';

    await registry.save({iri});

    const items = await registry.getAll();

    expect(items.length).toBe(1);
    expect(items[0].iri).toEqual(iri);
  });

  it('updates an item with an IRI that already exists', async () => {
    const registry = new Registry({connection});
    const iri = 'https://example.org';

    await registry.save({iri});
    await registry.save({iri});

    const items = await registry.getAll();

    expect(items.length).toBe(1);
    expect(items[0].iri).toEqual(iri);
  });
});

describe('removeObsolete', async () => {
  it('removes obsolete items', async () => {
    const registry = new Registry({connection});

    await registry.save({iri: 'https://example.org/1'});
    await registry.save({iri: 'https://example.org/2'});

    const queue = new Queue({connection});

    await queue.push({iri: 'https://example.org/1'});

    const obsoleteItems = await registry.removeObsolete();

    expect(obsoleteItems.length).toBe(1);
    expect(obsoleteItems[0].iri).toEqual('https://example.org/2');
  });

  it('removes obsolete items belonging to a specific type', async () => {
    const registry = new Registry({connection});

    await registry.save({iri: 'https://example.org/1', type: 'type1'});
    await registry.save({iri: 'https://example.org/2', type: 'type2'});
    await registry.save({iri: 'https://example.org/3', type: 'type1'});

    const queue = new Queue({connection});

    await queue.push({iri: 'https://example.org/1', type: 'type1'});

    const obsoleteItems = await registry.removeObsolete({type: 'type1'});

    expect(obsoleteItems.length).toBe(1);
    expect(obsoleteItems[0].iri).toEqual('https://example.org/3');
  });

  it('removes all items if queue is empty', async () => {
    const registry = new Registry({connection});

    await registry.save({iri: 'https://example.org/1'});
    await registry.save({iri: 'https://example.org/2'});

    const obsoleteItems = await registry.removeObsolete();

    expect(obsoleteItems.length).toBe(2);
  });
});
