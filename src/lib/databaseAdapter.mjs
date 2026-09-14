import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as delay } from 'node:timers/promises';

// Keep a transaction's queries on its own connection, including calls through shared services.
export function createDatabaseAdapter(client) {
  const context = new AsyncLocalStorage();
  let pending = Promise.resolve();
  const enqueue = operation => {
    const result = pending.then(operation, operation);
    pending = result.then(() => undefined, () => undefined);
    return result;
  };
  const execute = statement => {
    const transaction = context.getStore();
    return transaction ? transaction.execute(statement) : enqueue(() => client.execute(statement));
  };
  const adapter = {
    prepare(sql) {
      return {
        async all(...args) { return (await execute({ sql, args })).rows.map(row => ({ ...row })); },
        async get(...args) { return (await this.all(...args))[0]; },
        async run(...args) {
          const result = await execute({ sql, args });
          return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    async exec(sql) {
      const transaction = context.getStore();
      if (transaction) return transaction.executeMultiple(sql);
      return enqueue(() => client.executeMultiple(sql));
    },
    transaction(callback) {
      const run = async (...args) => {
        if (context.getStore()) return callback(...args);
        return enqueue(async () => {
          let transaction;
          for (let attempt = 0; ; attempt++) {
            try { transaction = await client.transaction('write'); break; }
            catch (error) {
              // Retry only acquiring the lock, never replay a transaction with an uncertain commit.
              if (!String(error.code).startsWith('SQLITE_BUSY') || attempt >= 5) throw error;
              await delay(25 * (2 ** attempt));
            }
          }
          try {
            const result = await context.run(transaction, () => callback(...args));
            await transaction.commit();
            return result;
          } catch (error) {
            try { await transaction.rollback(); } catch { /* Preserve the original failure. */ }
            throw error;
          } finally { transaction.close(); }
        });
      };
      run.immediate = run;
      return run;
    },
    async close() { await enqueue(() => client.close()); },
  };
  return adapter;
}
