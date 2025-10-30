
<template>
  <div class="app">
    <!-- 欢迎页面 -->
    <div v-if="!isInRoom" class="welcome">
      <div class="welcome-card">
        <h1>🔐 P2P 加密聊天</h1>
        <p class="subtitle">端到端加密 · 去中心化 · 零服务器存储</p>
        
        <div class="features">
          <div class="feature">
            <span class="icon">🔒</span>
            <div>
              <h3>端到端加密</h3>
              <p>消息仅在您和对方浏览器中存在</p>
            </div>
          </div>
          <div class="feature">
            <span class="icon">🌐</span>
            <div>
              <h3>点对点直连</h3>
              <p>无需中心服务器，直接 P2P 连接</p>
            </div>
          </div>
          <div class="feature">
            <span class="icon">⚡</span>
            <div>
              <h3>即时通讯</h3>
              <p>基于 WebRTC 的实时通信</p>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" @click="createRoom">
            创建新房间
          </button>
          
          <div class="divider">或</div>
          
          <div class="join-room">
            <input
              v-model="customRoomId"
              @keyup.enter="joinRoom"
              type="text"
              placeholder="输入房间 ID"
            />
            <button class="btn btn-secondary" @click="joinRoom">
              加入房间
            </button>
          </div>
        </div>

        <div class="tech-stack">
          <p>技术栈: Vue3 + TypeScript + Trystero + WebRTC</p>
        </div>
      </div>
    </div>

    <!-- 聊天室 -->
    <div v-else class="room-container">
      <ChatRoom :roomId="roomId" @leave="leaveRoom" @switch-room="switchRoom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { v4 as uuid } from 'uuid'
import ChatRoom from './pages/ChatRoom.vue'
import { getPublicRoomId } from './lib/publicRoom'

const roomId = ref('')
const isInRoom = ref(false)
const customRoomId = ref('')

// 从 URL 获取房间 ID，如果没有则自动加入公共房间
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const urlRoomId = urlParams.get('room')
  
  if (urlRoomId) {
    roomId.value = urlRoomId
    isInRoom.value = true
  } else {
    // 自动加入公共房间
    joinPublicRoom()
  }
})

// 加入公共房间
const joinPublicRoom = () => {
  const publicRoomId = getPublicRoomId()
  roomId.value = publicRoomId
  updateUrl(publicRoomId)
  isInRoom.value = true
}

// 创建新房间
const createRoom = () => {
  const newRoomId = uuid()
  roomId.value = newRoomId
  updateUrl(newRoomId)
  isInRoom.value = true
}

// 加入指定房间
const joinRoom = () => {
  if (customRoomId.value.trim()) {
    roomId.value = customRoomId.value.trim()
    updateUrl(roomId.value)
    isInRoom.value = true
  }
}

// 更新 URL
const updateUrl = (id: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('room', id)
  window.history.pushState({}, '', url.toString())
}

// 切换房间
const switchRoom = (newRoomId: string) => {
  roomId.value = newRoomId
  updateUrl(newRoomId)
  isInRoom.value = true
}

// 离开房间
const leaveRoom = () => {
  isInRoom.value = false
  roomId.value = ''
  window.history.pushState({}, '', window.location.pathname)
  // 离开房间后自动加入公共房间
  joinPublicRoom()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app {
  width: 100%;
  height: 100vh;
}

.welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.welcome-card {
  background: white;
  border-radius: 20px;
  padding: 48px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.welcome-card h1 {
  font-size: 36px;
  text-align: center;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 40px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.feature {
  display: flex;
  gap: 16px;
  align-items: start;
}

.feature .icon {
  font-size: 32px;
}

.feature h3 {
  font-size: 16px;
  margin-bottom: 4px;
  color: #333;
}

.feature p {
  font-size: 14px;
  color: #666;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.btn {
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.divider {
  text-align: center;
  color: #999;
  font-size: 14px;
}

.join-room {
  display: flex;
  gap: 10px;
}

.join-room input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.join-room input:focus {
  border-color: #667eea;
}

.tech-stack {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.tech-stack p {
  font-size: 12px;
  color: #999;
}

.room-container {
  width: 100%;
  height: 100vh;
}
</style>
