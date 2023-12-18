import * as Confidence from 'confidence';
import {readFile} from 'node:fs/promises';
import StripJsonComments from 'strip-json-comments';

export class ConfigStore {
  private store: Confidence.Store;

  constructor() {
    this.store = new Confidence.Store();
  }

  loadFromManifest(manifest: object) {
    this.store.load(manifest);
  }

  async loadFromFile(filename: string) {
    const data = await readFile(filename, 'utf-8');
    const manifest = JSON.parse(StripJsonComments(data));
    this.loadFromManifest(manifest);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string, criteria?: any): any {
    return this.store.get(key, criteria);
  }

  static fromManifest(manifest: object) {
    const config = new ConfigStore();
    config.loadFromManifest(manifest);
    return config;
  }

  static async fromFile(filename: string) {
    const config = new ConfigStore();
    await config.loadFromFile(filename);
    return config;
  }
}
