/**
 * PeerRoom 类型定义
 * 包含所有枚举、接口和类型别名
 */

import type { joinRoom } from 'trystero/torrent'

/**
 * Trystero Room 返回类型
 */
export type TrysteroRoom = ReturnType<typeof joinRoom>

/**
 * 操作命名空间
 * - GROUP (g): 群组消息
 * - DIRECT_MESSAGE (dm): 一对一直接消息
 */
export enum ActionNamespace {
  GROUP = 'g',
  DIRECT_MESSAGE = 'dm',
}

/**
 * 节点连接类型
 * - DIRECT: 直接点对点连接
 * - RELAY: 通过 TURN 服务器中继
 */
export enum PeerConnectionType {
  DIRECT = 'DIRECT',
  RELAY = 'RELAY',
}

/**
 * 节点操作类型（每个限制 12 字符）
 */
export enum PeerAction {
  MESSAGE = 'MESSAGE',                    // 文本消息
  MEDIA_MESSAGE = 'MEDIA_MSG',           // 媒体内容分享
  PEER_METADATA = 'PEER_META',           // 用户信息交换
  AUDIO_CHANGE = 'AUDIO_CHG',            // 音频状态更新
  VIDEO_CHANGE = 'VIDEO_CHG',            // 视频状态更新
  SCREEN_SHARE = 'SCREEN_SHR',           // 屏幕共享会话
  FILE_OFFER = 'FILE_OFFER',             // 文件传输发起
  TYPING_STATUS_CHANGE = 'TYPING_STS',   // 输入状态指示
  MESSAGE_TRANSCRIPT = 'MSG_TRANS',      // 消息记录同步
  VERIFICATION_REQUEST = 'VERIFY_REQ',   // 验证请求（加密令牌）
  VERIFICATION_RESPONSE = 'VERIFY_RES',  // 验证响应（原始令牌）
  PEER_NAME_CHANGE = 'NAME_CHG',         // 用户名变更
  ROOM_JOIN = 'ROOM_JOIN',               // 加入房间
  ROOM_LEAVE = 'ROOM_LEAVE',             // 离开房间
}

/**
 * 对等方验证状态
 */
export enum PeerVerificationState {
  VERIFYING = 'VERIFYING',     // 验证进行中
  VERIFIED = 'VERIFIED',       // 验证成功
  UNVERIFIED = 'UNVERIFIED',   // 验证失败或超时
}


//================================
/**
 * 对等方事件钩子类型
 * 用于区分不同类型的连接事件处理程序
 */
export enum PeerHookType {
  NEW_PEER = 'NEW_PEER',           // 新对等方加入
  STREAM = 'STREAM',              // 流事件
  FILE_SHARE = 'FILE_SHARE',       // 文件传输事件
}

export enum PeerStreamType{
  AUDIO = 'AUDIO',                 // 音频流事件
  VIDEO = 'VIDEO',                 // 视频流事件
  SCREEN = 'SCREEN',               // 屏幕共享事件
}

/**
 * 流类型
 */
export enum StreamType {
  WEBCAM = 'WEBCAM',            // 摄像头
  MICROPHONE = 'MICROPHONE',    // 麦克风
  SCREEN_SHARE = 'SCREEN_SHARE', // 屏幕共享
  SYSTEM_AUDIO_IN_SCREEN_SHARE = 'SYSTEM_AUDIO_IN_SCREEN_SHARE', // 屏幕共享中的系统音频
}

export const StreamTypeMap: Partial<Record<StreamType, StreamType[]>> = {
  [StreamType.SCREEN_SHARE]: [
    StreamType.SCREEN_SHARE, 
    StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE
  ],
}

export const HookStreamMap: Partial<Record<PeerStreamType, StreamType[]>> = {
  [PeerStreamType.AUDIO]: [StreamType.MICROPHONE],
  [PeerStreamType.VIDEO]: [StreamType.MICROPHONE,StreamType.WEBCAM],
  [PeerStreamType.SCREEN]: [StreamType.MICROPHONE,StreamType.SCREEN_SHARE],
}

//================================

//需要控制声音的2种类型
export enum AudioChannelName{
  MICROPHONE = 'MICROPHONE',    // 麦克风
  SYSTEM_AUDIO_IN_SCREEN_SHARE = 'SYSTEM_AUDIO_IN_SCREEN_SHARE', // 屏幕共享中的系统音频
}

export const StreamAudioMap: Partial<Record<StreamType, AudioChannelName[]>> = {
  [StreamType.MICROPHONE]: [AudioChannelName.MICROPHONE],
  [StreamType.SCREEN_SHARE]: [AudioChannelName.MICROPHONE, AudioChannelName.SYSTEM_AUDIO_IN_SCREEN_SHARE],
}

//================================

/**
 * 房间配置
 */
export interface RoomConfig {
  appId?: string
  password?: string
  rtcConfig?: RTCConfiguration
  verificationConfig?: {
    timeout?: number
    autoVerify?: boolean
  }
}

/**
 * 消息接口
 */
export interface Message {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
  encrypted?: boolean           // 是否加密
  encryptedAESKey?: string     // Base64 编码的加密 AES 密钥
  iv?: string                  // Base64 编码的初始化向量
  [key: string]: string | number | boolean | undefined  // 索引签名，满足 DataPayload 要求
}

/**
 * 用户元数据接口
 */
export interface UserMetadata {
  userId: string
  username: string
  publicKey: string
  [key: string]: string  // 索引签名，满足 DataPayload 要求
}

/**
 * 媒体消息接口
 */
export interface MediaMessage {
  id: string
  userId: string
  username: string
  magnetURI: string
  timestamp: number
  [key: string]: string | number
}

/**
 * 输入状态接口
 */
export interface TypingStatus {
  isTyping: boolean
  [key: string]: boolean
}

/**
 * 音频状态接口
 */
export interface AudioState {
  isEnabled: boolean
  channelName?: string
  [key: string]: string | boolean | undefined
}

/**
 * 视频状态接口
 */
export interface VideoState {
  isEnabled: boolean
  [key: string]: boolean
}

/**
 * 屏幕共享状态接口
 */
export interface ScreenShareState {
  isSharing: boolean
  [key: string]: boolean
}

/**
 * 文件传输接口
 */
export interface FileOffer {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  magnetURI: string
  isInline?: boolean
  encryptedAESKey?: string  // Base64 编码的加密 AES 密钥
  iv?: string               // Base64 编码的初始化向量
  [key: string]: string | number | boolean | undefined
}

/**
 * 文件元数据接口
 */
export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  magnetURI: string
  isInline: boolean
  timestamp: number
  aesKey?: CryptoKey        // AES 密钥（本地使用）
  iv?: Uint8Array           // 初始化向量（本地使用）
}

/**
 * 文件下载进度接口
 */
export interface FileDownloadProgress {
  fileId: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
}

/**
 * 消息记录接口
 */
export interface MessageTranscript {
  messages: string
  timestamp: number
  [key: string]: string | number
}

/**
 * 验证请求接口
 */
export interface VerificationRequest {
  requestId: string
  challenge: string
  [key: string]: string
}

/**
 * 验证响应接口
 */
export interface VerificationResponse {
  requestId: string
  response: string
  verified: string
  [key: string]: string
}

/**
 * 用户名变更接口
 */
export interface PeerNameChange {
  userId: string
  newName: string
  [key: string]: string
}

/**
 * 房间加入通知接口
 */
export interface RoomJoinNotification {
  userId: string
  username: string
  timestamp: number
  [key: string]: string | number
}

/**
 * 房间离开通知接口
 */
export interface RoomLeaveNotification {
  userId: string
  username: string
  timestamp: number
  [key: string]: string | number
}

/**
 * 动作处理器类型
 */
export type ActionSender<T> = (data: T, peerId?: string) => void
export type ActionReceiver<T> = (callback: (data: T, peerId: string) => void) => void
export type ActionProgress = (callback: (percent: number, peerId: string) => void) => void
export type ActionCleanup = () => void

/**
 * 对等方动作元组
 */
export type PeerActionTuple = [ActionSender<any>, ActionReceiver<any>, ActionProgress, ActionCleanup]

/**
 * 事件处理器类型
 */
export type PeerJoinHandler = (peerId: string) => void
export type PeerLeaveHandler = (peerId: string) => void
export type PeerStreamHandler = (stream: MediaStream, peerId: string, metadata?: any) => void

