# Business Card Mockup - 配置指南

## 🔧 部署前配置

### 1. ArchitectDAO 域名设置

**文件：** `js/main.js` 和 `js/nft-data.js`

**已配置为：**
```javascript
: 'https://architect-dao.vercel.app';
```

**✅ 域名已正确配置，无需修改**

### 2. 真实 NFT 数据配置

**文件：** `js/nft-data.js`

**选项 A：使用 API（推荐）**
- 确保 ArchitectDAO 提供 `/api/nfts` 端点
- 系统会自动获取真实数据

**选项 B：使用静态数据**
- 修改 `getExampleNFTData()` 方法中的数据
- 更新合约地址、IPFS CID 等信息

### 3. 3D 模型文件

**当前：** `building-model.glb` (1.2MB)

**更新步骤：**
1. 将新的 GLB 文件放在根目录
2. 更新 `js/nft-data.js` 中的 `glbFile` 字段
3. 更新 `index.html` 中的 `model-viewer` src 属性

### 4. PDF 文件

**当前位置：** `pdfs/` 目录

**包含文件：**
- 会社概要.pdf (1.8MB)
- 提案書.pdf (452KB)  
- 施工実績.pdf (13MB)
- 環境認証.pdf (400KB)

**更新：** 直接替换 PDF 文件即可

## 🚀 部署指南

### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录执行
vercel

# 自定义域名（可选）
vercel --prod --alias your-custom-domain.com
```

### 传统 Web 服务器
```bash
# 构建优化版本
npm run build

# 上传所有文件到服务器
# 确保支持 .glb 文件的 MIME 类型
```

### HTTPS 要求
- Service Worker 需要 HTTPS
- Web3 功能需要 HTTPS
- 跨域请求建议 HTTPS

## 🔒 安全配置

### 1. CORS 设置
确保 https://architect-dao.vercel.app 允许来自 business-card-mockup 域名的请求。

### 2. CSP 配置（推荐）
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://ajax.googleapis.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://architect-dao.vercel.app https://ipfs.io;
  model-src 'self';
">
```

## 📊 监控和分析

### Google Analytics（可选）
在 `index.html` 的 `<head>` 中添加：
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 错误监控（推荐）
可以集成 Sentry 或类似服务监控 JavaScript 错误。

## 🧪 测试清单

部署前测试：
- [ ] 页面正常加载
- [ ] 3D 模型正常显示和交互
- [ ] PDF 文件正常打开
- [ ] NFT 功能正常跳转
- [ ] 移动端响应式正常
- [ ] Service Worker 正常工作
- [ ] 跨域请求正常
- [ ] 错误处理正常显示

## 📱 SEO 优化

### Meta 标签优化
已在 `index.html` 中包含：
- 描述、关键词、作者
- PWA 相关标签
- 结构化数据

### 页面性能
- 所有资源已预加载
- 图片懒加载
- Service Worker 缓存
- CSS/JS 已分离

---

**部署完成后记得更新 README.md 中的域名信息！**