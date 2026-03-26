import type { CollabEvent } from './contracts'

type Listener = (event: CollabEvent) => void

export class CollabTransport {
  private listeners = new Set<Listener>()
  readonly mode = 'skeleton-local-bus'

  publish(event: CollabEvent) {
    this.listeners.forEach((listener) => listener(event))
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
