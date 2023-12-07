/**
 * EditorOp:
 * - op: "insert" | "delete"
 * - ref: Timestamp
 * - val: string
 * - t: Timestamp
 */
export class EditorOp {
  constructor(op, ref, val, t) {
    this.op = op
    this.ref = ref
    this.val = val
    this.t = t
  }

  toJSON = () => {
    return {
      op: this.op,
      ref: this.ref,
      val: this.val,
      t: this.t,
    }
  }
}

EditorOp.fromJSON = (o) => {
  return new EditorOp(o.op, o.ref, o.val, o.t)
}
