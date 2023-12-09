import diff from "fast-diff"

import { RGA } from "./rga"
import { Timestamp } from "./timestamp"

/**
 * RemoteOp<T>:
 * - op: "insert" | "delete"
 * - ref: Timestamp
 * - val: T
 * - t: Timestamp
 */
export class RemoteOp {
  constructor(op, ref, val, t) {
    this.op = op
    this.ref = ref
    this.val = val
    this.t = t
  }

  toJSON = () => {
    return {
      op: this.op,
      ref: this.ref?.toJSON(),
      val: this.val,
      t: this.t?.toJSON(),
    }
  }
}

RemoteOp.fromJSON = (o) => {
  return new RemoteOp(o.op, o.ref, o.val, o.t)
}

/**
 * Represents a plain text document backed by an RGA data structure
 */
export class RGADoc {
  /**
   * Constructs an empty document
   *
   * @param {number} host the host ID for this node
   */
  constructor(host) {
    if (host === undefined || host === null) {
      throw new Error("Document construction failed: no host ID specified:", host)
    }

    this.rga = new RGA()
    this.clock = 0
    this.host = host
  }

  /**
   * Applies a remote operation to this document.
   *
   * Returns true if the given operation was applied locally.
   * Returns false if the operation was ignored, which can happen
   * when executing the same operation multiple times.
   *
   * @param {RemoteOp} op the remote operation to be applied
   * @returns true if the given operation was applied locally, false otherwise
   */
  applyRemoteOp = (op) => {
    if (op.val.length !== 1) {
      // To keep things simple, operations must operate on individual chars
      // This restriction might be lifted in the future
      throw new Error("Remote operation's value attribute must have length 1")
    }

    let applied = false
    if (op.op === "insert") {
      applied = this.rga.insert(op.ref, op.val, op.t)
    } else if (op.op === "delete") {
      applied = this.rga.delete(op.ref, op.t)
    } else {
      throw new Error(`Unsupported remote operation "${op.op}" with content: ${JSON.stringify(op.toJSON())}`)
    }

    if (!applied) {
      // Ignored
      // TODO: Don't forget "delayed" deletes
      return false
    }

    // TODO: Should we update the clock even if op ignored?
    this.clock = Math.max(this.clock, op.t.clock) + 1

    return true
  }

  /**
   * Updates this document so that its new state matches the specified string
   *
   * Can be used to apply local changes
   *
   * Returns the corresponding set of remote operations
   *
   * @param {string} newStr the new string
   * @returns an array of the corresponding remote operations
   */
  diffAndPatch = (newStr) => {
    // TODO: Consider maintaining a cached copy of the current string
    const oldStr = this.toString()

    // Returns the next still existing node
    // TODO: Consider writing an RGA iterator
    const next = (node) => {
      node = node.next
      while (node && node.isTombstone()) {
        node = node.next
      }

      return node
    }

    // A special case just for deletions
    const next2 = (node) => {
      node = node.next
      while (node.next && node.next.isTombstone()) {
        node = node.next
      }

      return node
    }

    // Compute a diff and iterate over the result
    // TODO: diff supports a cursor position argument, consider using it
    const result = diff(oldStr, newStr)
    let node = this.rga.head  // TODO: Consider an iterator
    const ops = []
    for (const [type, text] of result) {
      for (const char of text) {
        switch (type) {
          case diff.INSERT: {
            // Insert char after the current node
            const ti = node.ti ?? null  // Head has no "ti" field (it's undefined)
            this.rga.insert(ti, char, this.ts())
            ops.push(new RemoteOp("insert", ti, char, this.ts()))
            node = node.next  // next should refer to the new node
            this.clock++
            break
          }
          case diff.DELETE: {
            // Convert the next node to a tombstone record
            this.rga.delete(node.next.ti, this.ts())
            ops.push(new RemoteOp("delete", node.next.ti, char, this.ts()))
            node = next2(node)
            this.clock++
            break
          }
          case diff.EQUAL: {
            // Skip the current char
            node = next(node)
            break
          }
        }
      }
    }

    return ops
  }

  /**
   * Returns the contents of this document as a string.
   *
   * This method traverses the entire RGA from start to finish,
   * which can be an expensive operation.
   *
   * @returns the contents of this document as a string
   */
  toString = () => {
    return this.rga.toArray().join("")
  }

  /**
   * Returns the current clock value for this host
   *
   * @returns the current clock value for this host
   */
  getClock = () => {
    return this.clock
  }

  /**
   * Returns the current host ID for this host
   *
   * @returns the current host ID for this host
   */
  getHost = () => {
    return this.host
  }

  /**
   * Returns the current timestamp for this host
   *
   * @returns the current timestamp for this host
   */
  ts = () => {
    return new Timestamp(this.clock, this.host)
  }
}
