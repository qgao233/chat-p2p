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
  StreamType,
  PeerHookType,
  PeerConnectionType as PeerConnectionTypeEnum
} from './types'

// RTC 验证工具
export {
  isValidRTCConfiguration,
  sanitizeRTCConfiguration,
  createDefaultRTCConfiguration,
  mergeRTCConfiguration,
  validateRTCConfiguration,
  RTCValidationError
} from './rtcValidation'

export type { RTCValidationResult } from './rtcValidation'

// 管理器（高级用户可以单独使用）
export { EventManager } from './EventManager'
export { ActionManager } from './ActionManager'
export { StreamManager } from './StreamManager'
export { ConnectionAnalyzer } from './ConnectionAnalyzer'

