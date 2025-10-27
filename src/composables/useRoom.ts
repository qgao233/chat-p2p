/**
 * Vue3 Composable - useRoom
 * 管理 P2P 聊天房间的所有逻辑
 */

import { ref, onUnmounted } from 'vue'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'
import { PeerRoom } from '../lib/PeerRoom'
import type { Message, UserMetadata } from '../lib/PeerRoom'
import { encryption } from '../services/encryption'
import { rtcConfig } from '../config/rtc'

interface Peer {
  peerId: string
  userId: string
  username: string
  publicKey: CryptoKey | null
}

export const useRoom = (roomId: string) => {
  // 状态管理
  const messages = ref<Message[]>([])
  const peers = ref<Peer[]>([])
  const currentUserId = ref<string>('')
  const currentUsername = ref<string>('')
  const isConnected = ref(false)
  const publicKey = ref<CryptoKey | null>(null)
  const privateKey = ref<CryptoKey | null>(null)

  let peerRoom: PeerRoom | null = null
  let sendMessage: ((msg: Message, peerId?: string) => void) | null = null
  let sendMetadata: ((data: UserMetadata, peerId?: string) => void) | null = null

  /**
   * 初始化用户密钥对
   */
  const initializeKeys = async () => {
    try {
      // 尝试从本地存储加载密钥
      const storedPrivateKey = await localforage.getItem<string>('privateKey')
      const storedPublicKey = await localforage.getItem<string>('publicKey')
      const storedUserId = await localforage.getItem<string>('userId')

      if (storedPrivateKey && storedPublicKey && storedUserId) {
        // 使用已存在的密钥
        privateKey.value = await encryption.parseCryptoKey(storedPrivateKey, 'private')
        publicKey.value = await encryption.parseCryptoKey(storedPublicKey, 'public')
        currentUserId.value = storedUserId
      } else {
        // 生成新的密钥对
        const keyPair = await encryption.generateKeyPair()
        privateKey.value = keyPair.privateKey
        publicKey.value = keyPair.publicKey
        currentUserId.value = uuid()

        // 保存到本地存储
        const privateKeyString = await encryption.stringifyCryptoKey(keyPair.privateKey)
        const publicKeyString = await encryption.stringifyCryptoKey(keyPair.publicKey)
        
        await localforage.setItem('privateKey', privateKeyString)
        await localforage.setItem('publicKey', publicKeyString)
        await localforage.setItem('userId', currentUserId.value)
      }

      // 加载或生成用户名
      const storedUsername = await localforage.getItem<string>('username')
      currentUsername.value = storedUsername || `User_${currentUserId.value.slice(0, 4)}`
      
      if (!storedUsername) {
        await localforage.setItem('username', currentUsername.value)
      }
    } catch (error) {
      console.error('密钥初始化失败:', error)
    }
  }

  /**
   * 加入房间
   */
  const joinRoom = async () => {
    await initializeKeys()

    // 创建 P2P 房间
    peerRoom = new PeerRoom(roomId, { rtcConfig })

    // 设置消息通道
    const messageAction = peerRoom.createMessageAction()
    sendMessage = messageAction.sendMessage
    messageAction.onMessage((message, peerId) => {
      messages.value.push(message)
    })

    // 设置元数据通道
    const metadataAction = peerRoom.createMetadataAction()
    sendMetadata = metadataAction.sendMetadata
    metadataAction.onMetadata(async (metadata, peerId) => {
      try {
        const peerPublicKey = await encryption.parseCryptoKey(metadata.publicKey, 'public')
        
        // 添加或更新 peer 信息
        const existingPeerIndex = peers.value.findIndex(p => p.peerId === peerId)
        const peerData: Peer = {
          peerId,
          userId: metadata.userId,
          username: metadata.username,
          publicKey: peerPublicKey,
        }

        if (existingPeerIndex >= 0) {
          peers.value[existingPeerIndex] = peerData
        } else {
          peers.value.push(peerData)
        }
      } catch (error) {
        console.error('处理元数据失败:', error)
      }
    })

    // 监听用户加入
    peerRoom.onPeerJoin(async (peerId) => {
      console.log('用户加入:', peerId)
      
      // 发送自己的元数据给新加入的用户
      if (sendMetadata && publicKey.value) {
        const publicKeyString = await encryption.stringifyCryptoKey(publicKey.value)
        sendMetadata({
          userId: currentUserId.value,
          username: currentUsername.value,
          publicKey: publicKeyString,
        }, peerId)
      }
    })

    // 监听用户离开
    peerRoom.onPeerLeave((peerId) => {
      console.log('用户离开:', peerId)
      peers.value = peers.value.filter(p => p.peerId !== peerId)
    })

    isConnected.value = true
  }

  /**
   * 发送消息
   */
  const sendChatMessage = (text: string) => {
    if (!sendMessage || !text.trim()) return

    const message: Message = {
      id: uuid(),
      userId: currentUserId.value,
      username: currentUsername.value,
      text: text.trim(),
      timestamp: Date.now(),
    }

    // 本地显示消息
    messages.value.push(message)

    // 发送给所有 peers
    sendMessage(message)
  }

  /**
   * 更新用户名
   */
  const updateUsername = async (newUsername: string) => {
    if (!newUsername.trim()) return

    currentUsername.value = newUsername.trim()
    await localforage.setItem('username', currentUsername.value)

    // 广播新用户名
    if (sendMetadata && publicKey.value) {
      const publicKeyString = await encryption.stringifyCryptoKey(publicKey.value)
      sendMetadata({
        userId: currentUserId.value,
        username: currentUsername.value,
        publicKey: publicKeyString,
      })
    }
  }

  /**
   * 离开房间
   */
  const leaveRoom = () => {
    if (peerRoom) {
      peerRoom.leave()
      peerRoom = null
    }
    isConnected.value = false
    peers.value = []
    messages.value = []
  }

  // 组件卸载时清理
  onUnmounted(() => {
    leaveRoom()
  })

  return {
    // 状态
    messages,
    peers,
    currentUserId,
    currentUsername,
    isConnected,
    
    // 方法
    joinRoom,
    sendChatMessage,
    updateUsername,
    leaveRoom,
  }
}

