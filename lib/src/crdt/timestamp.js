/**
 * Timestamp:
 * - clock: number
 * - host: number
 */
export class Timestamp {
  constructor(clock, host) {
    this.clock = clock,
    this.host = host
  }

  equals = (t) => {
    return this.clock === t.clock && this.host === t.host
  }

  compareTo = (t) => {
    if (this.clock < t.clock) {
      return -1
    }

    if (this.clock > t.clock) {
      return 1
    }

    return this.host < t.host ? -1 : 1
  }

  key = () => {
    return `(${this.clock}, ${this.host})`
  }

  toJSON = () => {
    return {
      clock: this.clock,
      host: this.host,
    }
  }
}

Timestamp.fromJSON = (t) => {
  return new Timestamp(t.clock, t.host)
}
