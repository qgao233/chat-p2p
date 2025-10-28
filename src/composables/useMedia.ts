/**
 * useMedia - 媒体流管理 Composable
 * 处理音频、视频和屏幕共享
 */

import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { PeerRoom, PeerHookType, PeerStreamType } from '../lib'

export interface MediaState {
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
}

export interface PeerMediaStream {
  peerId: string
  stream: MediaStream
  type: PeerStreamType
  hasAudio: boolean
  hasVideo: boolean
  audioChannels: {
    microphone: boolean
    systemAudio: boolean
  }
}

export const useMedia = (peerRoom: Ref<PeerRoom | null>) => {
  // 本地媒体状态
  const localAudioStream = ref<MediaStream | null>(null)
  const localVideoStream = ref<MediaStream | null>(null)
  const localScreenStream = ref<MediaStream | null>(null)
  
  // 远程媒体流
  const peerAudioStreams = ref<Map<string, MediaStream>>(new Map())
  const peerVideoStreams = ref<Map<string, MediaStream>>(new Map())
  const peerScreenStreams = ref<Map<string, MediaStream>>(new Map())
  
  // 媒体状态
  const mediaState = ref<MediaState>({
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenSharing: false,
  })

  // 计算属性 - 所有远程流
  const remotePeerStreams = computed<PeerMediaStream[]>(() => {
    const streams: PeerMediaStream[] = []
    
    // 音频流
    peerAudioStreams.value.forEach((stream, peerId) => {
      streams.push({
        peerId,
        stream,
        type: PeerStreamType.AUDIO,
        hasAudio: stream.getAudioTracks().length > 0,
        hasVideo: false,
        audioChannels: {
          microphone: true,
          systemAudio: false,
        }
      })
    })
    
    // 视频流
    peerVideoStreams.value.forEach((stream, peerId) => {
      streams.push({
        peerId,
        stream,
        type: PeerStreamType.VIDEO,
        hasAudio: stream.getAudioTracks().length > 0,
        hasVideo: stream.getVideoTracks().length > 0,
        audioChannels: {
          microphone: true,
          systemAudio: false,
        }
      })
    })
    
    // 屏幕共享流
    peerScreenStreams.value.forEach((stream, peerId) => {
      const audioTracks = stream.getAudioTracks()
      streams.push({
        peerId,
        stream,
        type: PeerStreamType.SCREEN,
        hasAudio: audioTracks.length > 0,
        hasVideo: stream.getVideoTracks().length > 0,
        audioChannels: {
          microphone: true,  // 假设有麦克风
          systemAudio: audioTracks.length > 0,  // 系统音频
        }
      })
    })
    
    return streams
  })

  /**
   * 初始化媒体事件监听
   */
  const initializeMediaListeners = () => {
    if (!peerRoom.value) return

    // 监听音频流
    peerRoom.value.onPeerStream(PeerHookType.AUDIO, (stream, peerId, metadata) => {
      console.log('[useMedia] 收到音频流:', peerId, metadata)
      if (metadata?.type === PeerStreamType.AUDIO) {
        peerAudioStreams.value.set(peerId, stream)
      }
    })

    // 监听视频流
    peerRoom.value.onPeerStream(PeerHookType.VIDEO, (stream, peerId, metadata) => {
      console.log('[useMedia] 收到视频流:', peerId, metadata)
      console.log('[useMedia] 视频轨道数:', stream.getVideoTracks().length)
      console.log('[useMedia] 音频轨道数:', stream.getAudioTracks().length)
      if (metadata?.type === PeerStreamType.VIDEO) {
        peerVideoStreams.value.set(peerId, stream)
        console.log('[useMedia] 视频流已保存到 peerVideoStreams')
      }
    })

    // 监听屏幕共享流
    peerRoom.value.onPeerStream(PeerHookType.SCREEN, (stream, peerId, metadata) => {
      console.log('[useMedia] 收到屏幕共享流:', peerId, metadata)
      if (metadata?.type === PeerStreamType.SCREEN) {
        peerScreenStreams.value.set(peerId, stream)
      }
    })

    // 监听对等方加入 - 重新发送当前活动的流给新 peer
    peerRoom.value.onPeerJoin(PeerHookType.AUDIO, (peerId) => {
      if (localAudioStream.value) {
        console.log('[useMedia] 新 peer 加入，发送音频流给:', peerId)
        peerRoom.value?.addStream(localAudioStream.value, [peerId], { type: PeerStreamType.AUDIO })
      }
    })

    peerRoom.value.onPeerJoin(PeerHookType.VIDEO, (peerId) => {
      if (localVideoStream.value) {
        console.log('[useMedia] 新 peer 加入，发送视频流给:', peerId)
        peerRoom.value?.addStream(localVideoStream.value, [peerId], { type: PeerStreamType.VIDEO })
      }
    })

    peerRoom.value.onPeerJoin(PeerHookType.SCREEN, (peerId) => {
      if (localScreenStream.value) {
        console.log('[useMedia] 新 peer 加入，发送屏幕共享流给:', peerId)
        peerRoom.value?.addStream(localScreenStream.value, [peerId], { type: PeerStreamType.SCREEN })
      }
    })

    // 监听对等方离开
    peerRoom.value.onPeerLeave(PeerHookType.AUDIO, (peerId) => {
      peerAudioStreams.value.delete(peerId)
    })

    peerRoom.value.onPeerLeave(PeerHookType.VIDEO, (peerId) => {
      peerVideoStreams.value.delete(peerId)
    })

    peerRoom.value.onPeerLeave(PeerHookType.SCREEN, (peerId) => {
      peerScreenStreams.value.delete(peerId)
    })

    console.log('[useMedia] 媒体事件监听器已初始化')
  }

  /**
   * 启动音频通话（仅麦克风）
   */
  const startAudioCall = async () => {
    if (!peerRoom.value) {
      throw new Error('PeerRoom 未初始化')
    }

    try {
      console.log('[useMedia] 请求麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localAudioStream.value = stream
      mediaState.value.isAudioEnabled = true

      // 添加到 PeerRoom
      peerRoom.value.addStream(stream, undefined, { type: PeerStreamType.AUDIO })
      console.log('[useMedia] 音频流已添加')
    } catch (error) {
      console.error('[useMedia] 启动音频失败:', error)
      throw error
    }
  }

  /**
   * 停止音频通话
   */
  const stopAudioCall = () => {
    if (localAudioStream.value && peerRoom.value) {
      peerRoom.value.removeStream(localAudioStream.value)
      localAudioStream.value.getTracks().forEach(track => track.stop())
      localAudioStream.value = null
      mediaState.value.isAudioEnabled = false
      console.log('[useMedia] 音频流已停止')
    }
  }

  /**
   * 启动视频通话（摄像头 + 麦克风）
   */
  const startVideoCall = async () => {
    if (!peerRoom.value) {
      throw new Error('PeerRoom 未初始化')
    }

    try {
      console.log('[useMedia] 请求摄像头和麦克风权限...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      })

      localVideoStream.value = stream
      mediaState.value.isVideoEnabled = true

      console.log('[useMedia] 本地视频流信息:')
      console.log('  - 视频轨道数:', stream.getVideoTracks().length)
      console.log('  - 音频轨道数:', stream.getAudioTracks().length)
      console.log('  - 流ID:', stream.id)

      // 添加到 PeerRoom
      peerRoom.value.addStream(stream, undefined, { type: PeerStreamType.VIDEO })
      console.log('[useMedia] 视频流已添加到 PeerRoom')
    } catch (error) {
      console.error('[useMedia] 启动视频失败:', error)
      throw error
    }
  }

  /**
   * 停止视频通话
   */
  const stopVideoCall = () => {
    if (localVideoStream.value && peerRoom.value) {
      peerRoom.value.removeStream(localVideoStream.value)
      localVideoStream.value.getTracks().forEach(track => track.stop())
      localVideoStream.value = null
      mediaState.value.isVideoEnabled = false
      console.log('[useMedia] 视频流已停止')
    }
  }

  /**
   * 启动屏幕共享（屏幕 + 系统音 + 麦克风）
   */
  const startScreenShare = async () => {
    if (!peerRoom.value) {
      throw new Error('PeerRoom 未初始化')
    }

    try {
      console.log('[useMedia] 请求屏幕共享权限...')
      
      // 获取屏幕共享流（包含系统音频）
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      // 获取麦克风流
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      // 合并流：屏幕视频 + 系统音频 + 麦克风音频
      const combinedStream = new MediaStream()
      
      // 添加屏幕视频轨道
      screenStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track)
      })
      
      // 添加系统音频轨道（如果有）
      const systemAudioTracks = screenStream.getAudioTracks()
      if (systemAudioTracks.length > 0) {
        systemAudioTracks.forEach(track => {
          // Cannot modify read-only track.label, but we can still identify system audio tracks by their presence in screenStream
          combinedStream.addTrack(track)
        })
        console.log('[useMedia] 系统音频已包含')
      }
      
      // 添加麦克风音频轨道
      micStream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track)
      })

      localScreenStream.value = combinedStream
      mediaState.value.isScreenSharing = true

      // 监听屏幕共享停止
      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        console.log('[useMedia] 用户停止了屏幕共享')
        stopScreenShare()
      })

      // 添加到 PeerRoom
      peerRoom.value.addStream(combinedStream, undefined, { type: PeerStreamType.SCREEN })
      console.log('[useMedia] 屏幕共享流已添加（包含系统音频和麦克风）')
    } catch (error) {
      console.error('[useMedia] 启动屏幕共享失败:', error)
      throw error
    }
  }

  /**
   * 停止屏幕共享
   */
  const stopScreenShare = () => {
    if (localScreenStream.value && peerRoom.value) {
      peerRoom.value.removeStream(localScreenStream.value)
      localScreenStream.value.getTracks().forEach(track => track.stop())
      localScreenStream.value = null
      mediaState.value.isScreenSharing = false
      console.log('[useMedia] 屏幕共享已停止')
    }
  }

  /**
   * 切换音频静音
   */
  const toggleAudioMute = () => {
    if (localAudioStream.value) {
      const audioTrack = localAudioStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        console.log('[useMedia] 音频静音:', !audioTrack.enabled)
      }
    }
    if (localVideoStream.value) {
      const audioTrack = localVideoStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        console.log('[useMedia] 视频通话音频静音:', !audioTrack.enabled)
      }
    }
  }

  /**
   * 切换视频开关
   */
  const toggleVideo = () => {
    if (localVideoStream.value) {
      const videoTrack = localVideoStream.value.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        console.log('[useMedia] 视频开关:', videoTrack.enabled)
      }
    }
  }

  /**
   * 获取特定对等方的音频流
   */
  const getPeerAudioStream = (peerId: string): MediaStream | null => {
    return peerAudioStreams.value.get(peerId) || null
  }

  /**
   * 获取特定对等方的视频流
   */
  const getPeerVideoStream = (peerId: string): MediaStream | null => {
    return peerVideoStreams.value.get(peerId) || null
  }

  /**
   * 获取特定对等方的屏幕共享流
   */
  const getPeerScreenStream = (peerId: string): MediaStream | null => {
    return peerScreenStreams.value.get(peerId) || null
  }

  /**
   * 清理所有媒体资源
   */
  const cleanup = () => {
    console.log('[useMedia] 清理所有媒体资源')
    
    stopAudioCall()
    stopVideoCall()
    stopScreenShare()
    
    peerAudioStreams.value.clear()
    peerVideoStreams.value.clear()
    peerScreenStreams.value.clear()
  }

  return {
    // 状态
    mediaState,
    localAudioStream,
    localVideoStream,
    localScreenStream,
    remotePeerStreams,
    
    // 初始化
    initializeMediaListeners,
    
    // 音频通话
    startAudioCall,
    stopAudioCall,
    
    // 视频通话
    startVideoCall,
    stopVideoCall,
    
    // 屏幕共享
    startScreenShare,
    stopScreenShare,
    
    // 控制
    toggleAudioMute,
    toggleVideo,
    
    // 查询
    getPeerAudioStream,
    getPeerVideoStream,
    getPeerScreenStream,
    
    // 清理
    cleanup,
  }
}

