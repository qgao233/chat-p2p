<template>
  <div class="user-grid-card" :class="{ 'is-screen-share': isScreenShare, 'is-local': isLocal }">
    <!-- 头像/视频容器 -->
    <div class="avatar-container">
      <!-- 视频流显示 -->
      <video
        v-if="videoStream"
        ref="videoRef"
        autoplay
        :muted="isLocal"
        playsinline
        class="video-stream"
      ></video>
      
      <!-- 无视频时显示头像或名称缩写 -->
      <div v-else class="avatar-placeholder">
        <div v-if="avatarUrl" class="avatar-image" :style="{ backgroundImage: `url(${avatarUrl})` }"></div>
        <div v-else class="avatar-initials">{{ initials }}</div>
      </div>

      <!-- 屏幕共享标识 -->
      <div v-if="isScreenShare" class="screen-share-badge">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>屏幕共享</span>
      </div>

      <!-- 右下角图标组 -->
      <div v-if="!isScreenShare" class="icon-group">
        <!-- 音频图标 -->
        <div 
          class="icon-badge" 
          :class="{ 'icon-active': audioEnabled, 'icon-muted': !audioEnabled }"
          :title="audioEnabled ? '音频已开启' : '音频已静音'"
        >
          <svg v-if="audioEnabled" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>
        
        <!-- 视频图标 -->
        <div 
          class="icon-badge" 
          :class="{ 'icon-active': videoEnabled, 'icon-muted': !videoEnabled }"
          :title="videoEnabled ? '视频已开启' : '视频已关闭'"
        >
          <svg v-if="videoEnabled" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- 用户名称 -->
    <div class="user-name" :title="username">{{ displayName }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
  username: string
  userId: string
  avatarUrl?: string
  audioEnabled?: boolean
  videoEnabled?: boolean
  videoStream?: MediaStream | null
  isScreenShare?: boolean
  isLocal?: boolean
  maxNameLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: '',
  audioEnabled: false,
  videoEnabled: false,
  videoStream: null,
  isScreenShare: false,
  isLocal: false,
  maxNameLength: 12
})

const videoRef = ref<HTMLVideoElement | null>(null)

// 计算名称缩写
const initials = computed(() => {
  if (!props.username) return '?'
  
  const name = props.username.trim()
  
  // 如果是中文，取前两个字
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.slice(0, 2)
  }
  
  // 如果是英文，取首字母（最多两个单词）
  const words = name.split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  
  return name.slice(0, 2).toUpperCase()
})

// 显示名称（带长度限制）
const displayName = computed(() => {
  if (props.username.length <= props.maxNameLength) {
    return props.username
  }
  return props.username.slice(0, props.maxNameLength) + '...'
})

// 监听视频流变化
watch(() => props.videoStream, async (stream) => {
  await nextTick()
  if (stream && videoRef.value) {
    videoRef.value.srcObject = stream
    console.log('[UserGridCard] 视频流已设置:', props.username, props.isScreenShare ? '屏幕共享' : '摄像头')
  } else if (!stream && videoRef.value) {
    videoRef.value.srcObject = null
  }
}, { immediate: true })
</script>

<style scoped>
.user-grid-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}

.user-grid-card:hover {
  transform: translateY(-2px);
}

.avatar-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.avatar-container:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* 屏幕共享卡片样式 */
.user-grid-card.is-screen-share .avatar-container {
  aspect-ratio: 16/9;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: 2px solid #f5576c;
}

/* 本地卡片样式 */
.user-grid-card.is-local .avatar-container {
  border: 2px solid #667eea;
}

.video-stream {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}

.avatar-initials {
  font-size: 28px;
  font-weight: 600;
  color: white;
  user-select: none;
}

/* 屏幕共享标识 */
.screen-share-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(245, 87, 108, 0.95);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.screen-share-badge .icon {
  width: 12px;
  height: 12px;
}

/* 图标组 */
.icon-group {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 4px;
}

.icon-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}

.icon-badge.icon-active {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.icon-badge.icon-muted {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

.icon-badge .icon {
  width: 14px;
  height: 14px;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

/* 屏幕共享卡片的名称样式 */
.user-grid-card.is-screen-share .user-name {
  color: #f5576c;
  font-weight: 600;
}
</style>

