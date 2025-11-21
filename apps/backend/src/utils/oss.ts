import OSS from 'ali-oss'

// 配置通过环境变量注入
const OSS_ACCESS_KEY = process.env['OSS_ACCESS_KEY'] || ''
const OSS_SECRET_KEY = process.env['OSS_SECRET_KEY'] || ''
const OSS_REGION = process.env['OSS_REGION'] || ''
const OSS_BUCKET = process.env['OSS_BUCKET'] || ''

// 创建并导出 OSS 客户端实例
export const ossClient = new OSS({
  accessKeyId: OSS_ACCESS_KEY,
  accessKeySecret: OSS_SECRET_KEY,
  bucket: OSS_BUCKET,
  region: OSS_REGION,
  // 设置超时时间
  timeout: 60 * 1000, // 60秒超时
})

// 导出 OSS 类型，方便其他模块使用
export type OSSClient = typeof ossClient
