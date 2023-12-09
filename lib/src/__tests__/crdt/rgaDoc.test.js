/**
 * Unit tests for the class RGADoc
 *
 * Some of these tests include repetition, and therefore aren't very readable
 */

import { RGADoc, RemoteOp, Timestamp } from "../../crdt"

const createDocFromStr = (str) => {
  const r = new RGADoc(0)
  let ref = null
  let clock = 0
  for (const char of str) {
    const t = new Timestamp(clock, 0)
    r.applyRemoteOp(new RemoteOp("insert", ref, char, t))
    ref = t
    clock++
  }

  return r
}

describe("initialize", () => {
  test("can construct an empty document", () => {
    const r = new RGADoc(11)
    expect(r.toString()).toBe("")
    expect(r.getClock()).toBe(0)
    expect(r.getHost()).toBe(11)
  })

  test("cannot construct a document without specifying a host ID", () => {
    expect(() => new RGADoc()).toThrow("no host ID specified")
  })
})

describe("applyRemoteOp/insert", () => {
  test("can insert one item into an empty document", () => {
    const r = new RGADoc(0)

    r.applyRemoteOp(new RemoteOp("insert", null, "a", new Timestamp(0, 0)))
    expect(r.toString()).toBe("a")
  })

  test("can insert multiple items in order", () => {
    const r = new RGADoc(0)
    r.applyRemoteOp(new RemoteOp("insert", null, "a", new Timestamp(0, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(0, 0), "b", new Timestamp(1, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(1, 0), "c", new Timestamp(2, 0)))
    expect(r.toString()).toBe("abc")
  })
})

describe("applyRemoteOp/delete", () => {
  let r = new RGADoc(0)

  beforeEach(() => {
    // Insert "abc"
    r = new RGADoc(0)
    r.applyRemoteOp(new RemoteOp("insert", null, "a", new Timestamp(0, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(0, 0), "b", new Timestamp(1, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(1, 0), "c", new Timestamp(2, 0)))
  })

  test("can delete the first item", () => {
    r.applyRemoteOp(new RemoteOp("delete", new Timestamp(0, 0), "a", new Timestamp(3, 0)))
    expect(r.toString()).toBe("bc")
  })

  test("can delete all (until the list is empty) starting from the tail", () => {
    r.applyRemoteOp(new RemoteOp("delete", new Timestamp(2, 0), "c", new Timestamp(3, 0)))
    r.applyRemoteOp(new RemoteOp("delete", new Timestamp(1, 0), "b", new Timestamp(4, 0)))
    r.applyRemoteOp(new RemoteOp("delete", new Timestamp(0, 0), "a", new Timestamp(5, 0)))
    expect(r.toString()).toBe("")
  })
})

describe("applyRemoteOp/combine", () => {
  test("can mix inserts and deletes", () => {
    // Insert "abc" (normally)
    const r = new RGADoc(0)
    r.applyRemoteOp(new RemoteOp("insert", null, "a", new Timestamp(0, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(0, 0), "b", new Timestamp(1, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(1, 0), "c", new Timestamp(2, 0)))

    // Delete b (from the middle)
    r.applyRemoteOp(new RemoteOp("delete", new Timestamp(1, 0), "b", new Timestamp(3, 0)))

    // Insert "xy" (both before and after the deleted item)
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(0, 0), "x", new Timestamp(4, 0)))
    r.applyRemoteOp(new RemoteOp("insert", new Timestamp(1, 0), "y", new Timestamp(5, 0)))

    expect(r.toString()).toBe("axyc")
  })
})

describe("diffAndPatch/insert", () => {
  test("can add one char to an empty document", () => {
    const r = new RGADoc(0)
    const ops = r.diffAndPatch("a")

    expect(r.toString()).toBe("a")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("insert", null, "a", new Timestamp(0, 0)).toJSON())
    expect(ops.length).toBe(1)
  })

  test("can add multiple chars to an empty document in order", () => {
    const r = new RGADoc(0)
    const ops = r.diffAndPatch("abc")

    const tsA = new Timestamp(0, 0)
    const tsB = new Timestamp(1, 0)
    const tsC = new Timestamp(2, 0)

    expect(r.toString()).toBe("abc")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("insert", null, "a", tsA).toJSON())
    expect(ops[1].toJSON()).toEqual(new RemoteOp("insert", tsA, "b", tsB).toJSON())
    expect(ops[2].toJSON()).toEqual(new RemoteOp("insert", tsB, "c", tsC).toJSON())
    expect(ops.length).toBe(3)
  })
})

describe("diffAndPatch/delete", () => {
  let r = new RGADoc(0)
  const tsA = new Timestamp(0, 0)
  const tsB = new Timestamp(1, 0)
  const tsC = new Timestamp(2, 0)

  beforeEach(() => {
    // Insert "abc"
    r = new RGADoc(0)
    r.applyRemoteOp(new RemoteOp("insert", null, "a", tsA))
    r.applyRemoteOp(new RemoteOp("insert", tsA, "b", tsB))
    r.applyRemoteOp(new RemoteOp("insert", tsB, "c", tsC))
  })

  test("can delete a single char from a document", () => {
    const ops = r.diffAndPatch("ac")
    expect(r.toString()).toBe("ac")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("delete", tsB, "b", new Timestamp(3, 0)).toJSON())
    expect(ops.length).toBe(1)
  })

  test("can delete multiple chars from a document", () => {
    const ops = r.diffAndPatch("b")
    expect(r.toString()).toBe("b")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("delete", tsA, "a", new Timestamp(3, 0)).toJSON())
    expect(ops[1].toJSON()).toEqual(new RemoteOp("delete", tsC, "c", new Timestamp(4, 0)).toJSON())
    expect(ops.length).toBe(2)
  })
})

describe("diffAndPatch/combine", () => {
  test("can mix inserts and deletes", () => {
    // Insert "abc" (normally)
    const r = createDocFromStr("abc")
    const ops = r.diffAndPatch("axyc")

    expect(r.toString()).toBe("axyc")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("delete", new Timestamp(1, 0), "b", new Timestamp(3, 0)).toJSON())
    expect(ops[1].toJSON()).toEqual(new RemoteOp("insert", new Timestamp(1, 0), "x", new Timestamp(4, 0)).toJSON())
    expect(ops[2].toJSON()).toEqual(new RemoteOp("insert", new Timestamp(4, 0), "y", new Timestamp(5, 0)).toJSON())
    expect(ops.length).toBe(3)
  })

  test("can do the example on the web site", () => {
    // Example: "Good dog" --> "Bad dog"
    const r = createDocFromStr("Good dog")
    const ops = r.diffAndPatch("Bad dog")

    expect(r.toString()).toBe("Bad dog")
    expect(ops[0].toJSON()).toEqual(new RemoteOp("delete", new Timestamp(0, 0), "G", new Timestamp(8, 0)).toJSON())
    expect(ops[1].toJSON()).toEqual(new RemoteOp("delete", new Timestamp(1, 0), "o", new Timestamp(9, 0)).toJSON())
    expect(ops[2].toJSON()).toEqual(new RemoteOp("delete", new Timestamp(2, 0), "o", new Timestamp(10, 0)).toJSON())
    expect(ops[3].toJSON()).toEqual(new RemoteOp("insert", new Timestamp(2, 0), "B", new Timestamp(11, 0)).toJSON())
    expect(ops[4].toJSON()).toEqual(new RemoteOp("insert", new Timestamp(11, 0), "a", new Timestamp(12, 0)).toJSON())
    expect(ops.length).toBe(5)
  })
})

describe("clock", () => {
  test("clock starts at zero", () => {
    const r = new RGADoc(0)
    expect(r.getClock()).toBe(0)
  })

  test("clock is updated when applying a remote insert", () => {
    const r = new RGADoc(0)
    r.applyRemoteOp(new RemoteOp("insert", null, "a", new Timestamp(100, 0)))
    expect(r.getClock()).toBe(101)
  })
})
