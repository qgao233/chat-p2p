/**
 * useVerification - Vue3 Composable for Peer Verification
 * 对等方验证的 Vue3 组合式函数
 */

import { ref, computed, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import {
  PeerVerificationManager,
  PeerVerificationState,
  type PeerVerificationMetadata,
  type VerificationConfig
} from '../lib'
import type { PeerRoom } from '../lib'

export interface VerifiedPeer {
  peerId: string
  state: PeerVerificationState
  isVerified: boolean
  metadata?: PeerVerificationMetadata
}

export const useVerification = (
  peerRoom: Ref<PeerRoom | null>,
  config?: VerificationConfig
) => {
  const verificationManager = ref<PeerVerificationManager | null>(null)
  const verifiedPeers = ref<VerifiedPeer[]>([])
  const isInitialized = ref(false)

  /**
   * 初始化验证管理器
   */
  const initialize = () => {
    if (!peerRoom.value) {
      console.warn('[useVerification] PeerRoom 尚未初始化')
      return
    }

    verificationManager.value = new PeerVerificationManager(peerRoom.value, config)
    isInitialized.value = true
    console.log('[useVerification] 验证管理器已初始化')
  }

  /**
   * 启动验证
   */
  const startVerification = async (
    peerId: string,
    publicKey: CryptoKey,
    privateKey: CryptoKey
  ): Promise<void> => {
    if (!verificationManager.value) {
      throw new Error('验证管理器未初始化')
    }

    await verificationManager.value.initiateVerification(peerId, publicKey, privateKey)
    updateVerifiedPeers()
  }

  /**
   * 注册公钥
   */
  const registerPublicKey = (peerId: string, publicKey: CryptoKey) => {
    if (!verificationManager.value) {
      throw new Error('验证管理器未初始化')
    }

    verificationManager.value.registerPublicKey(peerId, publicKey)
  }

  /**
   * 获取验证状态
   */
  const getVerificationState = (peerId: string): PeerVerificationState => {
    if (!verificationManager.value) {
      return PeerVerificationState.UNVERIFIED
    }

    return verificationManager.value.getVerificationState(peerId)
  }

  /**
   * 检查是否已验证
   */
  const isVerified = (peerId: string): boolean => {
    if (!verificationManager.value) {
      return false
    }

    return verificationManager.value.isVerified(peerId)
  }

  /**
   * 更新已验证对等方列表
   */
  const updateVerifiedPeers = () => {
    if (!verificationManager.value) {
      verifiedPeers.value = []
      return
    }

    const peerIds = peerRoom.value?.getPeers() || []
    verifiedPeers.value = peerIds.map(peerId => ({
      peerId,
      state: verificationManager.value!.getVerificationState(peerId),
      isVerified: verificationManager.value!.isVerified(peerId),
      metadata: verificationManager.value!.getVerificationMetadata(peerId)
    }))
  }

  /**
   * 移除对等方
   */
  const removePeer = (peerId: string) => {
    if (!verificationManager.value) return

    verificationManager.value.removePeer(peerId)
    updateVerifiedPeers()
  }

  /**
   * 清理
   */
  const cleanup = () => {
    if (verificationManager.value) {
      verificationManager.value.cleanup()
      verificationManager.value = null
    }
    verifiedPeers.value = []
    isInitialized.value = false
  }

  // 计算属性
  const verifiedCount = computed(() => 
    verifiedPeers.value.filter(p => p.isVerified).length
  )

  const verifyingCount = computed(() => 
    verifiedPeers.value.filter(p => p.state === PeerVerificationState.VERIFYING).length
  )

  const unverifiedCount = computed(() => 
    verifiedPeers.value.filter(p => p.state === PeerVerificationState.UNVERIFIED).length
  )

  const allVerified = computed(() => 
    verifiedPeers.value.length > 0 && 
    verifiedPeers.value.every(p => p.isVerified)
  )

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 状态
    verificationManager,
    verifiedPeers,
    isInitialized,
    
    // 计算属性
    verifiedCount,
    verifyingCount,
    unverifiedCount,
    allVerified,
    
    // 方法
    initialize,
    startVerification,
    registerPublicKey,
    getVerificationState,
    isVerified,
    updateVerifiedPeers,
    removePeer,
    cleanup
  }
}

