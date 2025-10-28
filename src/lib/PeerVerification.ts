/**
 * PeerVerification - 对等方验证系统
 * 防止中间人攻击，确保真实的对等方连接
 */

import type { PeerRoom } from '../lib'
import { PeerAction, ActionNamespace } from '../lib'
import { encryption } from '../services/encryption'

/**
 * 对等方验证状态
 */
export enum PeerVerificationState {
  VERIFYING = 'VERIFYING',     // 验证进行中
  VERIFIED = 'VERIFIED',         // 验证成功
  UNVERIFIED = 'UNVERIFIED',     // 验证失败或超时
}

/**
 * 验证令牌数据（加密传输）
 */
export interface VerificationTokenEncrypted {
  requestId: string              // 请求 ID
  encryptedToken: string         // 加密的令牌（Base64）
  timestamp: number              // 时间戳
  [key: string]: string | number
}

/**
 * 验证令牌响应（原始）
 */
export interface VerificationTokenRaw {
  requestId: string              // 请求 ID
  decryptedToken: string         // 解密的令牌
  timestamp: number              // 时间戳
  [key: string]: string | number
}

/**
 * 对等方验证元数据
 */
export interface PeerVerificationMetadata {
  peerId: string                           // 对等方 ID
  state: PeerVerificationState             // 验证状态
  localToken: string                       // 本地生成的令牌
  remoteToken?: string                     // 远程令牌
  encryptedLocalToken?: string             // 加密后的本地令牌
  requestId: string                        // 请求 ID
  timestamp: number                        // 开始时间
  timeoutTimer?: ReturnType<typeof setTimeout>  // 超时计时器
}

/**
 * 验证配置
 */
export interface VerificationConfig {
  timeout?: number                // 验证超时时间（毫秒），默认 30000
  tokenLength?: number            // 令牌长度，默认 32
  namespace?: ActionNamespace     // 命名空间，默认 GROUP
}

// 默认配置
const DEFAULT_CONFIG: Required<VerificationConfig> = {
  timeout: 30000,      // 30 秒
  tokenLength: 32,     // 32 字节
  namespace: ActionNamespace.GROUP,
}

/**
 * 对等方验证管理器
 */
export class PeerVerificationManager {
  private peerRoom: PeerRoom
  private config: Required<VerificationConfig>
  private verificationMap: Map<string, PeerVerificationMetadata> = new Map()
  private publicKeyMap: Map<string, CryptoKey> = new Map()

  constructor(peerRoom: PeerRoom, config: VerificationConfig = {}) {
    this.peerRoom = peerRoom
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupVerificationChannels()
  }

  /**
   * 设置验证通道
   */
  private setupVerificationChannels = () => {
    // 加密令牌通道
    const [sendEncryptedToken, onEncryptedToken] = this.peerRoom.makeAction<VerificationTokenEncrypted>(
      PeerAction.VERIFICATION_REQUEST,
      this.config.namespace
    )

    // 原始令牌通道
    const [sendRawToken, onRawToken] = this.peerRoom.makeAction<VerificationTokenRaw>(
      PeerAction.VERIFICATION_RESPONSE,
      this.config.namespace
    )

    // 监听加密令牌（质询）
    onEncryptedToken(async (data, peerId) => {
      await this.handleEncryptedTokenReceived(data, peerId)
    })

    // 监听原始令牌（响应）
    onRawToken(async (data, peerId) => {
      await this.handleRawTokenReceived(data, peerId)
    })

    // 保存发送方法
    ;(this as any).sendEncryptedToken = sendEncryptedToken
    ;(this as any).sendRawToken = sendRawToken
  }

  /**
   * 生成随机令牌
   */
  private generateToken = (): string => {
    const array = new Uint8Array(this.config.tokenLength)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId = (): string => {
    return `verify-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 注册对等方的公钥
   */
  registerPublicKey = (peerId: string, publicKey: CryptoKey) => {
    this.publicKeyMap.set(peerId, publicKey)
  }

  /**
   * 启动验证过程
   * @param peerId - 要验证的对等方 ID
   * @param publicKey - 对等方的公钥
   * @param privateKey - 本地私钥
   */
  initiateVerification = async (
    peerId: string,
    publicKey: CryptoKey,
    privateKey: CryptoKey
  ): Promise<void> => {
    // 生成本地令牌
    const localToken = this.generateToken()
    const requestId = this.generateRequestId()

    // 使用对等方公钥加密令牌
    const encryptedToken = await encryption.encryptString(publicKey, localToken)
    const encryptedTokenBase64 = this.arrayBufferToBase64(encryptedToken)

    // 创建验证元数据
    const metadata: PeerVerificationMetadata = {
      peerId,
      state: PeerVerificationState.VERIFYING,
      localToken,
      encryptedLocalToken: encryptedTokenBase64,
      requestId,
      timestamp: Date.now(),
    }

    // 设置超时
    metadata.timeoutTimer = setTimeout(() => {
      this.handleVerificationTimeout(peerId)
    }, this.config.timeout)

    this.verificationMap.set(peerId, metadata)
    this.publicKeyMap.set(peerId, publicKey)

    // 发送加密令牌
    const sendEncryptedToken = (this as any).sendEncryptedToken
    sendEncryptedToken({
      requestId,
      encryptedToken: encryptedTokenBase64,
      timestamp: Date.now(),
    }, peerId)

    console.log(`[验证] 向 ${peerId} 发送验证请求 (ID: ${requestId})`)
  }

  /**
   * 处理收到的加密令牌（质询）
   */
  private handleEncryptedTokenReceived = async (
    data: VerificationTokenEncrypted,
    peerId: string
  ) => {
    console.log(`[验证] 收到来自 ${peerId} 的验证请求 (ID: ${data.requestId})`)

    try {
      // 获取本地私钥
      const privateKey = await this.getPrivateKey()
      if (!privateKey) {
        throw new Error('本地私钥不可用')
      }

      // 解密令牌
      const encryptedBuffer = this.base64ToArrayBuffer(data.encryptedToken)
      const decryptedToken = await encryption.decryptString(privateKey, encryptedBuffer)

      console.log(`[验证] 成功解密来自 ${peerId} 的令牌`)

      // 发送解密后的令牌作为响应
      const sendRawToken = (this as any).sendRawToken
      sendRawToken({
        requestId: data.requestId,
        decryptedToken,
        timestamp: Date.now(),
      }, peerId)

      console.log(`[验证] 向 ${peerId} 发送验证响应 (ID: ${data.requestId})`)
    } catch (error) {
      console.error(`[验证] 处理来自 ${peerId} 的验证请求失败:`, error)
      this.setVerificationState(peerId, PeerVerificationState.UNVERIFIED)
    }
  }

  /**
   * 处理收到的原始令牌（响应）
   */
  private handleRawTokenReceived = async (
    data: VerificationTokenRaw,
    peerId: string
  ) => {
    console.log(`[验证] 收到来自 ${peerId} 的验证响应 (ID: ${data.requestId})`)

    const metadata = this.verificationMap.get(peerId)
    if (!metadata) {
      console.warn(`[验证] 未找到 ${peerId} 的验证元数据`)
      return
    }

    // 检查请求 ID 是否匹配
    if (metadata.requestId !== data.requestId) {
      console.warn(`[验证] 请求 ID 不匹配: ${metadata.requestId} != ${data.requestId}`)
      this.setVerificationState(peerId, PeerVerificationState.UNVERIFIED)
      return
    }

    // 清除超时计时器
    if (metadata.timeoutTimer) {
      clearTimeout(metadata.timeoutTimer)
    }

    // 验证令牌
    if (data.decryptedToken === metadata.localToken) {
      console.log(`[验证] ✅ ${peerId} 验证成功`)
      metadata.remoteToken = data.decryptedToken
      this.setVerificationState(peerId, PeerVerificationState.VERIFIED)
    } else {
      console.warn(`[验证] ❌ ${peerId} 验证失败：令牌不匹配`)
      this.setVerificationState(peerId, PeerVerificationState.UNVERIFIED)
    }
  }

  /**
   * 处理验证超时
   */
  private handleVerificationTimeout = (peerId: string) => {
    console.warn(`[验证] ⏱️ ${peerId} 验证超时`)
    this.setVerificationState(peerId, PeerVerificationState.UNVERIFIED)
  }

  /**
   * 设置验证状态
   */
  private setVerificationState = (peerId: string, state: PeerVerificationState) => {
    const metadata = this.verificationMap.get(peerId)
    if (metadata) {
      metadata.state = state
      this.verificationMap.set(peerId, metadata)
    }
  }

  /**
   * 获取对等方验证状态
   */
  getVerificationState = (peerId: string): PeerVerificationState => {
    const metadata = this.verificationMap.get(peerId)
    return metadata?.state ?? PeerVerificationState.UNVERIFIED
  }

  /**
   * 检查对等方是否已验证
   */
  isVerified = (peerId: string): boolean => {
    return this.getVerificationState(peerId) === PeerVerificationState.VERIFIED
  }

  /**
   * 获取所有已验证的对等方
   */
  getVerifiedPeers = (): string[] => {
    const verified: string[] = []
    this.verificationMap.forEach((metadata, peerId) => {
      if (metadata.state === PeerVerificationState.VERIFIED) {
        verified.push(peerId)
      }
    })
    return verified
  }

  /**
   * 获取验证元数据
   */
  getVerificationMetadata = (peerId: string): PeerVerificationMetadata | undefined => {
    return this.verificationMap.get(peerId)
  }

  /**
   * 移除对等方验证数据
   */
  removePeer = (peerId: string) => {
    const metadata = this.verificationMap.get(peerId)
    if (metadata?.timeoutTimer) {
      clearTimeout(metadata.timeoutTimer)
    }
    this.verificationMap.delete(peerId)
    this.publicKeyMap.delete(peerId)
    console.log(`[验证] 移除 ${peerId} 的验证数据`)
  }

  /**
   * 清理所有验证数据
   */
  cleanup = () => {
    this.verificationMap.forEach((metadata) => {
      if (metadata.timeoutTimer) {
        clearTimeout(metadata.timeoutTimer)
      }
    })
    this.verificationMap.clear()
    this.publicKeyMap.clear()
    console.log('[验证] 清理所有验证数据')
  }

  // ==================== 工具方法 ====================

  /**
   * 获取本地私钥（需要外部提供）
   */
  private getPrivateKey = async (): Promise<CryptoKey | null> => {
    // 这里需要从外部获取私钥
    // 在实际使用中，应该通过构造函数或方法注入
    return null
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] as unknown as number)
    }
    return btoa(binary)
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}

