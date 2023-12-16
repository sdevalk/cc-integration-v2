import {Queue} from './queue.js';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
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
