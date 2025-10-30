<template>
  <div class="media-controls" :class="callModeClass">
    <!-- 顶部控制栏 -->
    <div v-if="isInCall" class="top-controls">
      <button 
        @click="toggleAudio" 
        :class="['control-btn', { active: media.mediaState.value.isAudioEnabled }]"
        :title="media.mediaState.value.isAudioEnabled ? '关闭麦克风' : '开启麦克风'"
      >
        <svg v-if="media.mediaState.value.isAudioEnabled" class="icon" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>

      <button 
        @click="toggleVideo" 
        :class="['control-btn', { active: media.mediaState.value.isVideoEnabled }]"
        :title="media.mediaState.value.isVideoEnabled ? '关闭摄像头' : '开启摄像头'"
      >
        <svg v-if="media.mediaState.value.isVideoEnabled" class="icon" viewBox="0 0 24 24">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
        </svg>
      </button>

      <button 
        @click="toggleScreen" 
        :class="['control-btn', { active: media.mediaState.value.isScreenSharing }]"
        :title="media.mediaState.value.isScreenSharing ? '停止屏幕共享' : '开始屏幕共享'"
      >
        <svg class="icon" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
    </div>

    <!-- 主显示区域 -->
    <div class="main-display">
      <!-- 空闲状态 -->
      <div v-if="callMode === 'idle'" class="idle-state">
        <button @click="toggleAudio" class="idle-btn" title="音频通话">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        <button @click="toggleVideo" class="idle-btn" title="视频通话">
          <svg class="icon" viewBox="0 0 24 24">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>

        <button @click="toggleScreen" class="idle-btn" title="屏幕共享">
          <svg class="icon" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </button>
      </div>

      <!-- 纯音频通话 -->
      <div v-else-if="callMode === 'audio'" class="audio-call">
        <div class="avatar-container">
          <div class="avatar-circle">
            <div class="avatar-initials">{{ userInitials }}</div>
          </div>
          <div class="user-name">{{ userName }}</div>
          <div class="call-status">音频通话中...</div>
        </div>
      </div>

      <!-- 视频通话（无屏幕共享） -->
      <div v-else-if="callMode === 'video'" class="video-call">
        <video 
          ref="localVideoRef" 
          autoplay 
          muted 
          playsinline
          class="video-stream fullscreen"
        ></video>
        <div class="video-overlay">
          <div class="user-label">你</div>
        </div>
      </div>

      <!-- 屏幕共享（无视频） -->
      <div v-else-if="callMode === 'screen'" class="screen-share">
        <video 
          ref="localScreenRef" 
          autoplay 
          muted 
          playsinline
          class="video-stream fullscreen"
        ></video>
        <div class="video-overlay">
          <div class="user-label">你的屏幕</div>
        </div>
      </div>

      <!-- 视频+屏幕共享 -->
      <div v-else-if="callMode === 'video-screen'" class="split-view">
        <div class="split-panel">
          <video 
            ref="localVideoRef" 
            autoplay 
            muted 
            playsinline
            class="video-stream"
          ></video>
          <div class="panel-label">摄像头</div>
        </div>
        <div class="split-panel">
          <video 
            ref="localScreenRef" 
            autoplay 
            muted 
            playsinline
            class="video-stream"
          ></video>
          <div class="panel-label">屏幕共享</div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div v-if="isInCall" class="bottom-controls">
      <!-- 纯音频模式 -->
      <template v-if="callMode === 'audio'">
        <button 
          @click="toggleAudio" 
          :class="['main-control-btn', 'danger', { active: !media.mediaState.value.isAudioEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
          </svg>
          <span>{{ media.mediaState.value.isAudioEnabled ? '关闭麦克风' : '开启麦克风' }}</span>
        </button>
      </template>

      <!-- 视频模式 -->
      <template v-else-if="callMode === 'video'">
        <button 
          @click="toggleAudio" 
          :class="['control-btn-bottom', { active: media.mediaState.value.isAudioEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>

        <button 
          @click="toggleVideo" 
          :class="['control-btn-bottom', 'danger', { active: !media.mediaState.value.isVideoEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
          </svg>
        </button>
      </template>

      <!-- 屏幕共享模式 -->
      <template v-else-if="callMode === 'screen'">
        <button 
          @click="toggleAudio" 
          :class="['control-btn-bottom', { active: media.mediaState.value.isAudioEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
        </button>

        <button 
          @click="toggleScreen" 
          :class="['control-btn-bottom', 'danger']"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          </svg>
        </button>
      </template>

      <!-- 视频+屏幕模式 -->
      <template v-else-if="callMode === 'video-screen'">
        <button 
          @click="toggleAudio" 
          :class="['control-btn-bottom', { active: media.mediaState.value.isAudioEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          </svg>
        </button>

        <button 
          @click="toggleVideo" 
          :class="['control-btn-bottom', { active: media.mediaState.value.isVideoEnabled }]"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>

        <button 
          @click="toggleSystemAudio" 
          :class="['control-btn-bottom', { active: media.mediaState.value.isSystemAudioEnabled }]"
          title="系统音频"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>

        <button 
          @click="toggleScreen" 
          :class="['control-btn-bottom', 'danger']"
        >
          <svg class="icon" viewBox="0 0 24 24">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { useMedia } from '../composables/useMedia'
import { getUserInitials } from '../lib/utils'

const props = defineProps<{
  media: ReturnType<typeof useMedia>
  userName?: string
}>()

const localVideoRef = ref<HTMLVideoElement | null>(null)
const localScreenRef = ref<HTMLVideoElement | null>(null)

// 用户名缩写
const userInitials = computed(() => getUserInitials(props.userName || 'User'))

// 通话模式
const callMode = computed(() => {
  const isAudio = props.media.mediaState.value.isAudioEnabled
  const isVideo = props.media.mediaState.value.isVideoEnabled
  const isScreen = props.media.mediaState.value.isScreenSharing

  if (!isAudio && !isVideo && !isScreen) return 'idle'
  if (isVideo && isScreen) return 'video-screen'
  if (isScreen) return 'screen'
  if (isVideo) return 'video'
  if (isAudio) return 'audio'
  return 'idle'
})

const callModeClass = computed(() => `mode-${callMode.value}`)
const isInCall = computed(() => callMode.value !== 'idle')

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

// 系统音频切换（暂未实现）
const toggleSystemAudio = () => {
  alert('系统音频控制功能开发中...')
}

// 监听本地视频流变化
watch(() => props.media.localVideoStream.value, async (stream) => {
  await nextTick()
  if (stream && localVideoRef.value) {
    localVideoRef.value.srcObject = stream
  }
})

// 监听本地屏幕流变化
watch(() => props.media.localScreenStream.value, async (stream) => {
  await nextTick()
  if (stream && localScreenRef.value) {
    localScreenRef.value.srcObject = stream
  }
})
</script>

<style scoped>
.media-controls {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: white;
  position: relative;
  overflow: hidden;
}

/* 顶部控制栏 */
.top-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
  z-index: 10;
}

.control-btn {
  width: 48px;
  height: 48px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}

.control-btn.active {
  background: rgba(102, 126, 234, 0.8);
  border-color: rgba(102, 126, 234, 1);
}

.control-btn .icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 主显示区域 */
.main-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 空闲状态 */
.idle-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.idle-btn {
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.idle-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.15);
}

.idle-btn:nth-child(1) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.idle-btn:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.idle-btn:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.idle-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.idle-btn .icon {
  width: 32px;
  height: 32px;
  fill: none;
  stroke: white;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 音频通话 */
.audio-call {
  text-align: center;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.avatar-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 8px 48px rgba(102, 126, 234, 0.6);
  }
}

.avatar-initials {
  font-size: 64px;
  font-weight: 700;
  color: white;
}

.user-name {
  font-size: 24px;
  font-weight: 600;
}

.call-status {
  color: rgba(255,255,255,0.6);
  font-size: 16px;
}

/* 视频通话 */
.video-call, .screen-share {
  width: 100%;
  height: 100%;
  position: relative;
}

.video-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.video-stream.fullscreen {
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.user-label {
  padding: 8px 16px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

/* 分屏视图 */
.split-view {
  display: grid;
  grid-template-rows: 1fr 1fr;  /* 上下分屏 */
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 8px;
}

.split-panel {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.split-panel .video-stream {
  width: 100%;
  height: 100%;
}

.panel-label {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

/* 底部控制栏 */
.bottom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
  z-index: 10;
}

.control-btn-bottom {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn-bottom:hover {
  background: rgba(255,255,255,0.25);
  transform: scale(1.1);
}

.control-btn-bottom.active {
  background: rgba(102, 126, 234, 0.8);
}

.control-btn-bottom.danger {
  background: rgba(239, 68, 68, 0.8);
}

.control-btn-bottom.danger:hover {
  background: rgba(239, 68, 68, 1);
}

.control-btn-bottom .icon {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.main-control-btn {
  padding: 16px 32px;
  border: none;
  border-radius: 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.8);
  color: white;
}

.main-control-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: translateY(-2px);
}

.main-control-btn .icon {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

</style>
