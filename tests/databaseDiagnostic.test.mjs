import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client/web';
import { databaseDiagnostic, withDatabaseStage } from '../src/lib/databaseDiagnostic.mjs';

for (const status of [401, 403, 404, 429, 500, 503]) {
  test(`extracts HTTP ${status} from the real libSQL error without logging response secrets`, async () => {
    const client = createClient({url:'https://database.example',authToken:'private-token',fetch:async () => new Response('private-token https://private-url secret SQL', {status,headers:{'content-type':'text/plain'}})});
    try {
      await assert.rejects(() => withDatabaseStage('connection', () => client.execute('SELECT 1')), error => {
        const result=databaseDiagnostic(error);
        assert.equal(result.httpStatus,status);
        assert.equal(result.code,'SERVER_ERROR');
        assert.equal(result.stage,'connection');
        assert.ok(result.hint);
        assert.doesNotMatch(JSON.stringify(result), /private|secret|SELECT/);
        return true;
      });
    } finally {client.close();}
  });
}
test('preserves the precise initialization stage through outer wrappers', async () => {
  await assert.rejects(() => withDatabaseStage('configuration', () => withDatabaseStage('admin_bootstrap', () => {throw new Error('sensitive');})), error => {
    assert.equal(databaseDiagnostic(error).stage,'admin_bootstrap');return true;
  });
});
test('handles cyclic causes and omits arbitrary codes and messages', () => {
 const error={code:'SECRET_TOKEN',message:'private'};error.cause=error;
 assert.deepEqual(databaseDiagnostic(error),{stage:'account_lookup',code:'UNKNOWN'});
});
