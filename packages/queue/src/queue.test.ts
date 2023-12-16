import {Queue} from './queue.js';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout} from 'node:timers/promises';
import {rimraf} from 'rimraf';
import {beforeEach, describe, expect, it} from 'vitest';

const tmpDir = './tmp';
const queueFile = join(tmpDir, 'queue.sqlite');

beforeEach(async () => {
  await rimraf(tmpDir);
  await mkdir(tmpDir, {recursive: true});
});

describe('new', () => {
  it('returns a new instance', async () => {
    const queue = await Queue.new({path: queueFile});

    expect(queue).toBeInstanceOf(Queue);
  });
});

describe('push', async () => {
  it('pushes an item', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    await queue.push({iri});

    const items = await queue.getAll();

    expect(items.length).toBe(1);
    expect(items[0].iri).toEqual(iri);
  });
});

describe('remove', async () => {
  it('removes an item', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    const item = await queue.push({iri});

    await queue.remove(item.id);

    const items = await queue.getAll();

    expect(items.length).toBe(0);
  });
});

describe('getAll', async () => {
  it('gets all items, sorted by date of creation', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    await queue.push({iri});
    await setTimeout(1000); // To get a different date of creation
    await queue.push({iri});

    const items = await queue.getAll();

    expect(items.length).toBe(2);
    expect(items[0].id).toEqual(1);
    expect(items[1].id).toEqual(2);
  });

  it('gets a limited number of items', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    await queue.push({iri});
    await queue.push({iri});

    const items = await queue.getAll({limit: 1});

    expect(items.length).toBe(1);
    expect(items[0].id).toEqual(1);
  });
});

describe('size', async () => {
  it('gets the size', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    await queue.push({iri});

    const size = await queue.size();

    expect(size).toBe(1);
  });
});

describe('isEmpty', async () => {
  it('returns true if there are no items', async () => {
    const queue = await Queue.new({path: queueFile});
    const isEmpty = await queue.isEmpty();

    expect(isEmpty).toBe(true);
  });

  it('returns false if there are items', async () => {
    const queue = await Queue.new({path: queueFile});
    const iri = 'https://example.org';

    await queue.push({iri});

    const isEmpty = await queue.isEmpty();

    expect(isEmpty).toBe(false);
  });
});
