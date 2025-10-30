<template>
  <div class="user-grid-container">
    <h3 class="grid-title">在线成员 ({{ totalUsers }})</h3>
    
    <div class="user-grid" :class="{ 'has-expanded': expandedCardId !== null }">
      <!-- 自己的卡片 -->
      <UserGridCard
        :class="getCardClass('local-main')"
        :username="`${currentUsername} (你)`"
        :user-id="currentUserId"
        :audio-enabled="mediaState.isAudioEnabled"
        :video-enabled="mediaState.isVideoEnabled"
        :video-stream="localVideoStream"
        :is-local="true"
        :is-expanded="expandedCardId === 'local-main'"
        @toggle-expand="handleToggleExpand('local-main')"
      />

      <!-- 自己的屏幕共享卡片 -->
      <UserGridCard
        v-if="localScreenStream"
        :class="getCardClass('local-screen')"
        :username="`${currentUsername} (你)`"
        :user-id="currentUserId"
        :audio-enabled="false"
        :video-enabled="false"
        :video-stream="localScreenStream"
        :is-screen-share="true"
        :is-local="true"
        :is-expanded="expandedCardId === 'local-screen'"
        @toggle-expand="handleToggleExpand('local-screen')"
      />

      <!-- 其他用户的卡片 -->
      <template v-for="peer in peers" :key="peer.peerId">
        <!-- 用户主卡片（显示摄像头流） -->
        <UserGridCard
          :class="getCardClass(`peer-${peer.peerId}-main`)"
          :username="peer.username"
          :user-id="peer.userId"
          :audio-enabled="getPeerAudioEnabled(peer.peerId)"
          :video-enabled="getPeerVideoEnabled(peer.peerId)"
          :video-stream="getPeerVideoStream(peer.peerId)"
          :is-local="false"
          :is-expanded="expandedCardId === `peer-${peer.peerId}-main`"
          @toggle-audio="handleToggleAudio(peer.peerId)"
          @toggle-video="handleToggleVideo(peer.peerId)"
          @toggle-expand="handleToggleExpand(`peer-${peer.peerId}-main`)"
        />

        <!-- 用户的屏幕共享卡片 -->
        <UserGridCard
          v-if="getPeerScreenStream(peer.peerId)"
          :class="getCardClass(`peer-${peer.peerId}-screen`)"
          :username="peer.username"
          :user-id="peer.userId"
          :audio-enabled="false"
          :video-enabled="false"
          :video-stream="getPeerScreenStream(peer.peerId)"
          :is-screen-share="true"
          :is-local="false"
          :is-expanded="expandedCardId === `peer-${peer.peerId}-screen`"
          @toggle-expand="handleToggleExpand(`peer-${peer.peerId}-screen`)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import UserGridCard from './UserGridCard.vue'
import { StreamType } from '../lib/types'
import type { useMedia } from '../composables/useMedia'

interface Peer {
  peerId: string
  userId: string
  username: string
  [key: string]: any
}

const props = defineProps<{
  media: ReturnType<typeof useMedia>
  peers: Peer[]
  currentUserId: string
  currentUsername: string
}>()

// 每个 peer 的本地控制状态
const peerControls = ref<Map<string, { audioMuted: boolean; videoHidden: boolean }>>(new Map())

// 当前放大的卡片ID
const expandedCardId = ref<string | null>(null)

// 获取或初始化 peer 的控制状态
const getPeerControl = (peerId: string) => {
  if (!peerControls.value.has(peerId)) {
    peerControls.value.set(peerId, { audioMuted: false, videoHidden: false })
  }
  return peerControls.value.get(peerId)!
}

// 媒体状态
const mediaState = computed(() => props.media.mediaState.value)
const localVideoStream = computed(() => props.media.localVideoStream.value)
const localScreenStream = computed(() => props.media.localScreenStream.value)
const remotePeerStreams = computed(() => props.media.remotePeerStreams.value)

// 计算总用户数（包括屏幕共享卡片）
const totalUsers = computed(() => {
  let count = 1 // 自己
  if (localScreenStream.value) count++ // 自己的屏幕共享
  
  count += props.peers.length // 其他用户
  
  // 其他用户的屏幕共享
  props.peers.forEach(peer => {
    if (getPeerScreenStream(peer.peerId)) {
      count++
    }
  })
  
  return count
})

// 获取 peer 的音频状态（考虑本地静音）
const getPeerAudioEnabled = (peerId: string): boolean => {
  const control = getPeerControl(peerId)
  if (control.audioMuted) return false
  
  return remotePeerStreams.value.some(
    s => s.peerId === peerId && s.hasAudio && s.type === StreamType.MICROPHONE
  )
}

// 获取 peer 的视频状态（考虑本地隐藏）
const getPeerVideoEnabled = (peerId: string): boolean => {
  const control = getPeerControl(peerId)
  if (control.videoHidden) return false
  
  return remotePeerStreams.value.some(
    s => s.peerId === peerId && s.hasVideo && s.type === StreamType.WEBCAM
  )
}

// 获取 peer 的摄像头视频流（考虑本地隐藏）
const getPeerVideoStream = (peerId: string): MediaStream | null => {
  const control = getPeerControl(peerId)
  if (control.videoHidden) return null
  
  const stream = remotePeerStreams.value.find(
    s => s.peerId === peerId && s.type === StreamType.WEBCAM && s.hasVideo
  )
  return stream?.stream || null
}

// 获取 peer 的屏幕共享流
const getPeerScreenStream = (peerId: string): MediaStream | null => {
  const stream = remotePeerStreams.value.find(
    s => s.peerId === peerId && s.type === StreamType.SCREEN_SHARE && s.hasVideo
  )
  return stream?.stream || null
}

// 处理切换音频
const handleToggleAudio = (peerId: string) => {
  const control = getPeerControl(peerId)
  control.audioMuted = !control.audioMuted
  
  // 找到对应的音频流并静音/取消静音
  const audioStream = remotePeerStreams.value.find(
    s => s.peerId === peerId && s.type === StreamType.MICROPHONE
  )
  
  if (audioStream && audioStream.stream) {
    audioStream.stream.getAudioTracks().forEach(track => {
      track.enabled = !control.audioMuted
    })
  }
  
  console.log(`[UserGrid] ${control.audioMuted ? '静音' : '取消静音'}用户:`, peerId)
}

// 处理切换视频
const handleToggleVideo = (peerId: string) => {
  const control = getPeerControl(peerId)
  control.videoHidden = !control.videoHidden
  
  console.log(`[UserGrid] ${control.videoHidden ? '隐藏' : '显示'}视频:`, peerId)
}

// 处理切换放大
const handleToggleExpand = (cardId: string) => {
  if (expandedCardId.value === cardId) {
    expandedCardId.value = null
  } else {
    expandedCardId.value = cardId
  }
  console.log('[UserGrid] 切换放大卡片:', cardId, expandedCardId.value)
}

// 获取卡片的CSS类
const getCardClass = (cardId: string) => {
  if (expandedCardId.value === null) return ''
  if (expandedCardId.value === cardId) return 'card-expanded'
  return 'card-collapsed'
}
</script>

<style scoped>
.user-grid-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  overflow: hidden;
}

.grid-title {
  margin: 0;
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.user-grid {
  flex: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  overflow-y: auto;
  align-content: start;
  transition: all 0.3s ease;
}

/* 有放大卡片时的布局 */
.user-grid.has-expanded {
  display: flex;
  flex-direction: row;
  gap: 12px;
  padding: 12px;
}

/* 放大的卡片 */
.user-grid.has-expanded .card-expanded {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.user-grid.has-expanded .card-expanded .avatar-container {
  aspect-ratio: 16/9 !important;
}

/* 折叠的卡片容器 */
.user-grid.has-expanded .card-collapsed {
  width: 150px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* 折叠卡片的第一个元素（创建垂直布局容器） */
.user-grid.has-expanded .card-collapsed:first-of-type {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 150px;
}

/* 当有多个折叠卡片时，将它们放在右侧垂直排列 */
.user-grid.has-expanded::after {
  content: '';
  display: none;
}

@supports (display: grid) {
  .user-grid.has-expanded {
    display: grid;
    grid-template-columns: 1fr 150px;
    grid-template-rows: auto;
    gap: 12px;
  }
  
  .user-grid.has-expanded .card-expanded {
    grid-column: 1;
    grid-row: 1 / -1;
  }
  
  .user-grid.has-expanded .card-collapsed {
    grid-column: 2;
    width: 100%;
  }
}

/* 滚动条样式 */
.user-grid::-webkit-scrollbar {
  width: 8px;
}

.user-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.user-grid::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.user-grid::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

