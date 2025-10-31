<template>
  <div class="chat-room">
    <!-- 头部 -->
    <div class="chat-header">
      <h2>🔐 {{ isPublicRoom ? '公共聊天室' : 'P2P 聊天室' }}</h2>
      <div class="room-info">
        <span class="room-id" :title="roomId">
          {{ isPublicRoom ? `${currentDomain} 公共房间` : `房间: ${roomId.slice(0, 8)}...` }}
        </span>
        <span class="online-count">在线: {{ peers.length + 1 }}</span>
        <button class="username-display" @click="showUsernameDialog = true" title="点击修改用户名">
          👤 {{ currentUsername }}
        </button>
      </div>
      <div class="header-actions">
        <button class="btn-icon" @click="showCreateJoinDialog = true" title="创建/加入房间">
          ➕
        </button>
        <button v-if="!isPublicRoom" class="btn-icon btn-public" @click="backToPublicRoom" title="回到公共房间">
          🏠
        </button>
        <button class="btn-icon" @click="copyRoomLink" title="复制房间号">
          📋
        </button>
      </div>
    </div>

    <!-- 复制成功提示 -->
    <Transition name="toast">
      <div v-if="showCopyToast" class="toast">
        ✅ 房间号已复制到剪贴板
      </div>
    </Transition>

    <!-- 创建/加入房间对话框 -->
    <div v-if="showCreateJoinDialog" class="dialog-overlay" @click="showCreateJoinDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>创建或加入房间</h3>
        <div class="dialog-tabs">
          <button 
            :class="['tab', { active: dialogTab === 'create' }]" 
            @click="dialogTab = 'create'"
          >
            创建新房间
          </button>
          <button 
            :class="['tab', { active: dialogTab === 'join' }]" 
            @click="dialogTab = 'join'"
          >
            加入房间
          </button>
        </div>
        
        <div v-if="dialogTab === 'create'" class="tab-content">
          <p class="hint">创建一个新的私密房间，只有知道房间号的人才能加入</p>
          <button class="btn-primary full-width" @click="handleCreateRoom">
            🎲 创建随机房间
          </button>
        </div>
        
        <div v-else class="tab-content">
          <p class="hint">输入房间号加入已有的房间</p>
          <input
            v-model="joinRoomId"
            type="text"
            placeholder="输入房间 ID"
            @keyup.enter="handleJoinRoom"
            ref="joinRoomInput"
          />
          <button 
            class="btn-primary full-width" 
            @click="handleJoinRoom" 
            :disabled="!joinRoomId.trim()"
          >
            加入房间
          </button>
        </div>
        
        <div class="dialog-actions">
          <button class="btn-secondary" @click="showCreateJoinDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 修改用户名对话框 -->
    <div v-if="showUsernameDialog" class="dialog-overlay" @click="showUsernameDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>修改用户名</h3>
        <input
          v-model="newUsername"
          type="text"
          placeholder="输入新用户名"
          maxlength="20"
          @keyup.enter="handleUpdateUsername"
          ref="usernameInput"
        />
        <div class="dialog-actions">
          <button class="btn-secondary" @click="showUsernameDialog = false">取消</button>
          <button class="btn-primary" @click="handleUpdateUsername" :disabled="!newUsername.trim()">
            确定
          </button>
        </div>
      </div>
    </div>

    <!-- 网格布局内容区 -->
    <div class="chat-content">
      <GridLayout 
        :rows="1" 
        :columns="3" 
        :gap="0"
        :default-column-ratios="[0.2, 0.75, 0.05]"
      >
        <!-- cell-0: 左侧边栏 - 用户网格 (25%) -->
        <template #cell-0>
          <UserGrid
            :media="media"
            :peers="peers"
            :current-user-id="currentUserId"
            :current-username="currentUsername"
          />
        </template>

        <!-- cell-1: 中间内容区 - 消息列表 (50%) -->
        <template #cell-1>
          <MessagePanel
            :messages="messages"
            :shared-files="sharedFiles"
            :current-user-id="currentUserId"
            :is-connected="isConnected"
            @send-message="handleSendMessage"
            @send-file="handleSendFile"
            @download-file="handleFileDownload"
          />
        </template>

        <!-- cell-2: 右侧边栏 - 媒体控制 (25%) -->
        <template #cell-2>
          <MediaControls :media="media" :user-name="currentUsername" />
        </template>
      </GridLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { useRoom } from '../composables/useRoom'
import MediaControls from '../components/MediaControls.vue'
import GridLayout from '../components/GridLayout.vue'
import UserGrid from '../components/UserGrid.vue'
import MessagePanel from '../components/MessagePanel.vue'
import { isPublicRoom as checkIsPublicRoom, getCurrentDomainDisplay, getPublicRoomId } from '../lib/publicRoom'

const props = defineProps<{
  roomId: string
}>()

const emit = defineEmits<{
  switchRoom: [roomId: string]
}>()

const {
  messages,
  peers,
  currentUserId,
  currentUsername,
  isConnected,
  joinRoom,
  sendChatMessage,
  updateUsername,
  leaveRoom,
  media,
  sharedFiles,
  sendFile,
  downloadFile,
} = useRoom(props.roomId)

const showUsernameDialog = ref(false)
const newUsername = ref('')
const usernameInput = ref<HTMLInputElement | null>(null)
const showCopyToast = ref(false)
const showCreateJoinDialog = ref(false)
const dialogTab = ref<'create' | 'join'>('create')
const joinRoomId = ref('')
const joinRoomInput = ref<HTMLInputElement | null>(null)

// 计算属性：是否是公共房间
const isPublicRoom = computed(() => checkIsPublicRoom(props.roomId))

// 计算属性：当前域名
const currentDomain = computed(() => getCurrentDomainDisplay())

// 组件挂载时加入房间
onMounted(() => {
  console.log('[ChatRoom] 组件已挂载，加入房间')
  joinRoom()
})

// 组件卸载前离开房间
onBeforeUnmount(async () => {
  console.log('[ChatRoom] 组件即将卸载，离开房间')
  await leaveRoom()
})

// 发送消息
const handleSendMessage = (text: string) => {
  sendChatMessage(text)
}

// 发送文件
const handleSendFile = async (file: File) => {
  try {
    await sendFile(file)
  } catch (error) {
    console.error('[ChatRoom] 文件发送失败:', error)
    alert('文件发送失败，请重试')
  }
}

// 处理文件下载
const handleFileDownload = async (fileId: string) => {
  try {
    await downloadFile(fileId)
  } catch (error) {
    console.error('[ChatRoom] 文件下载失败:', error)
    alert('文件下载失败，请重试')
  }
}

// 复制房间号
const copyRoomLink = async () => {
  try {
    await navigator.clipboard.writeText(props.roomId)
    showCopyToast.value = true
    setTimeout(() => {
      showCopyToast.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 修改用户名
const handleUpdateUsername = async () => {
  const trimmedUsername = newUsername.value.trim()
  if (!trimmedUsername) return

  try {
    await updateUsername(trimmedUsername)
    showUsernameDialog.value = false
    newUsername.value = ''
  } catch (error) {
    console.error('修改用户名失败:', error)
    alert('修改用户名失败，请重试')
  }
}

// 创建新房间
const handleCreateRoom = async () => {
  const newRoomId = uuid()
  showCreateJoinDialog.value = false
  await leaveRoom()
  emit('switchRoom', newRoomId)
}

// 加入房间
const handleJoinRoom = async () => {
  const trimmedRoomId = joinRoomId.value.trim()
  if (!trimmedRoomId) return
  
  showCreateJoinDialog.value = false
  joinRoomId.value = ''
  await leaveRoom()
  emit('switchRoom', trimmedRoomId)
}

// 回到公共房间
const backToPublicRoom = async () => {
  const publicRoomId = getPublicRoomId()
  await leaveRoom()
  emit('switchRoom', publicRoomId)
}

// 监听用户名对话框显示，自动聚焦输入框
watch(showUsernameDialog, async (show) => {
  if (show) {
    newUsername.value = currentUsername.value
    await nextTick()
    usernameInput.value?.focus()
    usernameInput.value?.select()
  }
})

// 监听创建/加入房间对话框显示
watch(showCreateJoinDialog, async (show) => {
  if (show) {
    dialogTab.value = 'create'
    joinRoomId.value = ''
  }
})

// 监听对话框标签切换
watch(dialogTab, async (tab) => {
  if (tab === 'join') {
    await nextTick()
    joinRoomInput.value?.focus()
  }
})
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.chat-header {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 20px;
  z-index: 10;
}

.chat-header h2 {
  margin: 0;
  font-size: 20px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-icon {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.3);
}

.btn-public:hover {
  background: rgba(52, 199, 89, 0.3);
}

.room-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  align-items: center;
}

.room-id {
  opacity: 0.9;
}

.online-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

.username-display {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.username-display:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-content h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
}

.dialog-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab:hover {
  color: #667eea;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.full-width {
  width: 100%;
}

.dialog-content input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.dialog-content input:focus {
  border-color: #667eea;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

/* Toast 提示样式 */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Toast 动画 */
.toast-enter-active {
  animation: toastIn 0.3s ease;
}

.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>

