<template>
  <button
    class="download-file-button"
    :class="{ downloading: isDownloading }"
    :disabled="isDownloading"
    @click="handleDownload"
    :title="buttonTitle"
  >
    <div v-if="isDownloading" class="download-progress">
      <svg class="progress-ring" width="24" height="24">
        <circle
          class="progress-ring-circle"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="progressOffset"
          stroke-width="3"
          fill="transparent"
          r="10"
          cx="12"
          cy="12"
        />
      </svg>
      <span class="progress-text">{{ Math.round(downloadProgress) }}%</span>
    </div>
    <div v-else class="download-icon">
      <span>⬇️</span>
      <span class="download-label">下载</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  /** 文件 ID */
  fileId: string
  /** 文件名 */
  fileName: string
  /** 按钮标题 */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '下载文件'
})

const emit = defineEmits<{
  download: [fileId: string]
}>()

const isDownloading = ref(false)
const downloadProgress = ref(0)

// 进度环相关计算
const radius = 10
const circumference = 2 * Math.PI * radius

const progressOffset = computed(() => {
  const progress = downloadProgress.value
  return circumference - (progress / 100) * circumference
})

const buttonTitle = computed(() => {
  if (isDownloading.value) {
    return `下载中... ${Math.round(downloadProgress.value)}%`
  }
  return props.title || `下载 ${props.fileName}`
})

const handleDownload = async () => {
  if (isDownloading.value) return

  try {
    isDownloading.value = true
    downloadProgress.value = 0

    // 模拟下载进度（实际应该从真实的下载事件中获取）
    const progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += 10
      }
    }, 200)

    // 触发下载事件
    emit('download', props.fileId)

    // 等待一段时间完成
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    clearInterval(progressInterval)
    downloadProgress.value = 100

    // 重置状态
    setTimeout(() => {
      isDownloading.value = false
      downloadProgress.value = 0
    }, 500)
  } catch (error) {
    console.error('[DownloadFileButton] 下载失败:', error)
    isDownloading.value = false
    downloadProgress.value = 0
  }
}

// 暴露方法供父组件调用
defineExpose({
  startDownload: handleDownload,
  updateProgress: (progress: number) => {
    downloadProgress.value = progress
  }
})
</script>

<style scoped>
.download-file-button {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 80px;
  min-height: 36px;
}

.download-file-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.download-file-button:active:not(:disabled) {
  transform: translateY(0);
}

.download-file-button:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.download-file-button.downloading {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.download-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}

.download-label {
  font-size: 14px;
}

.download-progress {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  transform: rotate(-90deg);
}

.progress-ring-circle {
  stroke: white;
  transition: stroke-dashoffset 0.3s ease;
}

.progress-text {
  position: absolute;
  font-size: 10px;
  font-weight: bold;
  color: white;
}
</style>

