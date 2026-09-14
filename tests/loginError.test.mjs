import test from 'node:test';
import assert from 'node:assert/strict';
import { loginErrorMessage } from '../src/lib/loginError.mjs';

test('only credential rejection is shown as an incorrect password', () => {
  assert.match(loginErrorMessage({ error: 'CredentialsSignin', ok: false }), /mật khẩu không đúng/);
  for (const result of [undefined, { error: 'AUTH_DATABASE_UNAVAILABLE', ok: false }, { error: 'Configuration', ok: false }, { error: 'fetch failed', ok: false }]) {
    assert.doesNotMatch(loginErrorMessage(result), /mật khẩu không đúng/);
  }
  assert.equal(loginErrorMessage({ ok: true, error: null }), null);
});
