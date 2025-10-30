/**
 * useFileShare - 文件共享 Hook
 * 管理文件上传、下载和分发的完整生命周期
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { PeerRoom } from '../lib/PeerRoom'
import type { FileMetadata, FileOffer } from '../lib/types'
import { ActionNamespace } from '../lib/types'
import { fileTransferService } from '../services/FileTransferService'
import { encryption } from '../services/encryption'

// 辅助函数：ArrayBuffer 转 Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  return btoa(binary)
}

// 辅助函数：Base64 转 ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

interface Peer {
  peerId: string
  userId: string
  username: string
  publicKey: CryptoKey | null
}

export interface SharedFile extends FileMetadata {
  file?: File
  blobUrl?: string
  userId: string
  username: string
}

export interface UseFileShareReturn {
  sharedFiles: Ref<SharedFile[]>
  uploadProgress: Ref<Map<string, number>>
  uploadFile: (file: File, userId: string, username: string) => Promise<void>
  downloadFile: (fileId: string) => Promise<void>
  getFileById: (fileId: string) => SharedFile | undefined
  cleanup: () => void
}

export const useFileShare = (
  peerRoom: PeerRoom,
  peers: Ref<Peer[]>,
  privateKey: Ref<CryptoKey | null>
): UseFileShareReturn => {
  const sharedFiles = ref<SharedFile[]>([])
  const uploadProgress = ref<Map<string, number>>(new Map())
  const fileObjectMap = new Map<string, File>()

  // 创建文件传输 action
  const { sendFileOffer, onFileOffer } = peerRoom.createFileOfferAction(ActionNamespace.GROUP)

  /**
   * 上传文件（包含加密和密钥分发）
   */
  const uploadFile = async (file: File, userId: string, username: string): Promise<void> => {
    try {
      console.log('[useFileShare] 开始上传加密文件:', file.name)

      // 1. 准备文件元数据（文件已在 prepareFileForTransfer 中加密）
      const metadata = await fileTransferService.prepareFileForTransfer(file)
      uploadProgress.value.set(metadata.id, 0)

      if (!metadata.aesKey || !metadata.iv) {
        throw new Error('文件加密失败：缺少 AES 密钥或 IV')
      }

      // 2. 创建共享文件对象
      const sharedFile: SharedFile = {
        ...metadata,
        file,
        userId,
        username,
        blobUrl: metadata.isInline ? fileTransferService.createBlobUrl(file) : undefined
      }

      // 3. 添加到本地文件列表
      sharedFiles.value.push(sharedFile)
      fileObjectMap.set(metadata.id, file)

      // 4. 为每个在线的 peer 加密 AES 密钥并发送
      const onlinePeers = peers.value.filter(p => p.publicKey !== null)
      console.log('[useFileShare] 向', onlinePeers.length, '个 peer 发送加密文件')

      if (onlinePeers.length === 0) {
        console.warn('[useFileShare] 没有在线的 peer，文件仅保存在本地')
        uploadProgress.value.set(metadata.id, 100)
        return
      }

      for (const peer of onlinePeers) {
        try {
          // 使用 peer 的公钥加密 AES 密钥
          const encryptedAESKey = await encryption.encryptAESKey(
            metadata.aesKey,
            peer.publicKey!
          )

          // 创建文件提供消息
          const fileOffer: FileOffer = {
            id: metadata.id,
            fileName: metadata.name,
            fileSize: metadata.size,
            fileType: metadata.type,
            magnetURI: metadata.magnetURI,
            isInline: metadata.isInline,
            encryptedAESKey: arrayBufferToBase64(encryptedAESKey),
            iv: arrayBufferToBase64(metadata.iv)
          }

          // 发送给特定 peer
          sendFileOffer(fileOffer, peer.peerId)
          console.log('[useFileShare] 已向 peer 发送加密文件:', peer.username)
        } catch (error) {
          console.error('[useFileShare] 向 peer 发送失败:', peer.username, error)
        }
      }

      uploadProgress.value.set(metadata.id, 100)
      console.log('[useFileShare] 加密文件上传完成:', file.name)
    } catch (error) {
      console.error('[useFileShare] 文件上传失败:', error)
      throw error
    }
  }

  /**
   * 接收文件提供通知（包含解密密钥）
   */
  onFileOffer(async (fileOffer: FileOffer, peerId: string) => {
    console.log('[useFileShare] 收到加密文件提供:', fileOffer.fileName, '来自:', peerId)

    // 检查是否已存在
    const existingFile = sharedFiles.value.find(f => f.id === fileOffer.id)
    if (existingFile) {
      console.log('[useFileShare] 文件已存在，跳过')
      return
    }

    // 验证必要的加密信息
    if (!fileOffer.encryptedAESKey || !fileOffer.iv) {
      console.error('[useFileShare] 文件缺少加密信息，无法接收')
      return
    }

    if (!privateKey.value) {
      console.error('[useFileShare] 本地私钥不可用，无法解密')
      return
    }

    try {
      // 1. 解密 AES 密钥
      console.log('[useFileShare] 开始解密 AES 密钥')
      const encryptedKeyBuffer = base64ToArrayBuffer(fileOffer.encryptedAESKey)
      const aesKey = await encryption.decryptAESKey(encryptedKeyBuffer, privateKey.value)
      console.log('[useFileShare] AES 密钥解密成功')

      // 2. 解码 IV
      const ivBuffer = base64ToArrayBuffer(fileOffer.iv)
      const iv = new Uint8Array(ivBuffer)

      // 3. 获取发送者用户名
      const peer = peers.value.find(p => p.peerId === peerId)
      const username = peer?.username || '远程用户'

      // 4. 创建共享文件对象（包含解密密钥）
      const sharedFile: SharedFile = {
        id: fileOffer.id,
        name: fileOffer.fileName,
        size: fileOffer.fileSize,
        type: fileOffer.fileType,
        magnetURI: fileOffer.magnetURI,
        isInline: fileOffer.isInline || false,
        timestamp: Date.now(),
        userId: peerId,
        username,
        aesKey,  // 保存解密后的 AES 密钥
        iv       // 保存 IV
      }

      sharedFiles.value.push(sharedFile)
      console.log('[useFileShare] 加密文件已添加到列表:', sharedFile.name)

      // 5. 如果是内联媒体，自动下载并解密
      if (sharedFile.isInline && sharedFile.magnetURI) {
        console.log('[useFileShare] 自动下载并解密内联媒体:', sharedFile.name)
        autoDownloadInlineMedia(sharedFile)
      }
    } catch (error) {
      console.error('[useFileShare] 处理加密文件失败:', error)
    }
  })

  /**
   * 自动下载并解密内联媒体
   */
  const autoDownloadInlineMedia = async (sharedFile: SharedFile) => {
    try {
      console.log('[useFileShare] 开始自动下载加密内联媒体:', sharedFile.name)

      if (!sharedFile.aesKey || !sharedFile.iv) {
        console.error('[useFileShare] 缺少解密密钥，无法下载')
        return
      }
      
      // 下载并解密文件
      const blob = await fileTransferService.downloadFileByMagnetURI(
        sharedFile.magnetURI,
        sharedFile.aesKey,
        sharedFile.iv,
        (progress) => {
          console.log('[useFileShare] 内联媒体下载进度:', progress.toFixed(2) + '%')
        }
      )

      console.log('[useFileShare] 下载并解密完成，获得 Blob:', blob.size, '字节')

      // 创建正确类型的 Blob
      const typedBlob = new Blob([blob], { type: sharedFile.type })
      const blobUrl = fileTransferService.createBlobUrl(typedBlob)
      console.log('[useFileShare] 创建 Blob URL:', blobUrl)
      
      // 更新文件对象
      const fileIndex = sharedFiles.value.findIndex(f => f.id === sharedFile.id)
      
      if (fileIndex !== -1) {
        sharedFiles.value[fileIndex].blobUrl = blobUrl
        console.log('[useFileShare] 内联媒体自动下载并解密完成:', sharedFile.name)
      } else {
        console.error('[useFileShare] 找不到文件对象，无法更新 blobUrl')
      }
    } catch (error) {
      console.error('[useFileShare] 内联媒体自动下载失败:', error)
    }
  }

  /**
   * 下载文件
   */
  const downloadFile = async (fileId: string): Promise<void> => {
    try {
      const sharedFile = sharedFiles.value.find(f => f.id === fileId)
      if (!sharedFile) {
        throw new Error('文件不存在')
      }

      console.log('[useFileShare] 开始下载文件:', sharedFile.name)

      // 如果是本地文件，直接下载
      const localFile = fileObjectMap.get(fileId)
      if (localFile) {
        fileTransferService.downloadFile(localFile, localFile.name)
        console.log('[useFileShare] 本地文件下载完成')
        return
      }

      // 远程文件通过 WebTorrent 下载并解密
      if (!sharedFile.magnetURI) {
        throw new Error('文件 MagnetURI 不存在')
      }

      if (!sharedFile.aesKey || !sharedFile.iv) {
        throw new Error('文件缺少解密密钥')
      }

      console.log('[useFileShare] 通过 P2P 下载并解密文件:', sharedFile.magnetURI)

      // 更新下载状态
      fileTransferService.updateDownloadProgress(fileId, 0, 'downloading')

      // 通过 MagnetURI 下载并解密
      const blob = await fileTransferService.downloadFileByMagnetURI(
        sharedFile.magnetURI,
        sharedFile.aesKey,
        sharedFile.iv,
        (progress) => {
          fileTransferService.updateDownloadProgress(fileId, progress, 'downloading')
        }
      )

      // 下载完成
      fileTransferService.updateDownloadProgress(fileId, 100, 'completed')
      
      // 触发浏览器下载
      fileTransferService.downloadFile(blob, sharedFile.name)
      
      console.log('[useFileShare] P2P 文件下载完成')
    } catch (error) {
      console.error('[useFileShare] 文件下载失败:', error)
      const sharedFile = sharedFiles.value.find(f => f.id === fileId)
      if (sharedFile) {
        fileTransferService.updateDownloadProgress(fileId, 0, 'error')
      }
      throw error
    }
  }

  /**
   * 根据 ID 获取文件
   */
  const getFileById = (fileId: string): SharedFile | undefined => {
    return sharedFiles.value.find(f => f.id === fileId)
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    // 释放所有 Blob URL
    sharedFiles.value.forEach(file => {
      if (file.blobUrl) {
        fileTransferService.revokeBlobUrl(file.blobUrl)
      }
    })

    sharedFiles.value = []
    uploadProgress.value.clear()
    fileObjectMap.clear()
  }

  return {
    sharedFiles,
    uploadProgress,
    uploadFile,
    downloadFile,
    getFileById,
    cleanup
  }
}

