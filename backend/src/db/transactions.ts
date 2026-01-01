import type { Db } from './schema'
import { logger } from '../utils/logger'

export async function withTransactionAsync<T>(
  db: Db,
  fn: (db: Db) => Promise<T>
): Promise<T> {
  try {
    db.exec('BEGIN TRANSACTION')
    const result = await fn(db)
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    logger.error('Transaction rolled back:', error)
    throw error
  }
}
