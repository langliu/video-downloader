# 视频下载器

这是一个基于 [Next.js](https://nextjs.org) 的视频下载工具，支持批量视频信息提取和下载。

## 主要功能

### 🎯 视频信息提取

- 支持批量输入视频URL（逗号或换行符分割）
- 自动提取视频名称、封面图片和播放地址
- 实时显示URL解析状态

### 📊 Table展示界面

- **新功能**: 使用Table格式展示视频信息，替代原有的卡片布局
- 显示视频封面缩略图
- 实时显示下载状态（未下载、等待中、下载中、已完成、下载失败）
- 集成下载进度条，直接在表格中显示下载进度

### 📥 智能下载管理

- **新功能**: 支持下载失败后重新下载
- 单个视频下载和批量下载
- 实时下载进度显示
- 支持选择下载文件夹（支持的浏览器）
- 自动文件名清理和去重

### 💾 数据缓存

- 自动保存输入的URL到本地存储
- 支持清除缓存功能
- 显示最后更新时间

## 界面改进

### Table展示格式

| 列名 | 说明 |
|------|------|
| 封面 | 视频缩略图，支持点击播放 |
| 视频名称 | 视频标题，失败时显示错误信息 |
| 状态 | 获取状态和下载状态的徽章显示 |
| 下载进度 | 实时进度条和百分比显示 |
| 操作 | 下载/重试/重新下载按钮 |

### 下载状态管理

- 🔄 **等待中**: 任务已加入队列
- ⬇️ **下载中**: 显示实时进度条
- ✅ **已完成**: 下载成功
- ❌ **下载失败**: 显示错误信息，支持重试
- 🔁 **重新下载**: 支持重新下载已完成的视频

## 开始使用

首先，启动开发服务器：

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 技术栈

- **框架**: Next.js 15.5.5 (App Router)
- **UI组件**: Shadcn UI + Tailwind CSS
- **图标**: Lucide React
- **类型安全**: TypeScript
- **文件系统**: File System Access API（支持的浏览器）

## 了解更多

要了解更多关于 Next.js 的信息，请查看以下资源：

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
