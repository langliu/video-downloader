interface CacheData {
  urls: string
  results: VideoInfo[]
  timestamp: number
}

interface VideoInfo {
  id: string
  name: string
  cover: string
  videoUrl: string
  success: boolean
  error?: string
}

const STORAGE_KEY = 'video-url-processor-cache'
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30天过期

export const storage = {
  // 清除缓存
  clear: () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },

  // 检查localStorage是否可用
  isAvailable: (): boolean => {
    try {
      if (typeof window === 'undefined') {
        return false
      }
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  },

  // 从localStorage加载数据
  load: (): CacheData | null => {
    try {
      if (typeof window === 'undefined') {
        return null
      }
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data: CacheData = JSON.parse(stored)

      // 检查是否过期
      if (Date.now() - data.timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }

      return data
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
      return null
    }
  },
  // 保存数据到localStorage
  save: (urls: string, results: VideoInfo[]) => {
    try {
      if (typeof window === 'undefined') {
        return
      }
      const data: CacheData = {
        results,
        timestamp: Date.now(),
        urls,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
}
