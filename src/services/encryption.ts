/**
 * 加密服务 - 负责所有加密/解密操作
 * 基于 Web Crypto API 实现端到端加密
 */

const algorithmName = 'RSA-OAEP'
const algorithmHash = 'SHA-256'

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binary)
}

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export class EncryptionService {
  /**
   * 生成 RSA 密钥对（公钥用于加密，私钥用于解密）
   */
  generateKeyPair = async (): Promise<CryptoKeyPair> => {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: algorithmName,
        hash: algorithmHash,
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      },
      true,
      ['encrypt', 'decrypt']
    )
    return keyPair
  }

  /**
   * 将 CryptoKey 转换为可传输的字符串
   */
  stringifyCryptoKey = async (cryptoKey: CryptoKey): Promise<string> => {
    const exportedKey = await window.crypto.subtle.exportKey(
      cryptoKey.type === 'public' ? 'spki' : 'pkcs8',
      cryptoKey
    )
    return arrayBufferToBase64(exportedKey)
  }

  /**
   * 将字符串解析为 CryptoKey
   */
  parseCryptoKey = async (
    keyString: string,
    type: 'public' | 'private'
  ): Promise<CryptoKey> => {
    const importedKey = await window.crypto.subtle.importKey(
      type === 'public' ? 'spki' : 'pkcs8',
      base64ToArrayBuffer(keyString),
      {
        name: algorithmName,
        hash: algorithmHash,
      },
      true,
      type === 'public' ? ['encrypt'] : ['decrypt']
    )
    return importedKey
  }

  /**
   * 使用公钥加密字符串
   */
  encryptString = async (
    publicKey: CryptoKey,
    plaintext: string
  ): Promise<ArrayBuffer> => {
    const encodedText = new TextEncoder().encode(plaintext)
    const encryptedData = await crypto.subtle.encrypt(
      algorithmName,
      publicKey,
      encodedText
    )
    return encryptedData
  }

  /**
   * 使用私钥解密数据
   */
  decryptString = async (
    privateKey: CryptoKey,
    encryptedData: ArrayBuffer
  ): Promise<string> => {
    const decryptedArrayBuffer = await crypto.subtle.decrypt(
      algorithmName,
      privateKey,
      encryptedData
    )
    const decryptedString = new TextDecoder().decode(decryptedArrayBuffer)
    return decryptedString
  }

  /**
   * 生成 AES-GCM 密钥（用于文件加密）
   */
  generateAESKey = async (): Promise<CryptoKey> => {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )
    return key
  }

  /**
   * 导出 AES 密钥为 Base64 字符串
   */
  exportAESKey = async (key: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey('raw', key)
    return arrayBufferToBase64(exported)
  }

  /**
   * 从 Base64 字符串导入 AES 密钥
   */
  importAESKey = async (keyString: string): Promise<CryptoKey> => {
    const keyData = base64ToArrayBuffer(keyString)
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )
    return key
  }

  /**
   * 使用 AES-GCM 加密文件
   */
  encryptFile = async (
    file: File,
    key: CryptoKey
  ): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> => {
    // 生成随机 IV（初始化向量）
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    // 读取文件内容
    const fileData = await file.arrayBuffer()
    
    // 加密
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      fileData
    )
    
    return { encryptedData, iv }
  }

  /**
   * 使用 AES-GCM 解密文件
   */
  decryptFile = async (
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<ArrayBuffer> => {
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    )
    
    return decryptedData
  }

  /**
   * 使用 RSA 公钥加密 AES 密钥（用于密钥交换）
   */
  encryptAESKey = async (
    aesKey: CryptoKey,
    rsaPublicKey: CryptoKey
  ): Promise<ArrayBuffer> => {
    const exportedAESKey = await window.crypto.subtle.exportKey('raw', aesKey)
    const encryptedKey = await window.crypto.subtle.encrypt(
      algorithmName,
      rsaPublicKey,
      exportedAESKey
    )
    return encryptedKey
  }

  /**
   * 使用 RSA 私钥解密 AES 密钥
   */
  decryptAESKey = async (
    encryptedKey: ArrayBuffer,
    rsaPrivateKey: CryptoKey
  ): Promise<CryptoKey> => {
    const decryptedKeyData = await window.crypto.subtle.decrypt(
      algorithmName,
      rsaPrivateKey,
      encryptedKey
    )
    
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      decryptedKeyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    )
    
    return aesKey
  }
}

export const encryption = new EncryptionService()

