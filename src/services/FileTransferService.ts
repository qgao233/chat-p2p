/**
 * FileTransferService - 文件传输服务
 * 基于 WebTorrent 实现真正的 P2P 文件传输
 * 支持文件加密、分块传输和进度跟踪
 */

import WebTorrent from 'webtorrent'
import type { Instance as WebTorrentInstance, Torrent } from 'webtorrent'
import type { FileMetadata, FileDownloadProgress } from '../lib/types'
import trackerUrls from '../config/trackerUrls'
import { encryption } from './encryption'

// StreamSaver.js 配置（使用本地文件）
const STREAM_SAVER_URL = `${import.meta.env.VITE_BASE_URL}/vendor/StreamSaver.min.js`
// 文件类型分类
const INLINE_MEDIA_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
}

export class FileTransferService {
  private client: WebTorrentInstance | null = null
  private fileMetadataMap: Map<string, FileMetadata> = new Map()
  private downloadProgressMap: Map<string, FileDownloadProgress> = new Map()
  private torrentMap: Map<string, Torrent> = new Map()
  private streamSaverLoaded: boolean = false
  private rtcConfig: RTCConfiguration

  constructor(rtcConfig?: RTCConfiguration) {
    this.rtcConfig = rtcConfig || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
    this.initializeWebTorrent()
    this.loadStreamSaver()
  }

  /**
   * 初始化 WebTorrent 客户端
   */
  private initializeWebTorrent = (): void => {
    try {
      this.client = new WebTorrent({
        tracker: {
          rtcConfig: this.rtcConfig,
          announce: trackerUrls,
          // 增加超时时间，减少错误日志
          wrtc: {
            // 使用浏览器原生 WebRTC
          }
        },
        // 最大连接数
        maxConns: 55,
        // DHT 在浏览器中禁用
        dht: false,
      })

      // 优化错误处理：区分 tracker 错误和其他错误
      this.client.on('error', (err) => {
        const errorMessage = err.message || err.toString()
        
        // Tracker 连接失败是常见情况，不影响 P2P 功能
        if (errorMessage.includes('tracker') || 
            errorMessage.includes('WebSocket') ||
            errorMessage.includes('connection')) {
          console.warn('[FileTransferService] Tracker 连接警告 (不影响功能):', errorMessage)
        } else {
          // 其他错误才显示为 error
          console.error('[FileTransferService] WebTorrent 错误:', err)
        }
      })

      console.log('[FileTransferService] WebTorrent 客户端已初始化')
      console.log('[FileTransferService] 使用 Tracker URLs:', trackerUrls)
      console.log('[FileTransferService] 提示: Tracker 连接失败不影响 P2P 文件传输功能')
    } catch (error) {
      console.error('[FileTransferService] WebTorrent 初始化失败:', error)
    }
  }

  /**
   * 动态加载 StreamSaver.js
   */
  private loadStreamSaver = async (): Promise<void> => {
    if (this.streamSaverLoaded || typeof window === 'undefined') {
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = STREAM_SAVER_URL
      script.async = true
      script.onload = () => {
        this.streamSaverLoaded = true
        console.log('[FileTransferService] StreamSaver.js 加载成功')
        
        // 配置 StreamSaver 使用本地的 service worker
        if (typeof (window as any).streamSaver !== 'undefined') {
          (window as any).streamSaver.mitm = '/vendor/sw.js'
          console.log('[FileTransferService] StreamSaver mitm 配置为本地文件')
        }
        
        resolve()
      }
      script.onerror = () => {
        console.error('[FileTransferService] StreamSaver.js 加载失败')
        reject(new Error('Failed to load StreamSaver.js'))
      }
      document.head.appendChild(script)
    })
  }

  /**
   * 判断文件类型是否支持内联显示
   */
  isInlineMediaType = (mimeType: string): boolean => {
    const allInlineTypes = [
      ...INLINE_MEDIA_TYPES.image,
      ...INLINE_MEDIA_TYPES.audio,
      ...INLINE_MEDIA_TYPES.video
    ]
    return allInlineTypes.includes(mimeType.toLowerCase())
  }

  /**
   * 获取媒体类别
   */
  getMediaCategory = (mimeType: string): 'image' | 'audio' | 'video' | 'file' => {
    const lowerType = mimeType.toLowerCase()
    
    if (INLINE_MEDIA_TYPES.image.includes(lowerType)) return 'image'
    if (INLINE_MEDIA_TYPES.audio.includes(lowerType)) return 'audio'
    if (INLINE_MEDIA_TYPES.video.includes(lowerType)) return 'video'
    
    return 'file'
  }

  /**
   * 创建文件 Blob URL（用于内联显示）
   */
  createBlobUrl = (file: File | Blob): string => {
    return URL.createObjectURL(file)
  }

  /**
   * 释放 Blob URL
   */
  revokeBlobUrl = (url: string): void => {
    URL.revokeObjectURL(url)
  }

  /**
   * 准备文件用于传输
   * 包括加密文件、创建种子、生成 magnetURI 等
   */
  prepareFileForTransfer = async (file: File): Promise<FileMetadata> => {
    const fileId = crypto.randomUUID()
    const isInline = this.isInlineMediaType(file.type)

    if (!this.client) {
      throw new Error('WebTorrent client not initialized')
    }

    try {
      console.log('[FileTransferService] 开始加密文件:', file.name)
      
      // 1. 生成 AES 密钥
      const aesKey = await encryption.generateAESKey()
      
      // 2. 加密文件
      const { encryptedData, iv } = await encryption.encryptFile(file, aesKey)
      console.log('[FileTransferService] 文件加密完成，大小:', encryptedData.byteLength)
      
      // 3. 创建加密后的 Blob
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' })
      const encryptedFile = new File([encryptedBlob], file.name + '.encrypted', {
        type: 'application/octet-stream'
      })

      return new Promise((resolve, reject) => {
        // 4. 创建种子（使用加密后的文件）
        this.client!.seed(encryptedFile, {
          announce: trackerUrls
        }, (torrent: Torrent) => {
          console.log('[FileTransferService] 加密文件种子创建成功:', torrent.magnetURI)

          const metadata: FileMetadata = {
            id: fileId,
            name: file.name,
            size: file.size,  // 原始文件大小
            type: file.type,  // 原始文件类型
            magnetURI: torrent.magnetURI,
            isInline,
            timestamp: Date.now(),
            aesKey,  // 保存 AES 密钥（本地使用）
            iv       // 保存 IV（本地使用）
          }

          this.fileMetadataMap.set(fileId, metadata)
          this.torrentMap.set(fileId, torrent)
          this.torrentMap.set(torrent.magnetURI, torrent)

          // 监听种子事件
          torrent.on('upload', () => {
            console.log('[FileTransferService] 正在上传加密文件:', torrent.name, '进度:', torrent.progress)
          })

          torrent.on('error', (err) => {
            console.error('[FileTransferService] 种子错误:', err)
            reject(err)
          })

          resolve(metadata)
        })
      })
    } catch (error) {
      console.error('[FileTransferService] 文件加密失败:', error)
      throw error
    }
  }

  /**
   * 通过 MagnetURI 下载并解密文件
   */
  downloadFileByMagnetURI = async (
    magnetURI: string,
    aesKey: CryptoKey,
    iv: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<Blob> => {
    try {
      // 1. 下载加密文件
      const encryptedBlob = await this.downloadEncryptedFile(magnetURI, onProgress)
      console.log('[FileTransferService] 加密文件下载完成，开始解密')
      
      // 2. 解密文件
      const encryptedData = await encryptedBlob.arrayBuffer()
      const decryptedData = await encryption.decryptFile(encryptedData, aesKey, iv)
      console.log('[FileTransferService] 文件解密完成，大小:', decryptedData.byteLength)
      
      // 3. 创建解密后的 Blob
      const decryptedBlob = new Blob([decryptedData])
      return decryptedBlob
    } catch (error) {
      console.error('[FileTransferService] 文件下载或解密失败:', error)
      throw error
    }
  }

  /**
   * 下载加密文件（内部方法）
   */
  private downloadEncryptedFile = async (
    magnetURI: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> => {
    if (!this.client) {
      throw new Error('WebTorrent client not initialized')
    }

    return new Promise((resolve, reject) => {
      console.log('[FileTransferService] 开始下载文件，MagnetURI:', magnetURI)
      
      // 从我们自己的映射中查找种子（不使用 client.get，因为它返回无效对象）
      const existingTorrent = this.torrentMap.get(magnetURI)

      if (existingTorrent) {
        console.log('[FileTransferService] 发现已存在的种子:', {
          name: existingTorrent.name,
          ready: existingTorrent.ready,
          done: existingTorrent.done,
          progress: existingTorrent.progress,
          numPeers: existingTorrent.numPeers
        })
        
        // 如果种子已下载完成，直接返回
        if (existingTorrent.done) {
          console.log('[FileTransferService] 种子已完成，直接获取 Blob')
          this.getBlobFromTorrent(existingTorrent, resolve, reject)
          return
        }
        
        // 如果种子已就绪，监听下载
        if (existingTorrent.ready) {
          console.log('[FileTransferService] 种子已就绪，监听下载')
          this.handleTorrentDownload(existingTorrent, onProgress, resolve, reject)
          return
        }
        
        // 种子未就绪但存在 - 等待它就绪
        console.log('[FileTransferService] 种子未就绪，等待就绪事件')
        
        // 设置超时
        const timeout = setTimeout(() => {
          console.error('[FileTransferService] 等待种子就绪超时')
          reject(new Error('Torrent ready timeout'))
        }, 30000)
        
        existingTorrent.on('ready', () => {
          clearTimeout(timeout)
          console.log('[FileTransferService] 种子现在就绪了')
          this.handleTorrentDownload(existingTorrent, onProgress, resolve, reject)
        })
        
        existingTorrent.once('error' as any, (err: Error) => {
          clearTimeout(timeout)
          console.error('[FileTransferService] 种子错误:', err)
          reject(err)
        })
        return
      }

      // 添加新的种子
      console.log('[FileTransferService] 添加新种子')
      
      // 使用回调方式添加种子
      this.client!.add(magnetURI, {
        announce: trackerUrls
      }, (torrent) => {
        console.log('[FileTransferService] 种子添加成功:', torrent.name)
        console.log('[FileTransferService] 种子信息:', {
          infoHash: torrent.infoHash,
          ready: torrent.ready,
          done: torrent.done,
          numPeers: torrent.numPeers
        })
        
        // 保存到映射中
        this.torrentMap.set(magnetURI, torrent)
        
        // 验证 torrent 对象
        if (!torrent || typeof torrent.on !== 'function') {
          console.error('[FileTransferService] 无效的 torrent 对象')
          reject(new Error('Invalid torrent object'))
          return
        }
        
        // 处理下载
        this.handleTorrentDownload(torrent, onProgress, resolve, reject)
      })
    })
  }

  /**
   * 处理种子下载
   */
  private handleTorrentDownload = (
    torrent: any,
    onProgress: ((progress: number) => void) | undefined,
    resolve: (blob: Blob) => void,
    reject: (reason: any) => void
  ) => {
    // 验证 torrent 对象
    if (!torrent || typeof torrent.on !== 'function') {
      console.error('[FileTransferService] 无效的 torrent 对象:', torrent)
      reject(new Error('Invalid torrent object'))
      return
    }

    console.log('[FileTransferService] 处理种子下载:', {
      name: torrent.name,
      infoHash: torrent.infoHash,
      ready: torrent.ready,
      done: torrent.done,
      progress: torrent.progress,
      numPeers: torrent.numPeers,
      downloaded: torrent.downloaded,
      length: torrent.length
    })

    // 如果已经下载完成
    if (torrent.done) {
      console.log('[FileTransferService] 种子已下载完成')
      this.getBlobFromTorrent(torrent, resolve, reject)
      return
    }

    // 设置下载超时（60秒）
    const downloadTimeout = setTimeout(() => {
      console.error('[FileTransferService] 下载超时，numPeers:', torrent.numPeers)
      torrent.removeListener('download', progressHandler)
      torrent.removeListener('done', doneHandler)
      torrent.removeListener('error', errorHandler)
      reject(new Error('Download timeout - no peers available'))
    }, 60000)

    // 监听下载进度
    const progressHandler = () => {
      const progress = torrent.progress * 100
      console.log('[FileTransferService] 下载进度:', progress.toFixed(2) + '%', 'Peers:', torrent.numPeers, 'Speed:', (torrent.downloadSpeed / 1024).toFixed(2), 'KB/s')
      if (onProgress) {
        onProgress(progress)
      }
    }

    torrent.on('download', progressHandler)

    // 监听下载完成
    const doneHandler = () => {
      clearTimeout(downloadTimeout)
      console.log('[FileTransferService] 下载完成:', torrent.name)
      torrent.removeListener('download', progressHandler)
      torrent.removeListener('done', doneHandler)
      torrent.removeListener('error', errorHandler)
      torrent.removeListener('noPeers', noPeersHandler)
      this.getBlobFromTorrent(torrent, resolve, reject)
    }

    torrent.on('done', doneHandler)

    // 监听错误
    const errorHandler = (err: Error) => {
      clearTimeout(downloadTimeout)
      console.error('[FileTransferService] 下载错误:', err)
      torrent.removeListener('download', progressHandler)
      torrent.removeListener('done', doneHandler)
      torrent.removeListener('error', errorHandler)
      torrent.removeListener('noPeers', noPeersHandler)
      reject(err)
    }

    torrent.on('error', errorHandler)

    // 监听没有 peers 的情况
    const noPeersHandler = () => {
      console.warn('[FileTransferService] 没有可用的 peers')
    }

    torrent.on('noPeers', noPeersHandler)

    // 监听 wire 事件（新的 peer 连接）
    torrent.on('wire', (wire: any) => {
      console.log('[FileTransferService] 新的 peer 连接:', wire.peerId)
    })
  }

  /**
   * 从种子获取 Blob
   */
  private getBlobFromTorrent = (
    torrent: any,
    resolve: (blob: Blob) => void,
    reject: (reason: any) => void
  ) => {
    if (torrent.files.length === 0) {
      reject(new Error('No files in torrent'))
      return
    }

    const file = torrent.files[0]
    console.log('[FileTransferService] 获取文件 Blob:', file.name, '大小:', file.length)
    console.log('[FileTransferService] 可用方法:', Object.keys(file).filter(k => typeof file[k] === 'function'))

    // 方法 1: 使用 getBlobURL (最简单)
    if (typeof file.getBlobURL === 'function') {
      console.log('[FileTransferService] 使用 getBlobURL 方法')
      file.getBlobURL((err: Error | null, url: string | null) => {
        console.log('[FileTransferService] getBlobURL 回调, err:', err, 'url:', url)
        if (err) {
          console.error('[FileTransferService] getBlobURL 失败:', err)
          this.tryStreamMethod(file, resolve, reject)
          return
        }
        if (url) {
          // 从 blob URL 获取 blob
          fetch(url)
            .then(response => response.blob())
            .then(blob => {
              console.log('[FileTransferService] 成功通过 getBlobURL 获取 Blob, 大小:', blob.size, '类型:', blob.type)
              resolve(blob)
            })
            .catch(err => {
              console.error('[FileTransferService] fetch blob 失败:', err)
              this.tryStreamMethod(file, resolve, reject)
            })
        } else {
          this.tryStreamMethod(file, resolve, reject)
        }
      })
      return
    }

    // 方法 2: 使用 getBuffer
    if (typeof file.getBuffer === 'function') {
      console.log('[FileTransferService] 使用 getBuffer 方法')
      file.getBuffer((err: Error | null, buffer: Buffer | null) => {
        console.log('[FileTransferService] getBuffer 回调, err:', err, 'buffer:', buffer ? buffer.length : null)
        if (err) {
          console.error('[FileTransferService] getBuffer 失败:', err)
          this.tryStreamMethod(file, resolve, reject)
          return
        }
        if (buffer) {
          const blob = new Blob([buffer as any], { type: file.type || 'application/octet-stream' })
          console.log('[FileTransferService] 成功通过 getBuffer 创建 Blob, 大小:', blob.size, '类型:', blob.type)
          resolve(blob)
        } else {
          this.tryStreamMethod(file, resolve, reject)
        }
      })
      return
    }

    // 方法 3: 使用流
    this.tryStreamMethod(file, resolve, reject)
  }

  /**
   * 尝试使用流方法获取 Blob
   */
  private tryStreamMethod = async (
    file: any,
    resolve: (blob: Blob) => void,
    reject: (reason: any) => void
  ) => {
    try {
      console.log('[FileTransferService] 尝试流方法')
      console.log('[FileTransferService] file 对象的所有属性:', Object.keys(file))
      console.log('[FileTransferService] file 对象的所有方法:', Object.keys(file).filter(k => typeof file[k] === 'function'))
      
      // 方法 1: 使用 createReadStream
      if (typeof file.createReadStream === 'function') {
        console.log('[FileTransferService] 使用 createReadStream')
        const stream = file.createReadStream()
        const chunks: any[] = []
        
        stream.on('data', (chunk: any) => {
          console.log('[FileTransferService] 收到数据块:', chunk.length)
          chunks.push(chunk)
        })
        
        stream.on('end', () => {
          console.log('[FileTransferService] 流结束，总块数:', chunks.length)
          const blob = new Blob(chunks, { type: file.type || 'application/octet-stream' })
          console.log('[FileTransferService] 成功通过 createReadStream 创建 Blob, 大小:', blob.size)
          resolve(blob)
        })
        
        stream.on('error', (err: Error) => {
          console.error('[FileTransferService] createReadStream 失败:', err)
          reject(err)
        })
        
        return
      }

      // 方法 2: 使用 streamTo (如果存在)
      if (typeof file.streamTo === 'function') {
        console.log('[FileTransferService] 使用 streamTo')
        const chunks: any[] = []
        
        const writable = new WritableStream({
          write(chunk) {
            chunks.push(chunk)
          },
          close() {
            const blob = new Blob(chunks, { type: file.type || 'application/octet-stream' })
            console.log('[FileTransferService] 成功通过 streamTo 创建 Blob')
            resolve(blob)
          },
          abort(err) {
            console.error('[FileTransferService] streamTo 失败:', err)
            reject(err)
          }
        })
        
        file.streamTo(writable)
        return
      }

      // 如果所有方法都失败
      console.error('[FileTransferService] 所有获取 Blob 的方法都不可用')
      console.error('[FileTransferService] 请检查 WebTorrent 版本和文档')
      reject(new Error('No method available to get Blob from file. Available methods: ' + Object.keys(file).filter(k => typeof file[k] === 'function').join(', ')))
    } catch (error) {
      console.error('[FileTransferService] tryStreamMethod 错误:', error)
      reject(error)
    }
  }

  /**
   * 获取文件元数据
   */
  getFileMetadata = (fileId: string): FileMetadata | undefined => {
    return this.fileMetadataMap.get(fileId)
  }

  /**
   * 更新下载进度
   */
  updateDownloadProgress = (fileId: string, progress: number, status: FileDownloadProgress['status']): void => {
    const progressData: FileDownloadProgress = {
      fileId,
      progress,
      status
    }
    this.downloadProgressMap.set(fileId, progressData)
  }

  /**
   * 获取下载进度
   */
  getDownloadProgress = (fileId: string): FileDownloadProgress | undefined => {
    return this.downloadProgressMap.get(fileId)
  }

  /**
   * 格式化文件大小
   */
  formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * 下载文件（使用浏览器原生下载）
   */
  downloadFile = (blob: Blob, filename: string): void => {
    const url = this.createBlobUrl(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 延迟释放 URL
    setTimeout(() => {
      this.revokeBlobUrl(url)
    }, 100)
  }

  /**
   * 使用 StreamSaver 下载大文件（支持流式下载）
   */
  downloadLargeFile = async (
    stream: ReadableStream,
    filename: string,
    fileSize: number
  ): Promise<void> => {
    if (!this.streamSaverLoaded) {
      await this.loadStreamSaver()
    }

    // 检查 StreamSaver 是否可用
    if (typeof (window as any).streamSaver === 'undefined') {
      throw new Error('StreamSaver is not available')
    }

    const fileStream = (window as any).streamSaver.createWriteStream(filename, {
      size: fileSize
    })

    const writer = fileStream.getWriter()
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        await writer.write(value)
      }
    } finally {
      await writer.close()
    }
  }

  /**
   * 清理资源
   */
  cleanup = (): void => {
    // 销毁所有种子
    if (this.client) {
      this.client.destroy((err) => {
        if (err) {
          console.error('[FileTransferService] WebTorrent 清理失败:', err)
        } else {
          console.log('[FileTransferService] WebTorrent 已清理')
        }
      })
      this.client = null
    }

    // 清理映射表
    this.fileMetadataMap.clear()
    this.downloadProgressMap.clear()
    this.torrentMap.clear()
  }

  /**
   * 获取 WebTorrent 客户端实例
   */
  getClient = (): WebTorrentInstance | null => {
    return this.client
  }
}

// 导出单例（需要在使用时传入 rtcConfig）
let serviceInstance: FileTransferService | null = null

export const initFileTransferService = (rtcConfig?: RTCConfiguration): FileTransferService => {
  if (!serviceInstance) {
    serviceInstance = new FileTransferService(rtcConfig)
  }
  return serviceInstance
}

export const getFileTransferService = (): FileTransferService => {
  if (!serviceInstance) {
    throw new Error('FileTransferService not initialized. Call initFileTransferService first.')
  }
  return serviceInstance
}

// 保留原有的默认导出以保持向后兼容
export const fileTransferService = new FileTransferService()

