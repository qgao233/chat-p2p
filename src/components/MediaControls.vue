<template>
  <div class="media-controls-compact">
    <!-- 媒体控制按钮 -->
    <div class="control-buttons-vertical">
      <button 
        @click="toggleAudio" 
        :class="['media-btn', { active: media.mediaState.value.isAudioEnabled }]"
        :title="media.mediaState.value.isAudioEnabled ? '停止音频通话' : '开始音频通话'"
      >
        {{ media.mediaState.value.isAudioEnabled ? '🎤' : '🔇' }}
      </button>

      <button 
        @click="toggleVideo" 
        :class="['media-btn', { active: media.mediaState.value.isVideoEnabled }]"
        :title="media.mediaState.value.isVideoEnabled ? '停止视频通话' : '开始视频通话'"
      >
        {{ media.mediaState.value.isVideoEnabled ? '📹' : '📷' }}
      </button>

      <button 
        @click="toggleScreen" 
        :class="['media-btn', { active: media.mediaState.value.isScreenSharing }]"
        :title="media.mediaState.value.isScreenSharing ? '停止屏幕共享' : '开始屏幕共享'"
      >
        {{ media.mediaState.value.isScreenSharing ? '🖥️' : '💻' }}
      </button>
    </div>

    <!-- 媒体流显示区域 -->
    <div v-if="hasActiveMedia" class="media-streams">
      <!-- 本地视频预览 -->
      <div v-if="media.localVideoStream.value" class="stream-preview">
        <div class="stream-label">本地视频</div>
        <video 
          ref="localVideoRef" 
          autoplay 
          muted 
          playsinline
          class="preview-video"
        ></video>
      </div>

      <!-- 本地屏幕共享预览 -->
      <div v-if="media.localScreenStream.value" class="stream-preview">
        <div class="stream-label">屏幕共享</div>
        <video 
          ref="localScreenRef" 
          autoplay 
          muted 
          playsinline
          class="preview-video"
        ></video>
      </div>

      <!-- 远程流 -->
      <div 
        v-for="peerStream in media.remotePeerStreams.value" 
        :key="`${peerStream.peerId}-${peerStream.type}`"
        class="stream-preview"
      >
        <div class="stream-label">
          {{ peerStream.peerId.slice(0, 8) }} - {{ getStreamTypeLabel(peerStream.type) }}
        </div>
        
        <!-- 视频/屏幕显示 -->
        <video 
          v-if="peerStream.hasVideo"
          :ref="el => setRemoteVideoRef(el, peerStream.peerId, peerStream.type)"
          autoplay 
          playsinline
          class="preview-video"
        ></video>
        
        <!-- 仅音频显示 -->
        <audio 
          v-else-if="peerStream.hasAudio"
          :ref="el => setRemoteAudioRef(el, peerStream.peerId)"
          autoplay
        ></audio>
        
        <div v-if="!peerStream.hasVideo && peerStream.hasAudio" class="audio-only">
          <span class="audio-icon">🎵</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { useMedia } from '../composables/useMedia'

const props = defineProps<{
  media: ReturnType<typeof useMedia>
}>()

const localVideoRef = ref<HTMLVideoElement | null>(null)
const localScreenRef = ref<HTMLVideoElement | null>(null)
const remoteVideoRefs = new Map<string, HTMLVideoElement>()
const remoteAudioRefs = new Map<string, HTMLAudioElement>()

// 计算是否有活动的媒体
const hasActiveMedia = computed(() => {
  return props.media.mediaState.value.isAudioEnabled || 
         props.media.mediaState.value.isVideoEnabled || 
         props.media.mediaState.value.isScreenSharing ||
         props.media.remotePeerStreams.value.length > 0
})

// 音频通话切换
const toggleAudio = async () => {
  try {
    if (props.media.mediaState.value.isAudioEnabled) {
      props.media.stopAudioCall()
    } else {
      await props.media.startAudioCall()
    }
  } catch (error) {
    console.error('音频切换失败:', error)
    alert('无法访问麦克风，请检查权限设置')
  }
}

// 视频通话切换
const toggleVideo = async () => {
  try {
    if (props.media.mediaState.value.isVideoEnabled) {
      props.media.stopVideoCall()
    } else {
      await props.media.startVideoCall()
    }
  } catch (error) {
    console.error('视频切换失败:', error)
    alert('无法访问摄像头/麦克风，请检查权限设置')
  }
}

// 屏幕共享切换
const toggleScreen = async () => {
  try {
    if (props.media.mediaState.value.isScreenSharing) {
      props.media.stopScreenShare()
    } else {
      await props.media.startScreenShare()
    }
  } catch (error) {
    console.error('屏幕共享切换失败:', error)
    alert('无法启动屏幕共享')
  }
}

// 获取流类型标签
const getStreamTypeLabel = (type: any): string => {
  const labels: Record<string, string> = {
    'AUDIO': '音频',
    'VIDEO': '视频',
    'SCREEN': '屏幕'
  }
  return labels[type] || '未知'
}

// 设置远程视频引用
const setRemoteVideoRef = (el: any, peerId: string, type: any) => {
  if (el) {
    const key = `${peerId}-${type}`
    remoteVideoRefs.set(key, el as HTMLVideoElement)
  }
}

// 设置远程音频引用
const setRemoteAudioRef = (el: any, peerId: string) => {
  if (el) {
    remoteAudioRefs.set(peerId, el as HTMLAudioElement)
  }
}

// 监听本地视频流变化
watch(() => props.media.localVideoStream.value, async (stream) => {
  await nextTick()
  if (stream && localVideoRef.value) {
    localVideoRef.value.srcObject = stream
    console.log('[MediaControls] 本地视频流已设置')
  }
})

// 监听本地屏幕流变化
watch(() => props.media.localScreenStream.value, async (stream) => {
  await nextTick()
  if (stream && localScreenRef.value) {
    localScreenRef.value.srcObject = stream
    console.log('[MediaControls] 本地屏幕流已设置')
  }
})

// 监听远程流变化
watch(() => props.media.remotePeerStreams.value, async (streams) => {
  await nextTick()
  streams.forEach(peerStream => {
    if (peerStream.hasVideo) {
      const key = `${peerStream.peerId}-${peerStream.type}`
      const videoEl = remoteVideoRefs.get(key)
      if (videoEl && videoEl.srcObject !== peerStream.stream) {
        videoEl.srcObject = peerStream.stream
        // 确保视频播放
        videoEl.play().catch(err => {
          console.warn(`[MediaControls] 视频自动播放失败: ${key}`, err)
        })
        console.log(`[MediaControls] 设置远程视频流: ${key}`)
      }
    } else if (peerStream.hasAudio) {
      const audioEl = remoteAudioRefs.get(peerStream.peerId)
      if (audioEl && audioEl.srcObject !== peerStream.stream) {
        audioEl.srcObject = peerStream.stream
        // 确保音频播放
        audioEl.play().catch(err => {
          console.warn(`[MediaControls] 音频自动播放失败: ${peerStream.peerId}`, err)
        })
        console.log(`[MediaControls] 设置远程音频流: ${peerStream.peerId}`)
      }
    }
  })
}, { deep: true, immediate: true })
</script>

<style scoped>
.media-controls-compact {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.control-buttons-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
  align-items: center;
  flex-shrink: 0;
}

.media-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: #f5f5f5;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.media-btn:hover {
  transform: scale(1.3);
  background: #e8e8e8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.media-btn.active {
  background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
  border: 2px solid #667eea;
}

.media-btn.active:hover {
  background: linear-gradient(135deg, #667eea33 0%, #764ba233 100%);
}

.media-streams {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stream-preview {
  background: #f8f8f8;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stream-label {
  padding: 6px 8px;
  background: rgba(102, 126, 234, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: #667eea;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-video {
  width: 100%;
  display: block;
  background: #000;
  aspect-ratio: 4/3;
  object-fit: contain;
}

.audio-only {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea11 0%, #764ba211 100%);
}

.audio-icon {
  font-size: 32px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}
</style>

