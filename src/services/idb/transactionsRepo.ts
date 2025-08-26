import { initDB } from "./initDB";
import { convertToDBFormat, type ParsedRow } from "../../utils/parseCSV";

// Create
export async function addTransaction(row: ParsedRow) {
  try {
    const db = await initDB();
    console.log('DB initialized successfully');
   
    const tx = db.transaction("transactions", "readwrite");
    console.log('Transaction created');
   
    // Convert to DB-safe format
    const dbRow = convertToDBFormat(row);
    await tx.store.add(dbRow);
    console.log('Record added to store');
   
    await tx.done;
    console.log('Transaction completed');
  } catch (error) {
    console.error('Detailed error in addTransaction:', {
      error,
      errorName: (error instanceof Error ? error.name : 'Unknown'),
      errorMessage: (error instanceof Error ? error.message : String(error)),
      row: row
    });
    throw error;
  }
}

// Bulk Create
export async function addTransactions(rows: ParsedRow[]) {
  const db = await initDB();
  const tx = db.transaction("transactions", "readwrite");
  for (const row of rows) {
    // Convert each row to DB format
    const dbRow = convertToDBFormat(row);
    await tx.store.add(dbRow);
  }
  await tx.done;
}

// Read
export async function getTransaction(id: string) {
  const db = await initDB();
  const record = await db.get("transactions", id);
  if (!record) throw new Error(`Transaction with id ${id} not found`);
  return record;
}

// Read All
export async function getAllTransactions() {
  const db = await initDB();
  return await db.getAll("transactions");
}

// Read by Index
export async function getByAccountNumber(accountNumber: string) {
  const db = await initDB();
  return await db.getAllFromIndex("transactions", "byAccountNumber", accountNumber);
}

export async function getByTransactionDate(date: string) {
  const db = await initDB();
  return await db.getAllFromIndex("transactions", "byTransactionDate", date);
}

// Update
export async function updateTransaction(row: ParsedRow) {
  const db = await initDB();
  const existing = await db.get("transactions", row.id);
  if (!existing) throw new Error(`Cannot update, transaction with id ${row.id} does not exist`);
  
  // Convert to DB format before storing
  const dbRow = convertToDBFormat(row);
  await db.put("transactions", dbRow);
}

// Delete
export async function deleteTransaction(id: string) {
  const db = await initDB();
  await db.delete("transactions", id);
}

// Clear All
export async function clearTransactions() {
  const db = await initDB();
  await db.clear("transactions");
}

export async function getTransactionCount(): Promise<number> {
  const db = await initDB();
  return await db.count("transactions");
}