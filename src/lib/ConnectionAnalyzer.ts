/**
 * ConnectionAnalyzer - 连接分析器
 * 负责分析和检测 P2P 连接类型
 */

import type { TrysteroRoom, PeerConnectionType } from './types'
import { PeerConnectionType as ConnectionType } from './types'

export class ConnectionAnalyzer {
  constructor(private room: TrysteroRoom) {}

  /**
   * 获取节点连接类型（直接连接或中继连接）
   * @returns Promise<Record<peerId, PeerConnectionType>>
   */
  getPeerConnectionTypes = async (): Promise<Record<string, PeerConnectionType>> => {
    const peers = this.room.getPeers()
    const peerConnections: Record<string, PeerConnectionType> = {}

    await Promise.all(
      Object.entries(peers).map(async ([peerId, rtcPeerConnection]) => {
        const stats = await rtcPeerConnection.getStats()
        let selectedLocalCandidate: string | undefined

        // 查找成功的候选对
        // https://stackoverflow.com/a/61571171/470685
        for (const { type, state, localCandidateId } of stats.values()) {
          if (
            type === 'candidate-pair' &&
            state === 'succeeded' &&
            localCandidateId
          ) {
            selectedLocalCandidate = localCandidateId
            break
          }
        }

        // 检查是否为中继连接
        const isRelay =
          !!selectedLocalCandidate &&
          stats.get(selectedLocalCandidate)?.candidateType === 'relay'

        peerConnections[peerId] = isRelay
          ? ConnectionType.RELAY
          : ConnectionType.DIRECT
      })
    )

    return peerConnections
  }

  /**
   * 获取当前房间内的所有 peer IDs
   */
  getPeers = (): string[] => {
    const peers = this.room.getPeers()
    return Object.keys(peers)
  }
}

