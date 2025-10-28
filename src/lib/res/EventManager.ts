/**
 * EventManager - 事件管理器
 * 负责管理不同类型的事件处理程序
 */

import type {
  PeerHookType,
  PeerJoinHandler,
  PeerLeaveHandler,
  PeerStreamHandler
} from '../types'

export class EventManager {
  private peerJoinHandlers: Map<PeerHookType, Set<PeerJoinHandler>> = new Map()
  private peerLeaveHandlers: Map<PeerHookType, Set<PeerLeaveHandler>> = new Map()
  private peerStreamHandlers: Map<PeerHookType, Set<PeerStreamHandler>> = new Map()

  /**
   * 注册用户加入事件监听器
   */
  onPeerJoin = (hookType: PeerHookType, handler: PeerJoinHandler) => {
    if (!this.peerJoinHandlers.has(hookType)) {
      this.peerJoinHandlers.set(hookType, new Set())
    }
    this.peerJoinHandlers.get(hookType)!.add(handler)
  }

  /**
   * 注册用户离开事件监听器
   */
  onPeerLeave = (hookType: PeerHookType, handler: PeerLeaveHandler) => {
    if (!this.peerLeaveHandlers.has(hookType)) {
      this.peerLeaveHandlers.set(hookType, new Set())
    }
    this.peerLeaveHandlers.get(hookType)!.add(handler)
  }

  /**
   * 注册流事件监听器
   */
  onPeerStream = (hookType: PeerHookType, handler: PeerStreamHandler) => {
    if (!this.peerStreamHandlers.has(hookType)) {
      this.peerStreamHandlers.set(hookType, new Set())
    }
    this.peerStreamHandlers.get(hookType)!.add(handler)
  }

  /**
   * 移除特定类型的加入事件监听器
   */
  offPeerJoin = (hookType: PeerHookType) => {
    this.peerJoinHandlers.delete(hookType)
  }

  /**
   * 移除特定类型的离开事件监听器
   */
  offPeerLeave = (hookType: PeerHookType) => {
    this.peerLeaveHandlers.delete(hookType)
  }

  /**
   * 移除特定类型的流事件监听器
   */
  offPeerStream = (hookType: PeerHookType) => {
    this.peerStreamHandlers.delete(hookType)
  }

  /**
   * 触发所有加入事件处理程序
   */
  triggerPeerJoin = (peerId: string) => {
    this.peerJoinHandlers.forEach((handlers) => {
      handlers.forEach(handler => handler(peerId))
    })
  }

  /**
   * 触发所有离开事件处理程序
   */
  triggerPeerLeave = (peerId: string) => {
    this.peerLeaveHandlers.forEach((handlers) => {
      handlers.forEach(handler => handler(peerId))
    })
  }

  /**
   * 触发所有流事件处理程序
   */
  triggerPeerStream = (stream: MediaStream, peerId: string, metadata?: any) => {
    this.peerStreamHandlers.forEach((handlers) => {
      handlers.forEach(handler => handler(stream, peerId, metadata))
    })
  }

  /**
   * 清空所有事件监听器
   */
  flush = () => {
    this.peerJoinHandlers.clear()
    this.peerLeaveHandlers.clear()
    this.peerStreamHandlers.clear()
  }

  /**
   * 清空特定类型的所有事件监听器
   */
  flushHookType = (hookType: PeerHookType) => {
    this.peerJoinHandlers.delete(hookType)
    this.peerLeaveHandlers.delete(hookType)
    this.peerStreamHandlers.delete(hookType)
  }
}

