import type { Actions, GraphEdge, GraphNode, HandleElement, ViewportTransform, XYPosition } from '../types'
import { Position } from '../types'
import { getNodeDimensions, rectToBox } from '.'

export function getHandlePosition(
  node: GraphNode,
  handle: HandleElement | null,
  fallbackPosition: Position = Position.Left,
  center = false,
): XYPosition {
  const x = (handle?.x ?? 0) + node.computedPosition.x
  const y = (handle?.y ?? 0) + node.computedPosition.y
  const { width, height } = handle ?? getNodeDimensions(node)

  if (center) {
    return { x: x + width / 2, y: y + height / 2 }
  }

  const position = handle?.position ?? fallbackPosition

  switch (position) {
    case Position.Top:
      return { x: x + width / 2, y }
    case Position.Right:
      return { x: x + width, y: y + height / 2 }
    case Position.Bottom:
      return { x: x + width / 2, y: y + height }
    case Position.Left:
      return { x, y: y + height / 2 }
  }
}

export function getEdgeHandle(bounds: HandleElement[] | undefined, handleId?: string | null): HandleElement | null {
  if (!bounds) {
    return null
  }

  // if no handleId is given, we use the first handle, otherwise we check for the id
  return (!handleId ? bounds[0] : bounds.find((d) => d.id === handleId)) || null
}

interface IsEdgeVisibleParams {
  sourcePos: XYPosition
  targetPos: XYPosition
  sourceWidth: number
  sourceHeight: number
  targetWidth: number
  targetHeight: number
  width: number
  height: number
  viewport: ViewportTransform
}

export function isEdgeVisible({
  sourcePos,
  targetPos,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  width,
  height,
  viewport,
}: IsEdgeVisibleParams): boolean {
  const edgeBox = {
    x: Math.min(sourcePos.x, targetPos.x),
    y: Math.min(sourcePos.y, targetPos.y),
    x2: Math.max(sourcePos.x + sourceWidth, targetPos.x + targetWidth),
    y2: Math.max(sourcePos.y + sourceHeight, targetPos.y + targetHeight),
  }

  if (edgeBox.x === edgeBox.x2) {
    edgeBox.x2 += 1
  }

  if (edgeBox.y === edgeBox.y2) {
    edgeBox.y2 += 1
  }

  const viewBox = rectToBox({
    x: (0 - viewport.x) / viewport.zoom,
    y: (0 - viewport.y) / viewport.zoom,
    width: width / viewport.zoom,
    height: height / viewport.zoom,
  })

  const xOverlap = Math.max(0, Math.min(viewBox.x2, edgeBox.x2) - Math.max(viewBox.x, edgeBox.x))
  const yOverlap = Math.max(0, Math.min(viewBox.y2, edgeBox.y2) - Math.max(viewBox.y, edgeBox.y))
  const overlappingArea = Math.ceil(xOverlap * yOverlap)

  return overlappingArea > 0
}

export function getEdgeZIndex(edge: GraphEdge, findNode: Actions['findNode'], elevateEdgesOnSelect = false) {
  const hasZIndex = typeof edge.zIndex === 'number'
  const z = hasZIndex ? edge.zIndex! : 0

  const source = findNode(edge.source)
  const target = findNode(edge.target)

  if (!source || !target) {
    return z
  }

  // 获取 source 和 target 节点中内部存储的 z-index （不存在则默认为 0）
  const sourceZ = source.computedPosition?.z || 0
  const targetZ = target.computedPosition?.z || 0
  // 取两个节点层级中的较大值
  const maxInternalZ = Math.max(sourceZ, targetZ)

  // 如果不需要在选中时提升层级，则直接返回基础 zIndex 与各节点层级之间的较大值
  if (!elevateEdgesOnSelect) {
    return Math.max(maxInternalZ, z)
  }

  // 判断连线本身或其中一个端点的节点是否被选中
  const isLinkOrNodeSelected = edge.selected || target.selected || source.selected

  // 计算提升的层级值：以各节点内部 z-index 为基础，至少确保为 1000
  const elevatedZ = Math.max(source.computedPosition?.z || 0, target.computedPosition?.z || 0, 1000)

  // 如果选中，则 zIndex 加上提升值，否则不加。
  // 最终结果为基础提升后的 zIndex 与 maxInternalZ 之间取较大者，保证不会低于节点的层级
  return Math.max(z + (isLinkOrNodeSelected ? elevatedZ : 0), maxInternalZ)
}
