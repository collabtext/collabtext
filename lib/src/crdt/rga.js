/**
 * Node<T>:
 * - ref: Timestamp
 * - val: T
 * - ti: Timestamp
 * - td: Timestamp
 * - next: Node
 * - prev: Node
 */
class Node {
  constructor(ref, val, ti, td, next, prev) {
    this.ref = ref
    this.val = val
    this.ti = ti
    this.td = td
    this.next = next
    this.prev = prev
  }

  isTombstone = () => {
    return !!this.td
  }
}

/**
 * A replicated growable array (RGA)
 */
export class RGA {
  /**
   * Constructs an empty RGA
   */
  constructor() {
    // Head always points to a special empty element
    this.head = { next: null }
    this.map = new Map()
  }

  /**
   * Inserts val after ref
   *
   * A null ref indicates before the first element
   * (but note that there may be more than one such element)
   *
   * @param {Timestamp} ref the timestamp of the reference element
   * @param {string} val the value to be inserted
   * @param {Timestamp} t the timestamp of this insertion
   * @returns true if the insertion was successful, false otherwise
   */
  insert = (ref, val, t) => {
    // Check if this is a duplicate op
    if (this.get(t)) {
      return false
    }

    // Find the ref (the object on the left)
    const refNode = this.get(ref)
    if (ref && !refNode) {
      return false
    }

    // Scan possible places
    const r = this.scan(ref, t)

    // Create a new node
    const ins = new Node(ref, val, t, null, r.next, r)

    // Insert
    if (r.next) {
      r.next.prev = ins
    }
    r.next = ins
    this.map.set(t.key(), ins)

    return true
  }

  /**
   * Looks up the element with the specified timestamp
   *
   * @param {Timestamp} t the timestamp of the element to be returned
   * @returns the element with the specified timestamp, or undefined if no such element
   */
  get = (t) => {
    return t ? this.map.get(t.key()) : undefined
  }

  /**
   * Scans the list to locate an appropriate insertion point
   *
   * Returns the node after which insertion should take place
   *
   * @param {Timestamp} ref the timestamp of the reference element
   * @param {Timestamp} t the timestamp of the insertion (used to break ties)
   * @returns the node after which to insert
   */
  scan = (ref, t) => {
    if (!ref) {
      // Before the first element
      let h = this.head
      while (h.next && t.compareTo(h.next.ti) < 0) {
        h = h.next
      }

      return h
    }

    // After ref
    let r = this.get(ref)
    while (r.next && t.compareTo(r.next.ti) < 0) {
      r = r.next
    }

    return r
  }

  /**
   * Deletes the specified element from this data structure
   *
   * @param {Timestamp} ti the timestamp of the element to remove
   * @param {Timestamp} td the timestamp of deletion
   * @returns true if the deletion was successful, false otherwise
   */
  delete = (ti, td) => {
    if (!ti || !td) {
      const details = `Given ti: ${JSON.stringify(ti?.toJSON())} and td: ${JSON.stringify(td?.toJSON())}`
      throw new Error(`Deleting an element failed: timestamp not specified. ${details}`)
    }

    const node = this.map.get(ti.key())
    if (!node || node.isTombstone()) {
      return false
    }

    node.td = td
    return true
  }

  /**
   * Returns an array of all the values in document order
   *
   * @returns an array of values in document order
   */
  toArray = () => {
    let arr = []
    for (let node = this.head.next; node !== null; node = node.next) {
      if (!node.isTombstone()) {
        arr.push(node.val)
      }
    }

    return arr
  }
}
