/**
 * useMedia - 媒体流管理 Composable
 * 处理音频、视频和屏幕共享
 */

import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { PeerRoom, PeerHookType, HookStreamMap,PeerStreamType, StreamType,StreamTypeMap } from '../lib'

type LStreamTypeMap = Map<StreamType, MediaStream>

export const useMedia = (peerRoom: Ref<PeerRoom | null>) => {
    // 本地媒体状态
    const localStreamTypeMap = ref<LStreamTypeMap>(new Map())
    // 远程媒体流
    const peerStreamTypeMap = ref<Map<string, LStreamTypeMap>>(new Map())

    // 媒体状态
    const mediaState = ref({
        isAudioEnabled: false,
        isVideoEnabled: false,
        isScreenSharing: false,
        isSystemAudioEnabled: false,
    })

    // 本地流的计算属性
    const localAudioStream = computed(() => localStreamTypeMap.value.get(StreamType.MICROPHONE) || null)
    const localVideoStream = computed(() => localStreamTypeMap.value.get(StreamType.WEBCAM) || null)
    const localScreenStream = computed(() => localStreamTypeMap.value.get(StreamType.SCREEN_SHARE) || null)
    const localSystemAudioStream = computed(() => localStreamTypeMap.value.get(StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE) || null)

    // 远程流的计算属性
    const remotePeerStreams = computed(() => {
        const streams: Array<{
            peerId: string
            type: StreamType
            stream: MediaStream
            hasVideo: boolean
            hasAudio: boolean
        }> = []

        peerStreamTypeMap.value.forEach((streamTypeMap, peerId) => {
            streamTypeMap.forEach((stream, streamType) => {
                streams.push({
                    peerId,
                    type: streamType,
                    stream,
                    hasVideo: stream.getVideoTracks().length > 0,
                    hasAudio: stream.getAudioTracks().length > 0,
                })
            })
        })

        return streams
    })

    /**
     * 初始化媒体事件监听
     */
    const initializeMediaListeners = () => {
        if (!peerRoom.value) return

        // 监听对等方加入 - 重新发送当前活动的流给新 peer
        peerRoom.value.onPeerJoin(PeerHookType.STREAM, (peerId) => {
            //用 for of 遍历 localStreamTypeMap.value
            for (const [streamType, stream] of localStreamTypeMap.value.entries()) {
                console.log('[useMedia] 新 peer 加入，发送流给:', peerId, streamType, stream)
                peerRoom.value?.addStream(stream, [peerId], { type: streamType as StreamType })
            }
        })

        // 监听对等方离开
        peerRoom.value.onPeerLeave(PeerHookType.STREAM, (peerId) => {
            for (const [streamType, stream] of localStreamTypeMap.value.entries()) {
                peerRoom.value?.removeStream(stream, [peerId])
                console.log('[useMedia] 对等方离开，移除流:', peerId, streamType, stream)
            }
        })


        // 监听流事件
        peerRoom.value.onPeerStream(PeerHookType.STREAM, (stream, peerId, metadata) => {
            const streamTypeMap:LStreamTypeMap = peerStreamTypeMap.value.get(peerId) || new Map()
            streamTypeMap.set(metadata?.type as StreamType, stream)
            peerStreamTypeMap.value.set(peerId, streamTypeMap)
            console.log('[useMedia] 流已保存到 peerStreamTypeMap', peerId, streamTypeMap)
        })
        

        console.log('[useMedia] 媒体事件监听器已初始化')
    }

    const getStreamTypeMap = async (streamType: StreamType): Promise<Map<StreamType, MediaStream>> => {
        const streamTypeMap: Map<StreamType, MediaStream> = new Map()
        let stream: MediaStream | null = null
        if (streamType === StreamType.MICROPHONE) {
            console.log('[useMedia] 请求麦克风权限...')
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            })
            streamTypeMap.set(streamType, stream)
        } else if (streamType === StreamType.WEBCAM) {
            console.log('[useMedia] 请求摄像头权限...')
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
            })
            streamTypeMap.set(streamType, stream)
        } else if (streamType === StreamType.SCREEN_SHARE) {
            console.log('[useMedia] 请求屏幕共享权限...')
            // 获取屏幕共享流（包含系统音频）
            let screenStream = await navigator.mediaDevices.getDisplayMedia({
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

            StreamTypeMap[StreamType.SCREEN_SHARE]?.forEach(streamType => {
                if(streamType === StreamType.SCREEN_SHARE) {
                    stream = new MediaStream()
                    // 添加屏幕视频轨道
                    screenStream.getVideoTracks().forEach(track => {
                        stream!.addTrack(track)
                    })
                    console.log('[useMedia] 屏幕视频已包含')
                    streamTypeMap.set(StreamType.SCREEN_SHARE, stream)
                }
                if(streamType === StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE) {
                    // 添加系统音频轨道（如果有）
                    const systemAudioTracks = screenStream.getAudioTracks()
                    if (systemAudioTracks.length > 0) {
                        stream = new MediaStream()

                        systemAudioTracks.forEach(track => {
                            // Cannot modify read-only track.label, but we can still identify system audio tracks by their presence in screenStream
                            stream!.addTrack(track)
                        })
                        console.log('[useMedia] 系统音频已包含')
                        streamTypeMap.set(StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE, stream)
                    }
                }
            })

        } 

        return streamTypeMap
    }

    const openStream = async (peerStreamType: PeerStreamType, targetPeers?: string[]) : Promise<void> => {
        if (!peerRoom.value) {
            throw new Error('PeerRoom 未初始化')
        }

        try {
            // 添加到 PeerRoom
            for (const streamType of HookStreamMap[peerStreamType] as StreamType[]) {
                const streamTypeMap = await getStreamTypeMap(streamType)
                if (streamTypeMap.size > 0) {
                    for (const [streamType, stream] of streamTypeMap.entries()) {
                        if(!localStreamTypeMap.value.has(streamType)) {
                            localStreamTypeMap.value.set(streamType, stream)
                            peerRoom.value.addStream(stream, targetPeers, { type: streamType as StreamType })
                            console.log('[useMedia] 流已添加:', streamType)
                        }
                    }
                } else {
                    console.error('[useMedia] 获取流失败:', streamType)
                }
            }

            // 更新媒体状态
            updateMediaState()
        } catch (error) {
            console.error(`[useMedia] 启动${peerStreamType}失败:`, error)
            throw error
        }
    }

    const closeStream = async (peerStreamType: PeerStreamType, targetPeers?: string[]) : Promise<void> => {
        if (!peerRoom.value) {
            throw new Error('PeerRoom 未初始化')
        }

        for (const streamType of HookStreamMap[peerStreamType] as StreamType[]) {
            if(localStreamTypeMap.value.has(streamType)) {
                // 如果是屏幕共享，先处理系统音频流（如果存在）
                if(streamType === StreamType.SCREEN_SHARE){
                    const systemAudioStream = localStreamTypeMap.value.get(StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE)
                    if (systemAudioStream) {
                        peerRoom.value.removeStream(systemAudioStream, targetPeers)
                        systemAudioStream.getTracks().forEach(track => track.stop())
                        localStreamTypeMap.value.delete(StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE)
                        console.log('[useMedia] 系统音频流已停止')
                    }
                }
                
                // 处理主流
                const stream = localStreamTypeMap.value.get(streamType)
                if (stream) {
                    peerRoom.value.removeStream(stream, targetPeers)
                    stream.getTracks().forEach(track => track.stop())
                    localStreamTypeMap.value.delete(streamType)
                    console.log(`[useMedia] ${peerStreamType}已停止`)
                }
            }
        }

        // 更新媒体状态
        updateMediaState()
    }

    /**
     * 更新媒体状态
     */
    const updateMediaState = () => {
        mediaState.value.isAudioEnabled = localStreamTypeMap.value.has(StreamType.MICROPHONE)
        mediaState.value.isVideoEnabled = localStreamTypeMap.value.has(StreamType.WEBCAM)
        mediaState.value.isScreenSharing = localStreamTypeMap.value.has(StreamType.SCREEN_SHARE)
        mediaState.value.isSystemAudioEnabled = localStreamTypeMap.value.has(StreamType.SYSTEM_AUDIO_IN_SCREEN_SHARE)
    }

    /**
     * 启动音频通话（仅麦克风）
     */
    const startAudioCall = async () => {
        await openStream(PeerStreamType.AUDIO)
    }

    /**
     * 停止音频通话
     */
    const stopAudioCall = () => {
        closeStream(PeerStreamType.AUDIO)
    }

    /**
     * 启动视频通话（摄像头 + 麦克风）
     */
    const startVideoCall = async () => {
        openStream(PeerStreamType.VIDEO)
    }

    /**
     * 停止视频通话
     */
    const stopVideoCall = () => {
        closeStream(PeerStreamType.VIDEO)
    }

    /**
     * 启动屏幕共享（屏幕 + 系统音 + 麦克风）
     */
    const startScreenShare = async () => {
        openStream(PeerStreamType.SCREEN)
    }

    /**
     * 停止屏幕共享
     */
    const stopScreenShare = () => {
        closeStream(PeerStreamType.SCREEN)
    }

    /**
     * 清理所有媒体资源
     */
    const cleanup = () => {
        console.log('[useMedia] 清理所有媒体资源')

        stopAudioCall()
        stopVideoCall()
        stopScreenShare()

        peerStreamTypeMap.value.clear()
    }

    return {
        // 初始化
        initializeMediaListeners,

        // 状态
        mediaState,
        localAudioStream,
        localVideoStream,
        localScreenStream,
        localSystemAudioStream,
        remotePeerStreams,

        // 音频通话
        startAudioCall,
        stopAudioCall,

        // 视频通话
        startVideoCall,
        stopVideoCall,

        // 屏幕共享
        startScreenShare,
        stopScreenShare,

        // 清理
        cleanup,
    }
}

