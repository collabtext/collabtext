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
    return this.td !== null
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
   * (but there may be more than one such element)
   *
   * @param {*} ref
   * @param {*} val
   * @param {*} t
   * @returns
   */
  insert = (ref, val, t) => {
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
   * Looks up the element with the given timestamp
   *
   * @param {*} t
   * @returns
   */
  get = (t) => {
    return t ? this.map.get(t.key()) : undefined
  }

  /**
   * Scans the list to locate an appropriate insertion point
   *
   * @param {*} ref
   * @param {*} t
   * @returns the node after which to insert
   */
  scan = (ref, t) => {
    if (!ref) {
      // Before the first element
      // TODO: Check the second condition (in the loop)
      let h = this.head
      while (h.next && !h.next.ref && t.compareTo(h.next.ti) < 0) {
        h = h.next
      }

      return h
    }

    // After ref
    // TODO: Check the second condition (in the loop)
    let r = this.get(ref)
    while (r.next && ref.equals(r.next.ref) && t.compareTo(r.next.ti) < 0) {
      r = r.next
    }

    return r
  }

  /**
   * Deletes the specified element from this data structure
   *
   * @param {*} ti the element to remove
   * @param {*} td timestamp of deletion
   * @returns true if the deletion was successful, false otherwise
   */
  delete = (ti, td) => {
    const node = this.map.get(ti.key())
    if (!node) {
      return false
    }

    if (!node.isTombstone()) {
      node.td = td
    }

    return true
  }

  /**
   * Returns all the values in document order
   *
   * @returns an array of values in document order
   */
  toArray = () => {
    let arr = []
    for (let i = 0, node = this.head.next; node !== null; node = node.next) {
      if (!node.isTombstone()) {
        arr[i] = node.val
        i++
      }
    }

    return arr
  }
}
