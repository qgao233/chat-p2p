/**
 * PeerRoom - P2P 房间核心类
 * 负责协调各个管理器，提供统一的 API
 * 
 * 架构：
 * - EventManager: 事件处理
 * - ActionManager: 动作管理
 * - StreamManager: 流管理
 * - ConnectionManager: 连接分析
 */

import { joinRoom } from 'trystero/torrent'

import { rtcValidationManager } from './res/RtcValidationManager'

import { EventManager } from './res/EventManager'
import { ActionManager } from './res/ActionManager'
import { StreamManager } from './res/StreamManager'
import { ConnectionManager } from './res/ConnectionManager'
import { 
  PeerVerificationManager,
  type VerificationConfig,
  type PeerVerificationMetadata,
  PeerVerificationState
} from './res/PeerVerificationManager'

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

export class PeerRoom {
  private room: TrysteroRoom
  private actionManager: ActionManager
  private connectionManager: ConnectionManager
  private eventManager: EventManager
  private streamManager: StreamManager
  private verificationManager: PeerVerificationManager

  constructor(roomId: string, config: RoomConfig = {}) {
    const { appId = 'chat-p2p-mvp', password, rtcConfig } = config

    // 验证并清理 RTC 配置
    let validatedRtcConfig: RTCConfiguration | undefined

    if (rtcConfig) {
      if (!rtcValidationManager.isValidRTCConfiguration(rtcConfig)) {
        console.warn('提供的 RTC 配置无效，尝试清理...')
        validatedRtcConfig =
          rtcValidationManager.sanitizeRTCConfiguration(rtcConfig) || 
          rtcValidationManager.createDefaultRTCConfiguration()
      } else {
        validatedRtcConfig = rtcConfig
      }
    } else {
      // 如果没有提供配置，使用默认配置
      validatedRtcConfig = rtcValidationManager.createDefaultRTCConfiguration()
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
    this.connectionManager = new ConnectionManager(this.room)
    this.verificationManager = new PeerVerificationManager(this, config.verificationConfig)

    // 延迟初始化验证管理器（避免循环依赖）
    // 使用 setTimeout 确保所有管理器都已完全初始化
    setTimeout(() => {
      this.verificationManager.initialize()
    }, 0)

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
    return this.connectionManager.getPeerConnectionTypes()
  }

  /**
   * 获取当前房间内的所有 peer IDs
   */
  getPeers = (): string[] => {
    return this.connectionManager.getPeers()
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

  // ==================== 验证管理 API ====================

  /**
   * 设置本地私钥（用于验证）
   */
  setLocalPrivateKey = (privateKey: CryptoKey): void => {
    this.verificationManager.setLocalPrivateKey(privateKey)
  }

  /**
   * 启动对等方验证
   */
  initiateVerification = async (
    peerId: string,
    publicKey: CryptoKey,
    privateKey: CryptoKey
  ): Promise<void> => {
    return this.verificationManager.initiateVerification(peerId, publicKey, privateKey)
  }

  /**
   * 注册对等方公钥
   */
  registerPublicKey = (peerId: string, publicKey: CryptoKey): void => {
    this.verificationManager.registerPublicKey(peerId, publicKey)
  }

  /**
   * 获取对等方验证状态
   */
  getVerificationState = (peerId: string): PeerVerificationState => {
    return this.verificationManager.getVerificationState(peerId)
  }

  /**
   * 检查对等方是否已验证
   */
  isVerified = (peerId: string): boolean => {
    return this.verificationManager.isVerified(peerId)
  }

  /**
   * 获取对等方验证元数据
   */
  getVerificationMetadata = (peerId: string): PeerVerificationMetadata | undefined => {
    return this.verificationManager.getVerificationMetadata(peerId)
  }

  /**
   * 获取所有已验证的对等方
   */
  getVerifiedPeers = (): string[] => {
    return this.verificationManager.getVerifiedPeers()
  }

  /**
   * 移除对等方验证信息
   */
  removePeerVerification = (peerId: string): void => {
    this.verificationManager.removePeer(peerId)
  }


  /**
   * 离开房间并清理资源
   */
  leave = () => {
    // 清理所有管理器
    this.actionManager.cleanup()
    this.streamManager.cleanup()
    this.verificationManager.cleanup()
    this.eventManager.flush()

    // 离开房间
    this.room.leave()
  }
}
