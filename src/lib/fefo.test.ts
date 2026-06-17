import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateFefo } from "@/lib/fefo";
import type { MedicineBatch } from "@/types";

function batch(id: number, qty: number, exp: string): MedicineBatch {
  return {
    id,
    medicineId: 1,
    noBatch: `B${id}`,
    tglKadaluarsa: exp,
    qty,
    hargaBeli: null,
    createdAt: "2026-01-01T00:00:00+07:00",
  };
}

test("draws from soonest-to-expire batch first", () => {
  const res = allocateFefo([batch(1, 10, "2027-01-01"), batch(2, 10, "2026-06-01")], 5);
  assert.equal(res.allocations.length, 1);
  assert.equal(res.allocations[0]?.batchId, 2);
  assert.equal(res.allocations[0]?.taken, 5);
  assert.equal(res.shortfall, 0);
});

test("spans multiple batches in expiry order", () => {
  const res = allocateFefo([batch(1, 4, "2026-05-01"), batch(2, 4, "2026-06-01")], 6);
  assert.deepEqual(
    res.allocations.map((a) => [a.batchId, a.taken]),
    [
      [1, 4],
      [2, 2],
    ],
  );
  assert.equal(res.shortfall, 0);
});

test("ties on expiry break by id ascending", () => {
  const res = allocateFefo([batch(5, 3, "2026-06-01"), batch(2, 3, "2026-06-01")], 4);
  assert.equal(res.allocations[0]?.batchId, 2);
  assert.equal(res.allocations[1]?.batchId, 5);
});

test("skips empty batches", () => {
  const res = allocateFefo([batch(1, 0, "2026-05-01"), batch(2, 5, "2026-06-01")], 3);
  assert.equal(res.allocations.length, 1);
  assert.equal(res.allocations[0]?.batchId, 2);
});

test("reports shortfall when demand exceeds stock", () => {
  const res = allocateFefo([batch(1, 2, "2026-05-01")], 5);
  assert.equal(res.allocations[0]?.taken, 2);
  assert.equal(res.shortfall, 3);
});

test("empty input yields full shortfall", () => {
  const res = allocateFefo([], 4);
  assert.deepEqual(res.allocations, []);
  assert.equal(res.shortfall, 4);
});

test("does not mutate the input array", () => {
  const input = [batch(1, 5, "2027-01-01"), batch(2, 5, "2026-06-01")];
  const snapshot = input.map((b) => b.id);
  allocateFefo(input, 3);
  assert.deepEqual(
    input.map((b) => b.id),
    snapshot,
  );
});
