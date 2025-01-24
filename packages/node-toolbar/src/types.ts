import type { Position } from '@jokerc/vue-flow-core'

export interface NodeToolbarProps {
  flowId?: string
  nodeId?: string | string[]
  isVisible?: boolean
  position?: Position
  offset?: number
  align?: 'center' | 'start' | 'end'
}

export type Align = 'center' | 'start' | 'end'
