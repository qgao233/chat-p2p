/**
 * PeerRoom - P2P 房间核心类
 * 负责协调各个管理器，提供统一的 API
 * 
 * 架构：
 * - EventManager: 事件处理
 * - ActionManager: 动作管理
 * - StreamManager: 流管理
 * - ConnectionAnalyzer: 连接分析
 */

import { joinRoom } from 'trystero/torrent'
import {
  isValidRTCConfiguration,
  sanitizeRTCConfiguration,
  createDefaultRTCConfiguration
} from './rtcValidation'

import { EventManager } from './EventManager'
import { ActionManager } from './ActionManager'
import { StreamManager } from './StreamManager'
import { ConnectionAnalyzer } from './ConnectionAnalyzer'

import type {
  TrysteroRoom,
  RoomConfig,
  PeerActionTuple,
  PeerJoinHandler,
  PeerLeaveHandler,
  PeerStreamHandler,
  PeerConnectionType,
  PeerStreamType
} from './types'

import {
  ActionNamespace,
  PeerAction,
  PeerHookType
} from './types'

// 重新导出类型，保持向后兼容
export type {
  RoomConfig,
  Message,
  UserMetadata,
  MediaMessage,
  TypingStatus,
  AudioState,
  VideoState,
  PeerConnectionType,
  PeerJoinHandler,
  PeerLeaveHandler,
  PeerStreamHandler
} from './types'

export {
  ActionNamespace,
  PeerAction,
  PeerStreamType,
  PeerHookType,
  PeerConnectionType as PeerConnectionTypeEnum
} from './types'

export class PeerRoom {
  private room: TrysteroRoom
  private eventManager: EventManager
  private actionManager: ActionManager
  private streamManager: StreamManager
  private connectionAnalyzer: ConnectionAnalyzer

  constructor(roomId: string, config: RoomConfig = {}) {
    const { appId = 'chat-p2p-mvp', password, rtcConfig } = config

    // 验证并清理 RTC 配置
    let validatedRtcConfig: RTCConfiguration | undefined

    if (rtcConfig) {
      if (!isValidRTCConfiguration(rtcConfig)) {
        console.warn('提供的 RTC 配置无效，尝试清理...')
        validatedRtcConfig =
          sanitizeRTCConfiguration(rtcConfig) || createDefaultRTCConfiguration()
      } else {
        validatedRtcConfig = rtcConfig
      }
    } else {
      // 如果没有提供配置，使用默认配置
      validatedRtcConfig = createDefaultRTCConfiguration()
    }

    // 使用 Trystero 创建 P2P 房间
    this.room = joinRoom(
      {
        appId,
        password: password || roomId,
        rtcConfig: validatedRtcConfig,
      },
      roomId
    )

    // 初始化管理器
    this.eventManager = new EventManager()
    this.actionManager = new ActionManager(this.room)
    this.streamManager = new StreamManager(this.room)
    this.connectionAnalyzer = new ConnectionAnalyzer(this.room)

    // 连接 Trystero 事件到事件管理器
    this.room.onPeerJoin((peerId) => {
      this.eventManager.triggerPeerJoin(peerId)
    })

    this.room.onPeerLeave((peerId) => {
      this.eventManager.triggerPeerLeave(peerId)
    })

    this.room.onPeerStream((stream, peerId, metadata) => {
      this.eventManager.triggerPeerStream(stream, peerId, metadata)
    })
  }

  // ==================== 事件管理 API ====================

  /**
   * 注册用户加入事件监听器
   */
  onPeerJoin = (hookType: PeerHookType, handler: PeerJoinHandler) => {
    this.eventManager.onPeerJoin(hookType, handler)
  }

  /**
   * 注册用户离开事件监听器
   */
  onPeerLeave = (hookType: PeerHookType, handler: PeerLeaveHandler) => {
    this.eventManager.onPeerLeave(hookType, handler)
  }

  /**
   * 注册流事件监听器
   */
  onPeerStream = (hookType: PeerHookType, handler: PeerStreamHandler) => {
    this.eventManager.onPeerStream(hookType, handler)
  }

  /**
   * 移除特定类型的加入事件监听器
   */
  offPeerJoin = (hookType: PeerHookType) => {
    this.eventManager.offPeerJoin(hookType)
  }

  /**
   * 移除特定类型的离开事件监听器
   */
  offPeerLeave = (hookType: PeerHookType) => {
    this.eventManager.offPeerLeave(hookType)
  }

  /**
   * 移除特定类型的流事件监听器
   */
  offPeerStream = (hookType: PeerHookType) => {
    this.eventManager.offPeerStream(hookType)
  }

  // ==================== 动作管理 API ====================

  /**
   * 创建命名空间操作
   */
  makeAction = <T extends Record<string, any>>(
    action: PeerAction,
    namespace: ActionNamespace
  ): PeerActionTuple => {
    return this.actionManager.makeAction<T>(action, namespace)
  }

  /**
   * 创建消息发送/接收通道（简化接口）
   */
  createMessageAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createMessageAction(namespace)
  }

  /**
   * 创建用户元数据发送/接收通道（简化接口）
   */
  createMetadataAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createMetadataAction(namespace)
  }

  /**
   * 创建输入状态通道
   */
  createTypingAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createTypingAction(namespace)
  }

  /**
   * 创建媒体消息通道
   */
  createMediaAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createMediaAction(namespace)
  }

  /**
   * 创建音频状态通道
   */
  createAudioChangeAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createAudioChangeAction(namespace)
  }

  /**
   * 创建视频状态通道
   */
  createVideoChangeAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createVideoChangeAction(namespace)
  }

  /**
   * 创建屏幕共享通道
   */
  createScreenShareAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createScreenShareAction(namespace)
  }

  /**
   * 创建文件传输通道
   */
  createFileOfferAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createFileOfferAction(namespace)
  }

  /**
   * 创建消息记录同步通道
   */
  createMessageTranscriptAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createMessageTranscriptAction(namespace)
  }

  /**
   * 创建验证请求通道
   */
  createVerificationRequestAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createVerificationRequestAction(namespace)
  }

  /**
   * 创建验证响应通道
   */
  createVerificationResponseAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createVerificationResponseAction(namespace)
  }

  /**
   * 创建用户名变更通道
   */
  createPeerNameChangeAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createPeerNameChangeAction(namespace)
  }

  /**
   * 创建房间加入通知通道
   */
  createRoomJoinAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createRoomJoinAction(namespace)
  }

  /**
   * 创建房间离开通知通道
   */
  createRoomLeaveAction = (namespace: ActionNamespace = ActionNamespace.GROUP) => {
    return this.actionManager.createRoomLeaveAction(namespace)
  }

  // ==================== 流管理 API ====================

  /**
   * 添加媒体流到房间
   */
  addStream = (
    stream: MediaStream,
    targetPeers?: string[],
    metadata?: { type: PeerStreamType }
  ) => {
    this.streamManager.addStream(stream, targetPeers, metadata)
  }

  /**
   * 从房间移除媒体流
   */
  removeStream = (stream: MediaStream, targetPeers?: string[]) => {
    return this.streamManager.removeStream(stream, targetPeers)
  }

  // ==================== 连接分析 API ====================

  /**
   * 获取节点连接类型（直接连接或中继连接）
   */
  getPeerConnectionTypes = async (): Promise<Record<string, PeerConnectionType>> => {
    return this.connectionAnalyzer.getPeerConnectionTypes()
  }

  /**
   * 获取当前房间内的所有 peer IDs
   */
  getPeers = (): string[] => {
    return this.connectionAnalyzer.getPeers()
  }

  // ==================== 清理 API ====================

  /**
   * 清空所有事件监听器
   */
  flush = () => {
    this.eventManager.flush()
  }

  /**
   * 清空特定类型的所有事件监听器
   */
  flushHookType = (hookType: PeerHookType) => {
    this.eventManager.flushHookType(hookType)
  }

  /**
   * 离开房间并清理资源
   */
  leave = () => {
    // 清理所有管理器
    this.actionManager.cleanup()
    this.streamManager.cleanup()
    this.eventManager.flush()

    // 离开房间
    this.room.leave()
  }
}
