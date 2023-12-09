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
    if (!t) {
      return false
    }

    return this.clock === t.clock && this.host === t.host
  }

  compareTo = (t) => {
    if (this.clock < t.clock) {
      return -1
    }

    if (this.clock > t.clock) {
      return 1
    }

    if (this.host < t.host) {
      return -1
    }

    if (this.host > t.host) {
      return 1
    }

    return 0
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
