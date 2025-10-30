<template>
  <div class="inline-media">
    <div v-if="loading" class="inline-media-loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="inline-media-error">
      <span>⚠️ 加载失败</span>
    </div>

    <div v-else class="inline-media-content">
      <!-- 图片 -->
      <img
        v-if="mediaCategory === 'image' && mediaUrl"
        :src="mediaUrl"
        :alt="fileName"
        class="inline-image"
        @load="onMediaLoad"
        @error="onMediaError"
      />

      <!-- 音频 -->
      <audio
        v-else-if="mediaCategory === 'audio' && mediaUrl"
        :src="mediaUrl"
        controls
        class="inline-audio"
        @loadeddata="onMediaLoad"
        @error="onMediaError"
      >
        您的浏览器不支持音频播放
      </audio>

      <!-- 视频 -->
      <video
        v-else-if="mediaCategory === 'video' && mediaUrl"
        :src="mediaUrl"
        controls
        class="inline-video"
        @loadeddata="onMediaLoad"
        @error="onMediaError"
      >
        您的浏览器不支持视频播放
      </video>
    </div>

    <!-- 文件信息 -->
    <div class="inline-media-info">
      <span class="file-name">{{ fileName }}</span>
      <span class="file-size">{{ formattedSize }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fileTransferService } from '../services/FileTransferService'

interface Props {
  /** 文件 Blob URL 或下载 URL */
  mediaUrl?: string
  /** 文件名 */
  fileName: string
  /** 文件类型 (MIME type) */
  fileType: string
  /** 文件大小（字节） */
  fileSize: number
  /** 是否自动加载 */
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true
})

const loading = ref(true)
const error = ref(false)

const mediaCategory = computed(() => {
  return fileTransferService.getMediaCategory(props.fileType)
})

const formattedSize = computed(() => {
  return fileTransferService.formatFileSize(props.fileSize)
})

const onMediaLoad = () => {
  loading.value = false
  error.value = false
}

const onMediaError = () => {
  loading.value = false
  error.value = true
  console.error('[InlineMedia] 媒体加载失败:', props.fileName)
}

onMounted(() => {
  if (props.mediaUrl) {
    loading.value = false
  }
})

onUnmounted(() => {
  // 如果需要，可以在这里清理资源
})
</script>

<style scoped>
.inline-media {
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  margin: 8px 0;
}

.inline-media-loading,
.inline-media-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.inline-media-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.inline-image {
  max-width: 100%;
  max-height: 400px;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain;
}

.inline-audio {
  width: 100%;
  padding: 8px;
  background: #fff;
}

.inline-video {
  max-width: 100%;
  max-height: 400px;
  width: 100%;
  display: block;
}

.inline-media-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
}

.file-name {
  flex: 1;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
}

.file-size {
  color: #999;
  flex-shrink: 0;
}

.inline-media-error span {
  color: #f44336;
}
</style>

