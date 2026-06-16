import type { MedicineBatch } from "@/types";

/**
 * FEFO — First-Expired-First-Out stock allocation.
 *
 * Pure, side-effect-free, and unit-testable: it never touches the database.
 * Given the available batches of one medicine and a quantity to dispense, it
 * decides WHICH batches to draw from and how much from each, always consuming
 * the soonest-to-expire stock first. The caller (inventory repository) then
 * persists the resulting allocations inside a single transaction.
 *
 * This is the compliance "wow" point: expired-soonest stock leaves first, so
 * nothing rots on the shelf and dispensing is fully traceable per batch.
 */

export interface FefoAllocation {
  batchId: number;
  /** Units taken from this batch. */
  taken: number;
  tglKadaluarsa: string;
  noBatch: string;
}

export interface FefoResult {
  allocations: FefoAllocation[];
  /** Units that could NOT be filled (requested beyond total available stock). */
  shortfall: number;
}

/**
 * Allocate `qtyNeeded` units across `batches` using FEFO ordering.
 * Batches are sorted by expiry ascending (earliest first); ties broken by id
 * for deterministic output. Empty batches (qty <= 0) are skipped.
 */
export function allocateFefo(batches: MedicineBatch[], qtyNeeded: number): FefoResult {
  const allocations: FefoAllocation[] = [];
  let remaining = qtyNeeded;

  const ordered = [...batches]
    .filter((b) => b.qty > 0)
    .sort((a, b) => {
      if (a.tglKadaluarsa !== b.tglKadaluarsa) {
        return a.tglKadaluarsa < b.tglKadaluarsa ? -1 : 1;
      }
      return a.id - b.id;
    });

  for (const batch of ordered) {
    if (remaining <= 0) break;
    const taken = Math.min(batch.qty, remaining);
    allocations.push({
      batchId: batch.id,
      taken,
      tglKadaluarsa: batch.tglKadaluarsa,
      noBatch: batch.noBatch,
    });
    remaining -= taken;
  }

  return { allocations, shortfall: Math.max(0, remaining) };
}
