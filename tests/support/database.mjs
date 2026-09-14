import path from 'node:path';
import { createClient } from '@libsql/client';
import { createDatabaseAdapter } from '../../src/lib/databaseAdapter.mjs';

export default class TestDatabase {
  constructor(filename = ':memory:') {
    return createDatabaseAdapter(createClient({ url: filename === ':memory:' ? ':memory:' : `file:${path.resolve(filename)}`, intMode: 'number' }));
  }
}
