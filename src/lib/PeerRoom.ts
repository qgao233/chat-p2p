/**
 * PeerRoom - P2P 房间核心类
 * 负责管理 WebRTC 连接、消息传输、用户加入/离开等
 */

import { joinRoom } from 'trystero/torrent'

// Trystero Room 返回类型
type TrysteroRoom = ReturnType<typeof joinRoom>

export interface RoomConfig {
  appId?: string
  password?: string
  rtcConfig?: RTCConfiguration
}

export interface Message {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
  [key: string]: string | number  // 索引签名，满足 DataPayload 要求
}

export interface UserMetadata {
  userId: string
  username: string
  publicKey: string
  [key: string]: string  // 索引签名，满足 DataPayload 要求
}

type PeerJoinHandler = (peerId: string) => void
type PeerLeaveHandler = (peerId: string) => void
type MessageHandler = (message: Message, peerId: string) => void
type MetadataHandler = (metadata: UserMetadata, peerId: string) => void

export class PeerRoom {
  private room: TrysteroRoom
  private peerJoinHandlers: Set<PeerJoinHandler> = new Set()
  private peerLeaveHandlers: Set<PeerLeaveHandler> = new Set()
  
  constructor(roomId: string, config: RoomConfig = {}) {
    const { appId = 'chat-p2p-mvp', password, rtcConfig } = config
    
    // 使用 Trystero 创建 P2P 房间
    this.room = joinRoom(
      {
        appId,
        password: password || roomId,
        rtcConfig,
      },
      roomId
    )

    // 监听用户加入事件
    this.room.onPeerJoin((peerId) => {
      this.peerJoinHandlers.forEach(handler => handler(peerId))
    })

    // 监听用户离开事件
    this.room.onPeerLeave((peerId) => {
      this.peerLeaveHandlers.forEach(handler => handler(peerId))
    })
  }

  /**
   * 注册用户加入事件监听器
   */
  onPeerJoin = (handler: PeerJoinHandler) => {
    this.peerJoinHandlers.add(handler)
  }

  /**
   * 注册用户离开事件监听器
   */
  onPeerLeave = (handler: PeerLeaveHandler) => {
    this.peerLeaveHandlers.add(handler)
  }

  /**
   * 创建消息发送/接收通道
   */
  createMessageAction = () => {
    const [sendMessage, onMessage] = this.room.makeAction<Message>('message')
    return { sendMessage, onMessage }
  }

  /**
   * 创建用户元数据发送/接收通道
   */
  createMetadataAction = () => {
    const [sendMetadata, onMetadata] = this.room.makeAction<UserMetadata>('metadata')
    return { sendMetadata, onMetadata }
  }

  /**
   * 获取当前房间内的所有 peer IDs
   */
  getPeers = (): string[] => {
    const peers = this.room.getPeers()
    return Object.keys(peers)
  }

  /**
   * 离开房间并清理资源
   */
  leave = () => {
    this.room.leave()
    this.peerJoinHandlers.clear()
    this.peerLeaveHandlers.clear()
  }
}

