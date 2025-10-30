/**
 * PeerRoom 库入口文件
 * 统一导出所有公共 API
 */

// 主类
export { PeerRoom } from './PeerRoom'

// 类型和枚举
export type {
  RoomConfig,
  Message,
  UserMetadata,
  MediaMessage,
  TypingStatus,
  AudioState,
  VideoState,
  ScreenShareState,
  FileOffer,
  MessageTranscript,
  VerificationRequest,
  VerificationResponse,
  PeerNameChange,
  RoomJoinNotification,
  RoomLeaveNotification,
  PeerConnectionType,
  PeerJoinHandler,
  PeerLeaveHandler,
  PeerStreamHandler,
  TrysteroRoom,
  ActionSender,
  ActionReceiver,
  ActionProgress,
  ActionCleanup,
  PeerActionTuple
} from './types'

export {
  ActionNamespace,
  PeerAction,

  PeerHookType,
  PeerStreamType,
  StreamType,
  StreamTypeMap,
  HookStreamMap,

  AudioChannelName,
  StreamAudioMap,

  PeerConnectionType as PeerConnectionTypeEnum,
  PeerVerificationState
} from './types'

// RTC 验证工具
export {
  rtcValidationManager,
  RTCValidationError
} from './res/RtcValidationManager'

export type { RTCValidationResult } from './res/RtcValidationManager'

// 管理器（高级用户可以单独使用）
export { EventManager } from './res/EventManager'
export { ActionManager } from './res/ActionManager'
export { StreamManager } from './res/StreamManager'
export { ConnectionManager } from './res/ConnectionManager'
export { 
  PeerVerificationManager,
  PeerVerificationState as PeerVerificationStateEnum
} from './res/PeerVerificationManager'

export type {
  PeerVerificationMetadata,
  VerificationConfig,
  VerificationTokenEncrypted,
  VerificationTokenRaw
} from './res/PeerVerificationManager'

// 工具函数
export { getUserInitials, generateDefaultUsername } from './utils'

