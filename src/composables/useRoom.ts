/**
 * Vue3 Composable - useRoom
 * 管理 P2P 聊天房间的所有逻辑
 */

import { ref, computed, onUnmounted } from 'vue'
import { v4 as uuid } from 'uuid'
import localforage from 'localforage'
import { 
  PeerRoom, 
  PeerConnectionTypeEnum as PeerConnectionType, 
  PeerHookType,
  PeerVerificationStateEnum as PeerVerificationState
} from '../lib'
import type { Message, UserMetadata } from '../lib'
import { encryption } from '../services/encryption'
import { rtcConfig } from '../config/rtc'

interface Peer {
  peerId: string
  userId: string
  username: string
  publicKey: CryptoKey | null
  connectionType?: PeerConnectionType
  verificationState?: PeerVerificationState
  isVerified?: boolean
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

  // 计算属性 - 验证统计
  const verifiedPeersCount = computed(() => 
    peers.value.filter(p => p.isVerified).length
  )

  const verifyingPeersCount = computed(() => 
    peers.value.filter(p => p.verificationState === PeerVerificationState.VERIFYING).length
  )

  const unverifiedPeersCount = computed(() => 
    peers.value.filter(p => p.verificationState === PeerVerificationState.UNVERIFIED).length
  )

  const allPeersVerified = computed(() => 
    peers.value.length > 0 && peers.value.every(p => p.isVerified)
  )

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
    console.log('[useRoom] 开始加入房间:', roomId)
    
    // 如果已经在房间中，先离开
    if (peerRoom) {
      console.log('[useRoom] 检测到已存在的房间连接，先清理')
      leaveRoom()
    }

    await initializeKeys()
    console.log('[useRoom] 密钥初始化完成, userId:', currentUserId.value)

    // 创建 P2P 房间
    peerRoom = new PeerRoom(roomId, { rtcConfig })
    console.log('[useRoom] PeerRoom 创建完成')

    // 设置本地私钥到验证管理器
    if (privateKey.value) {
      peerRoom.setLocalPrivateKey(privateKey.value)
      console.log('[useRoom] 本地私钥已设置到验证管理器')
    }

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
      console.log('[useRoom] 收到元数据来自:', peerId, metadata)
      try {
        const peerPublicKey = await encryption.parseCryptoKey(metadata.publicKey, 'public')
        console.log('[useRoom] 解析公钥成功:', peerId)
        
        // 注册对等方公钥到验证管理器
        if (peerRoom) {
          peerRoom.registerPublicKey(peerId, peerPublicKey)
          console.log('[useRoom] 注册公钥成功:', peerId)
        }
        
        // 添加或更新 peer 信息
        const existingPeerIndex = peers.value.findIndex(p => p.peerId === peerId)
        const peerData: Peer = {
          peerId,
          userId: metadata.userId,
          username: metadata.username,
          publicKey: peerPublicKey,
          verificationState: peerRoom?.getVerificationState(peerId),
          isVerified: peerRoom?.isVerified(peerId),
        }

        if (existingPeerIndex >= 0) {
          peers.value[existingPeerIndex] = peerData
        } else {
          peers.value.push(peerData)
        }

        // 自动启动验证（如果有密钥）
        if (publicKey.value && privateKey.value && peerRoom) {
          console.log('[useRoom] 开始启动验证:', peerId)
          try {
            // 注意：这里传递的是对方的公钥（peerPublicKey），用于加密发送给对方的令牌
            await peerRoom.initiateVerification(peerId, peerPublicKey, privateKey.value)
            console.log('[useRoom] 验证启动成功:', peerId)
            // 更新验证状态
            updatePeerVerificationState(peerId)
          } catch (error) {
            console.error('[useRoom] 启动验证失败:', error)
          }
        }
      } catch (error) {
        console.error('[useRoom] 处理元数据失败:', error)
      }
    })

    // 监听用户加入 - 使用 NEW_PEER 钩子类型
    peerRoom.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
      console.log('[useRoom] 用户加入:', peerId)
      
      // 发送自己的元数据给新加入的用户
      if (sendMetadata && publicKey.value) {
        console.log('[useRoom] 发送元数据给新用户:', peerId)
        const publicKeyString = await encryption.stringifyCryptoKey(publicKey.value)
        sendMetadata({
          userId: currentUserId.value,
          username: currentUsername.value,
          publicKey: publicKeyString,
        }, peerId)
      } else {
        console.warn('[useRoom] 无法发送元数据: sendMetadata或publicKey不可用')
      }
    })

    // 监听用户离开 - 使用 NEW_PEER 钩子类型
    peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
      console.log('用户离开:', peerId)
      // 移除验证信息
      if (peerRoom) {
        peerRoom.removePeerVerification(peerId)
      }
      peers.value = peers.value.filter(p => p.peerId !== peerId)
    })

    isConnected.value = true

    // 定期更新连接类型和验证状态
    const updateConnectionTypes = async () => {
      if (!peerRoom) return
      
      try {
        const connectionTypes = await peerRoom.getPeerConnectionTypes()
        peers.value.forEach(peer => {
          peer.connectionType = connectionTypes[peer.peerId]
          peer.verificationState = peerRoom?.getVerificationState(peer.peerId)
          peer.isVerified = peerRoom?.isVerified(peer.peerId)
        })
      } catch (error) {
        console.error('更新连接类型失败:', error)
      }
    }

    // 初始更新
    setTimeout(updateConnectionTypes, 2000)
    
    // 每 10 秒更新一次连接类型和验证状态
    const connectionTypeInterval = setInterval(updateConnectionTypes, 10000)
    
    // 清理定时器
    onUnmounted(() => {
      clearInterval(connectionTypeInterval)
    })
  }

  /**
   * 更新单个对等方的验证状态
   */
  const updatePeerVerificationState = (peerId: string) => {
    if (!peerRoom) return

    const peerIndex = peers.value.findIndex(p => p.peerId === peerId)
    if (peerIndex >= 0) {
      const peer = peers.value[peerIndex]
      if (peer) {
        peer.verificationState = peerRoom.getVerificationState(peerId)
        peer.isVerified = peerRoom.isVerified(peerId)
      }
    }
  }

  /**
   * 手动启动对等方验证
   */
  const startVerification = async (peerId: string) => {
    if (!peerRoom || !publicKey.value || !privateKey.value) {
      throw new Error('房间未初始化或密钥不可用')
    }

    // 获取对方的公钥
    const peer = peers.value.find(p => p.peerId === peerId)
    if (!peer || !peer.publicKey) {
      throw new Error('对方公钥不可用')
    }

    try {
      await peerRoom.initiateVerification(peerId, peer.publicKey, privateKey.value)
      updatePeerVerificationState(peerId)
    } catch (error) {
      console.error('启动验证失败:', error)
      throw error
    }
  }

  /**
   * 获取对等方验证状态
   */
  const getVerificationState = (peerId: string): PeerVerificationState => {
    if (!peerRoom) {
      return PeerVerificationState.UNVERIFIED
    }
    return peerRoom.getVerificationState(peerId)
  }

  /**
   * 检查对等方是否已验证
   */
  const isVerified = (peerId: string): boolean => {
    if (!peerRoom) {
      return false
    }
    return peerRoom.isVerified(peerId)
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
    console.log('[useRoom] 离开房间')
    if (peerRoom) {
      try {
        peerRoom.leave()
        console.log('[useRoom] PeerRoom 已清理')
      } catch (error) {
        console.error('[useRoom] 清理 PeerRoom 时出错:', error)
      }
      peerRoom = null
    }
    
    // 清理状态
    isConnected.value = false
    peers.value = []
    messages.value = []
    sendMessage = null
    sendMetadata = null
    
    console.log('[useRoom] 房间状态已重置')
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
    
    // 验证统计（计算属性）
    verifiedPeersCount,
    verifyingPeersCount,
    unverifiedPeersCount,
    allPeersVerified,
    
    // 方法
    joinRoom,
    sendChatMessage,
    updateUsername,
    leaveRoom,
    
    // 验证方法
    startVerification,
    getVerificationState,
    isVerified,
    updatePeerVerificationState,
  }
}

