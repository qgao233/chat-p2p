<template>
  <div class="user-grid-container">
    <h3 class="grid-title">在线成员 ({{ totalUsers }})</h3>
    
    <div class="user-grid">
      <!-- 自己的卡片 -->
      <UserGridCard
        :username="`${currentUsername} (你)`"
        :user-id="currentUserId"
        :audio-enabled="mediaState.isAudioEnabled"
        :video-enabled="mediaState.isVideoEnabled"
        :video-stream="localVideoStream"
        :is-local="true"
      />

      <!-- 自己的屏幕共享卡片 -->
      <UserGridCard
        v-if="localScreenStream"
        :username="`${currentUsername} (你)`"
        :user-id="currentUserId"
        :audio-enabled="false"
        :video-enabled="false"
        :video-stream="localScreenStream"
        :is-screen-share="true"
        :is-local="true"
      />

      <!-- 其他用户的卡片 -->
      <template v-for="peer in peers" :key="peer.peerId">
        <!-- 用户主卡片（显示摄像头流） -->
        <UserGridCard
          :username="peer.username"
          :user-id="peer.userId"
          :audio-enabled="getPeerAudioEnabled(peer.peerId)"
          :video-enabled="getPeerVideoEnabled(peer.peerId)"
          :video-stream="getPeerVideoStream(peer.peerId)"
          :is-local="false"
        />

        <!-- 用户的屏幕共享卡片 -->
        <UserGridCard
          v-if="getPeerScreenStream(peer.peerId)"
          :username="peer.username"
          :user-id="peer.userId"
          :audio-enabled="false"
          :video-enabled="false"
          :video-stream="getPeerScreenStream(peer.peerId)"
          :is-screen-share="true"
          :is-local="false"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

// 获取 peer 的音频状态
const getPeerAudioEnabled = (peerId: string): boolean => {
  return remotePeerStreams.value.some(
    s => s.peerId === peerId && s.hasAudio && s.type === StreamType.MICROPHONE
  )
}

// 获取 peer 的视频状态
const getPeerVideoEnabled = (peerId: string): boolean => {
  return remotePeerStreams.value.some(
    s => s.peerId === peerId && s.hasVideo && s.type === StreamType.WEBCAM
  )
}

// 获取 peer 的摄像头视频流
const getPeerVideoStream = (peerId: string): MediaStream | null => {
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

