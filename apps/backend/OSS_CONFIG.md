# 阿里云 OSS 配置指南

本项目已从火山引擎 TOS 迁移到阿里云 OSS 进行文件存储。

## 环境变量配置

在 `apps/backend/.env` 文件中配置以下环境变量：

```bash
# 阿里云 OSS 配置
OSS_ACCESS_KEY=your_oss_access_key_here
OSS_SECRET_KEY=your_oss_secret_key_here
OSS_REGION=oss-cn-beijing
OSS_BUCKET=your_bucket_name
```

## 获取阿里云 OSS 凭证

1. 登录 [阿里云控制台](https://oss.console.aliyun.com/)
2. 创建或选择一个 Bucket
3. 获取 AccessKey 和 SecretKey：
   - 进入 [RAM 访问控制](https://ram.console.aliyun.com/)
   - 创建用户并授予 OSS 权限
   - 获取 AccessKeyId 和 AccessKeySecret

## Region 配置

常用的 Region 值：

- 华北1（青岛）：`oss-cn-qingdao`
- 华北2（北京）：`oss-cn-beijing`
- 华北3（张家口）：`oss-cn-zhangjiakou`
- 华北5（呼和浩特）：`oss-cn-huhehaote`
- 华北6（乌兰察布）：`oss-cn-wulanchabu`
- 华东1（杭州）：`oss-cn-hangzhou`
- 华东2（上海）：`oss-cn-shanghai`
- 华南1（深圳）：`oss-cn-shenzhen`
- 华南2（河源）：`oss-cn-heyuan`
- 华南3（广州）：`oss-cn-guangzhou`
- 西南1（成都）：`oss-cn-chengdu`

更多 Region 信息请参考：[阿里云 OSS Region 列表](https://help.aliyun.com/document_detail/31837.html)

## Bucket 权限配置

建议配置：

1. **访问权限**：私有（Private）
2. **跨域设置（CORS）**：如果需要前端直传，需要配置 CORS 规则
3. **防盗链**：根据需要配置 Referer 白名单

## 代码说明

上传功能位于 `apps/backend/src/processor/index.ts` 中的 `uploadToOSS` 函数：

```typescript
async function uploadToOSS(remoteUrl: string, key: string) {
  // 1. 下载远程视频
  const resp = await fetch(remoteUrl)
  const ab = await resp.arrayBuffer()
  
  // 2. 上传到 OSS
  const result = await client.put(key, Buffer.from(ab), {
    progress: (p: number) => {
      console.log(`上传进度: ${(p * 100).toFixed(2)}%`)
    },
  })
  
  return result
}
```

## 常见问题

### 1. 上传失败

检查：
- AccessKey 和 SecretKey 是否正确
- Bucket 名称是否正确
- Region 配置是否正确
- 网络连接是否正常

### 2. 权限错误

确保 RAM 用户具有以下权限：
- `oss:PutObject` - 上传文件
- `oss:GetObject` - 读取文件（如果需要）

### 3. 跨域问题

如果需要前端直传，在 OSS 控制台配置 CORS 规则：

```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "POST", "PUT"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

## 迁移说明

本项目已从火山引擎 TOS 迁移到阿里云 OSS：

- ✅ 移除了 `@volcengine/tos-sdk` 依赖
- ✅ 添加了 `ali-oss` 和 `@types/ali-oss` 依赖
- ✅ 更新了环境变量配置
- ✅ 重写了上传逻辑

旧的 TOS 配置已在 `.env` 文件中注释，可以安全删除。

