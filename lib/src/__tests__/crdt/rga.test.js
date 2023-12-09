/**
 * Unit tests for the RGA data structure
 */

import { RGA, Timestamp } from "../../crdt"

describe("initialize", () => {
  test("can construct an empty list", () => {
    const r = new RGA()
    expect(r.toArray()).toEqual([])
  })
})

describe("insert", () => {
  test("can insert one item into an empty list", () => {
    const r = new RGA()
    r.insert(null, "a", new Timestamp(0, 0))
    expect(r.toArray()).toEqual(["a"])
  })

  test("can insert multiple items in order", () => {
    const r = new RGA()
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(new Timestamp(0, 0), "b", new Timestamp(1, 0))
    r.insert(new Timestamp(1, 0), "c", new Timestamp(2, 0))
    expect(r.toArray()).toEqual("abc".split(""))
  })

  test("can insert multiple items in reverse order at the head", () => {
    const r = new RGA()
    r.insert(null, "c", new Timestamp(0, 0))
    r.insert(null, "b", new Timestamp(1, 0))
    r.insert(null, "a", new Timestamp(2, 0))
    expect(r.toArray()).toEqual("abc".split(""))
  })

  test("can insert multiple items in reverse order in the middle", () => {
    const r = new RGA()
    // Insert "ae" in (normal) order
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(new Timestamp(0, 0), "e", new Timestamp(1, 0))

    // Insert "bcd" in reverse order
    r.insert(new Timestamp(0, 0), "d", new Timestamp(2, 0))
    r.insert(new Timestamp(0, 0), "c", new Timestamp(3, 0))
    r.insert(new Timestamp(0, 0), "b", new Timestamp(4, 0))

    expect(r.toArray()).toEqual("abcde".split(""))
  })
})

describe("delete", () => {
  let r = new RGA()

  beforeEach(() => {
    // Insert "abc"
    r = new RGA()
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(new Timestamp(0, 0), "b", new Timestamp(1, 0))
    r.insert(new Timestamp(1, 0), "c", new Timestamp(2, 0))
  })

  test("can delete the first item", () => {
    r.delete(new Timestamp(0, 0), new Timestamp(3, 0))
    expect(r.toArray()).toEqual("bc".split(""))
  })

  test("can delete a middle item", () => {
    r.delete(new Timestamp(1, 0), new Timestamp(3, 0))
    expect(r.toArray()).toEqual("ac".split(""))
  })

  test("can delete the last item", () => {
    r.delete(new Timestamp(2, 0), new Timestamp(3, 0))
    expect(r.toArray()).toEqual("ab".split(""))
  })

  test("can delete all (until the list is empty) starting from the tail", () => {
    r.delete(new Timestamp(2, 0), new Timestamp(3, 0))
    r.delete(new Timestamp(1, 0), new Timestamp(4, 0))
    r.delete(new Timestamp(0, 0), new Timestamp(5, 0))
    expect(r.toArray()).toEqual([])
  })

  test("can delete all (until the list is empty) starting from the head", () => {
    r.delete(new Timestamp(0, 0), new Timestamp(3, 0))
    r.delete(new Timestamp(1, 0), new Timestamp(4, 0))
    r.delete(new Timestamp(2, 0), new Timestamp(5, 0))
    expect(r.toArray()).toEqual([])
  })
})

describe("combine", () => {
  test("can mix inserts and deletes", () => {
    // Insert "abc" (normally)
    const r = new RGA()
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(new Timestamp(0, 0), "b", new Timestamp(1, 0))
    r.insert(new Timestamp(1, 0), "c", new Timestamp(2, 0))

    // Delete b (from the middle)
    r.delete(new Timestamp(1, 0), new Timestamp(3, 0))

    // Insert "xy" (both before and after the deleted item)
    r.insert(new Timestamp(0, 0), "x", new Timestamp(4, 0))
    r.insert(new Timestamp(1, 0), "y", new Timestamp(5, 0))

    expect(r.toArray()).toEqual("axyc".split(""))
  })
})

describe("duplicate ops", () => {
  let r = new RGA()

  beforeEach(() => {
    // Insert "abc"
    r = new RGA()
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(new Timestamp(0, 0), "b", new Timestamp(1, 0))
    r.insert(new Timestamp(1, 0), "c", new Timestamp(2, 0))
  })

  test("can insert the same element multiple times (inserted only once)", () => {
    const r = new RGA()

    // Insert "a" three times
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(null, "a", new Timestamp(0, 0))
    r.insert(null, "a", new Timestamp(0, 0))
    expect(r.toArray()).toEqual("a".split(""))
  })

  test("can delete the same element multiple times (deleted only once)", () => {
    // Delete "b" three times
    r.delete(new Timestamp(1, 0), new Timestamp(3, 0))
    r.delete(new Timestamp(1, 0), new Timestamp(3, 0))
    r.delete(new Timestamp(1, 0), new Timestamp(3, 0))
    expect(r.toArray()).toEqual("ac".split(""))
  })
})
