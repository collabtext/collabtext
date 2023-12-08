import { Timestamp } from "../../crdt"

describe("equals", () => {
  test("can test equality (when equal)", () => {
    const t1 = new Timestamp(10, 1)
    const t2 = new Timestamp(10, 1)
    expect(t1.equals(t2)).toBe(true)
  })

  test("can test equality (when unequal)", () => {
    // All fields different
    const t1 = new Timestamp(1, 2)
    const t2 = new Timestamp(3, 4)
    expect(t1.equals(t2)).toBe(false)

    // Same clock
    const t3 = new Timestamp(5, 6)
    const t4 = new Timestamp(5, 7)
    expect(t3.equals(t4)).toBe(false)

    // Same host
    const t5 = new Timestamp(8, 9)
    const t6 = new Timestamp(10, 9)
    expect(t5.equals(t6)).toBe(false)
  })
})

describe("compareTo", () => {
  test("can compare equal timestamps", () => {
    const t1 = new Timestamp(10, 1)
    const t2 = new Timestamp(10, 1)
    expect(t1.compareTo(t2)).toBe(0)
    expect(t2.compareTo(t1)).toBe(0)
  })

  test("can compare different timestamp combinations", () => {
    // All fields unequal
    const t1 = new Timestamp(1, 2)
    const t2 = new Timestamp(3, 4)
    expect(t1.compareTo(t2)).toBe(-1)
    expect(t2.compareTo(t1)).toBe(1)

    // Different clocks but same host
    const t3 = new Timestamp(1, 2)
    const t4 = new Timestamp(3, 2)
    expect(t3.compareTo(t4)).toBe(-1)
    expect(t4.compareTo(t3)).toBe(1)

    // Equal clocks but different host
    const t5 = new Timestamp(1, 2)
    const t6 = new Timestamp(1, 3)
    expect(t5.compareTo(t6)).toBe(-1)
    expect(t6.compareTo(t5)).toBe(1)
  })
})

describe("key", () => {
  test("can read the hash key", () => {
    const t = new Timestamp(1, 2)
    expect(t.key()).toBe("(1, 2)")
  })
})
