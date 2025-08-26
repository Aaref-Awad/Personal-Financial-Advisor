import { openDB, type IDBPDatabase } from "idb";
import type { DBTransaction } from "../../utils/parseCSV";

export type TransactionsDB = IDBPDatabase<{
  transactions: {
    key: string;
    value: DBTransaction;
    indexes: {
      byAccountNumber: string;
      byTransactionDate: string;
    };
  };
}>;

export async function initDB(): Promise<TransactionsDB> {
  return openDB("transactionsDB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("transactions")) {
        const store = db.createObjectStore("transactions", {
          keyPath: "id",
        });
        
        // Now using clean property names
        store.createIndex("byAccountNumber", "accountNumber", { unique: false });
        store.createIndex("byTransactionDate", "transactionDate", { unique: false });
      }
    },
  });
}