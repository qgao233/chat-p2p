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
}

export const encryption = new EncryptionService()

