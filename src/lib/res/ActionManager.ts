/**
 * ActionManager - 动作管理器
 * 负责创建和管理命名空间操作
 */

import type {
  TrysteroRoom,
  ActionNamespace,
  PeerActionTuple,
  Message,
  UserMetadata,
  TypingStatus,
  MediaMessage,
  AudioState,
  VideoState,
  ScreenShareState,
  FileOffer,
  MessageTranscript,
  VerificationRequest,
  VerificationResponse,
  PeerNameChange,
  RoomJoinNotification,
  RoomLeaveNotification
} from '../types'

import { PeerAction } from '../types'

export class ActionManager {
  private actions: Map<string, PeerActionTuple> = new Map()

  constructor(private room: TrysteroRoom) {}

  /**
   * 创建命名空间操作
   * @param action - 操作类型
   * @param namespace - 命名空间 (GROUP 或 DIRECT_MESSAGE)
   * @returns 包含发送方、接收方、进度跟踪和清理功能的操作处理器
   */
  makeAction = <T extends Record<string, any>>(
    action: PeerAction,
    namespace: ActionNamespace
  ): PeerActionTuple => {
    // 构建完整的操作名称: namespace.action (如 "g.MESSAGE" 或 "dm.MESSAGE")
    const actionName = `${namespace}.${action}`

    // 如果已存在，返回缓存的操作
    if (this.actions.has(actionName)) {
      return this.actions.get(actionName)!
    }

    // 创建新的操作
    const [send, receive, progress] = this.room.makeAction<T>(actionName)

    // 创建清理函数
    const cleanup = () => {
      this.actions.delete(actionName)
    }

    const peerActionTuple: PeerActionTuple = [send, receive, progress, cleanup]
    this.actions.set(actionName, peerActionTuple)

    return peerActionTuple
  }

  /**
   * 创建消息发送/接收通道（简化接口）
   */
  createMessageAction = (namespace: ActionNamespace) => {
    const [sendMessage, onMessage] = this.makeAction<Message>(
      PeerAction.MESSAGE,
      namespace
    )
    return { sendMessage, onMessage }
  }

  /**
   * 创建用户元数据发送/接收通道（简化接口）
   */
  createMetadataAction = (namespace: ActionNamespace) => {
    const [sendMetadata, onMetadata] = this.makeAction<UserMetadata>(
      PeerAction.PEER_METADATA,
      namespace
    )
    return { sendMetadata, onMetadata }
  }

  /**
   * 创建输入状态通道
   */
  createTypingAction = (namespace: ActionNamespace) => {
    const [sendTyping, onTyping] = this.makeAction<TypingStatus>(
      PeerAction.TYPING_STATUS_CHANGE,
      namespace
    )
    return { sendTyping, onTyping }
  }

  /**
   * 创建媒体消息通道
   */
  createMediaAction = (namespace: ActionNamespace) => {
    const [sendMedia, onMedia] = this.makeAction<MediaMessage>(
      PeerAction.MEDIA_MESSAGE,
      namespace
    )
    return { sendMedia, onMedia }
  }

  /**
   * 创建音频状态通道
   */
  createAudioChangeAction = (namespace: ActionNamespace) => {
    const [sendAudioChange, onAudioChange] = this.makeAction<AudioState>(
      PeerAction.AUDIO_CHANGE,
      namespace
    )
    return { sendAudioChange, onAudioChange }
  }

  /**
   * 创建视频状态通道
   */
  createVideoChangeAction = (namespace: ActionNamespace) => {
    const [sendVideoChange, onVideoChange] = this.makeAction<VideoState>(
      PeerAction.VIDEO_CHANGE,
      namespace
    )
    return { sendVideoChange, onVideoChange }
  }

  /**
   * 创建屏幕共享通道
   */
  createScreenShareAction = (namespace: ActionNamespace) => {
    const [sendScreenShare, onScreenShare] = this.makeAction<ScreenShareState>(
      PeerAction.SCREEN_SHARE,
      namespace
    )
    return { sendScreenShare, onScreenShare }
  }

  /**
   * 创建文件传输通道
   */
  createFileOfferAction = (namespace: ActionNamespace) => {
    const [sendFileOffer, onFileOffer] = this.makeAction<FileOffer>(
      PeerAction.FILE_OFFER,
      namespace
    )
    return { sendFileOffer, onFileOffer }
  }

  /**
   * 创建消息记录同步通道
   */
  createMessageTranscriptAction = (namespace: ActionNamespace) => {
    const [sendTranscript, onTranscript] = this.makeAction<MessageTranscript>(
      PeerAction.MESSAGE_TRANSCRIPT,
      namespace
    )
    return { sendTranscript, onTranscript }
  }

  /**
   * 创建验证请求通道
   */
  createVerificationRequestAction = (namespace: ActionNamespace) => {
    const [sendVerifyRequest, onVerifyRequest] = this.makeAction<VerificationRequest>(
      PeerAction.VERIFICATION_REQUEST,
      namespace
    )
    return { sendVerifyRequest, onVerifyRequest }
  }

  /**
   * 创建验证响应通道
   */
  createVerificationResponseAction = (namespace: ActionNamespace) => {
    const [sendVerifyResponse, onVerifyResponse] = this.makeAction<VerificationResponse>(
      PeerAction.VERIFICATION_RESPONSE,
      namespace
    )
    return { sendVerifyResponse, onVerifyResponse }
  }

  /**
   * 创建用户名变更通道
   */
  createPeerNameChangeAction = (namespace: ActionNamespace) => {
    const [sendNameChange, onNameChange] = this.makeAction<PeerNameChange>(
      PeerAction.PEER_NAME_CHANGE,
      namespace
    )
    return { sendNameChange, onNameChange }
  }

  /**
   * 创建房间加入通知通道
   */
  createRoomJoinAction = (namespace: ActionNamespace) => {
    const [sendRoomJoin, onRoomJoin] = this.makeAction<RoomJoinNotification>(
      PeerAction.ROOM_JOIN,
      namespace
    )
    return { sendRoomJoin, onRoomJoin }
  }

  /**
   * 创建房间离开通知通道
   */
  createRoomLeaveAction = (namespace: ActionNamespace) => {
    const [sendRoomLeave, onRoomLeave] = this.makeAction<RoomLeaveNotification>(
      PeerAction.ROOM_LEAVE,
      namespace
    )
    return { sendRoomLeave, onRoomLeave }
  }

  /**
   * 清理所有操作
   */
  cleanup = () => {
    this.actions.forEach(([, , , cleanup]) => cleanup())
    this.actions.clear()
  }
}

