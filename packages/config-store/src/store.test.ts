import {ConfigStore} from './store.js';
import {describe, expect, it} from 'vitest';

const config = new ConfigStore();

const manifest = {
  key1: {
    $filter: 'env',
    development: 'value1',
    production: 'value2',
  },
  key2: 'value3',
};

describe('loadFromManifest', () => {
  it('loads from manifest', () => {
    const result = config.loadFromManifest(manifest);

    expect(result).toBeUndefined();
  });
});

describe('fromManifest', () => {
  it('returns instance', () => {
    const store = ConfigStore.fromManifest(manifest);

    expect(store).toBeInstanceOf(ConfigStore);
  });
});

describe('loadFromFile', () => {
  it('throws if filename is invalid', async () => {
    // @ts-expect-error:TS2345
    await expect(config.loadFromFile(undefined)).rejects.toThrow(
      'The "path" argument must be of type string or an instance of Buffer or URL. Received undefined'
    );
  });

  it('throws if file does not exist', async () => {
    await expect(
      config.loadFromFile('thisFileDoesNotExist.json')
    ).rejects.toThrow(
      "ENOENT: no such file or directory, open 'thisFileDoesNotExist.json'"
    );
  });

  it('throws if file contains invalid JSON', async () => {
    await expect(
      config.loadFromFile('./fixtures/malformed.json')
    ).rejects.toThrow('Unexpected token \'b\', "badJSON" is not valid JSON');
  });

  it('throws if file is empty', async () => {
    await expect(config.loadFromFile('./fixtures/empty.json')).rejects.toThrow(
      'Unexpected end of JSON input'
    );
  });

  it('accepts JSON file', async () => {
    await expect(
      config.loadFromFile('./fixtures/valid.json')
    ).resolves.not.toThrow();
  });

  it('accepts comments in JSON file', async () => {
    await expect(
      config.loadFromFile('./fixtures/valid-with-comments.json')
    ).resolves.not.toThrow();
  });
});

describe('fromFile', () => {
  it('returns instance', async () => {
    const store = await ConfigStore.fromFile('./fixtures/valid.json');

    expect(store).toBeInstanceOf(ConfigStore);
  });
});

describe('get', () => {
  it('returns a configuration without criteria', () => {
    const store = ConfigStore.fromManifest(manifest);

    expect(store.get('/')).toEqual({
      key2: 'value3',
    });
  });

  it('returns a configuration with criteria applied', () => {
    const store = ConfigStore.fromManifest(manifest);

    expect(store.get('/', {env: 'development'})).toEqual({
      key1: 'value1',
      key2: 'value3',
    });
  });
});
