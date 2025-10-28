/**
 * StreamManager - 流管理器
 * 负责管理媒体流的添加、移除和队列处理
 */

import type { TrysteroRoom, PeerStreamType } from './types'

// 流队列延迟（毫秒）
const STREAM_QUEUE_ADD_DELAY = 1000

// 简单的 sleep 函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export class StreamManager {
  private streamQueue: (() => Promise<any>)[] = []
  private isProcessingPendingStreams = false

  constructor(private room: TrysteroRoom) {}

  /**
   * 处理待处理的流队列
   */
  private processPendingStreams = async () => {
    if (this.isProcessingPendingStreams) return

    this.isProcessingPendingStreams = true

    while (this.streamQueue.length > 0) {
      const task = this.streamQueue.shift()
      if (task) {
        await task()
      }
    }

    this.isProcessingPendingStreams = false
  }

  /**
   * 添加媒体流到房间
   * 使用队列化方法防止流建立过程中的竞争条件
   * @param stream - MediaStream 对象
   * @param targetPeers - 目标 peer IDs（可选，默认发送给所有 peers）
   * @param metadata - 流元数据，包含流类型
   */
  addStream = (
    stream: MediaStream,
    targetPeers?: string[],
    metadata?: { type: PeerStreamType }
  ) => {
    // 将流加入队列并延迟处理以防止元数据竞争条件
    // 流和元数据需要按顺序发送，避免接收端混淆
    this.streamQueue.push(
      () => Promise.all(this.room.addStream(stream, targetPeers, metadata)),
      () => sleep(STREAM_QUEUE_ADD_DELAY)
    )

    this.processPendingStreams()
  }

  /**
   * 从房间移除媒体流
   * @param stream - 要移除的 MediaStream
   * @param targetPeers - 目标 peer IDs（可选）
   */
  removeStream = (stream: MediaStream, targetPeers?: string[]) => {
    return this.room.removeStream(stream, targetPeers)
  }

  /**
   * 清空流队列
   */
  cleanup = () => {
    this.streamQueue = []
    this.isProcessingPendingStreams = false
  }
}

