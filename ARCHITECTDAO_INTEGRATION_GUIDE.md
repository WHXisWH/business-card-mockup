# ArchitectDAO 集成指南

## 📋 概述

Business Card Mockup 会将用户跳转到 ArchitectDAO 平台进行 NFT 接收。本文档详细说明 ArchitectDAO 端需要实现的功能。

## 🔗 数据传递格式

### URL 参数结构
```
https://architect-dao.vercel.app?action=mint&source=nfc-dx-platform&data={encoded_json}
```

### 传递的 JSON 数据结构
```json
{
  "originalTokenId": "1",
  "originalContract": "0x742d35Cc60C2f2f13C4D7c20c2C2b5B5E3F6C8A1",
  "ipfsCID": "QmYwAPJzv5CZsnA1bFKRqLdB1NpbCiDHjx5HLJ9MvMhQfM",
  "name": "Modern Office Complex - Phase 1 - 戸田建設デジタルギフト",
  "description": "革新的なオフィス複合施設の3Dモデル...",
  "category": "Architecture",
  "creator": "戸田建設株式会社",
  "originalPlatform": "NFC-DX-Platform",
  "blockchain": "Nero Chain",
  "modelFile": "building-model.glb",
  "modelSize": "1.2MB",
  "ipfsUrl": "https://ipfs.io/ipfs/QmYwAPJzv5CZsnA1bFKRqLdB1NpbCiDHjx5HLJ9MvMhQfM",
  "attributes": [
    { "trait_type": "Provider", "value": "戸田建設株式会社" },
    { "trait_type": "Rights", "value": "Commercial Use" },
    { "trait_type": "Source", "value": "NFC DX Platform" }
  ],
  "giftType": "free",
  "price": "0",
  "timestamp": 1704096000000,
  "transferId": "transfer_1704096000000_abc123def"
}
```

## 🛠️ ArchitectDAO 需要实现的功能

### 1. URL 参数解析器
**位置：** `src/utils/urlParams.ts`

**功能：**
- 检测 URL 中的 `action=mint&source=nfc-dx-platform`
- 解析 `data` 参数中的 JSON 数据
- 验证数据完整性
- 清除 URL 参数避免重复处理

**关键方法：**
```typescript
parseNFTDataFromURL(): ExternalNFTData | null
clearURLParams(): void
checkSourcePlatform(): string | null
```

### 2. 外部 NFT 处理组件
**位置：** `src/components/ExternalNFTHandler.tsx`

**功能：**
- 自动检测外部平台传来的 NFT 数据
- 显示美观的 NFT 接收弹窗
- 展示 NFT 详细信息（Token ID、IPFS CID、属性等）
- 提供"接受"和"拒绝"按钮
- 集成现有的 NFT 铸造流程

**UI 要求：**
- 全屏遮罩弹窗（z-index: 50）
- 显示 NFT 基本信息
- 显示原始区块链数据（Token ID、Contract Address、IPFS CID）
- 显示属性标签
- 突出显示"免费礼品"状态
- 品牌化设计（ArchitectDAO 风格）

### 3. 主页面集成
**位置：** 主页面组件（如 `HomePage.tsx`）

**修改：**
```typescript
import ExternalNFTHandler from './ExternalNFTHandler';

// 在 return 的最开始添加：
<ExternalNFTHandler />
```

### 4. NFT 铸造逻辑扩展
**位置：** `hooks/useNFTMint.ts` 或相关 hook

**需要支持：**
- 区分"新 NFT 铸造"vs"现有 NFT 转移"
- 处理外部平台的 NFT 数据
- 可选：验证原始 NFT 的存在性
- 可选：实现 NFT 转移而非重复铸造

### 5. API 端点（可选）
**位置：** `pages/api/nfts.ts`

**功能：**
- 提供 NFT 数据给 Business Card Mockup
- 验证 NFT 状态
- 记录转移日志

## 📱 用户体验流程

### 理想流程：
1. **自动检测** - 页面加载时自动检测 URL 参数
2. **弹窗展示** - 显示精美的 NFT 接收界面
3. **信息确认** - 用户查看 NFT 详细信息
4. **一键接收** - 用户点击"接收"按钮
5. **区块链交互** - 执行 NFT 转移/铸造
6. **完成确认** - 显示成功消息

### 错误处理：
- URL 参数解析失败
- NFT 数据验证失败
- 区块链交互失败
- 用户拒绝接收

## 🎨 UI/UX 要求

### 弹窗设计：
- **标题**：🎁 NFT ギフトが届きました！
- **来源显示**：from NFC-DX-Platform
- **NFT 信息区域**：卡片式布局
- **属性标签**：Badge 组件显示
- **区块链信息**：合约地址、Token ID、IPFS CID
- **行动按钮**：主按钮（接收）+ 次要按钮（稍后）

### 响应式设计：
- 移动端友好
- 平板端优化
- 桌面端完整体验

## 🔧 技术实现细节

### 必需的依赖：
- React/Next.js
- TypeScript
- 现有的 UI 组件库
- Web3 相关库（ethers.js 等）

### 代码结构：
```
src/
├── components/
│   ├── ExternalNFTHandler.tsx    # 主要组件
│   └── ui/
│       └── badge.tsx             # 属性标签组件
├── utils/
│   └── urlParams.ts              # URL 参数工具
├── hooks/
│   └── useNFTMint.ts             # 扩展铸造逻辑
└── pages/api/
    └── nfts.ts                   # API 端点（可选）
```

## 🧪 测试指南

### 测试 URL：
```
http://localhost:3000?action=mint&source=nfc-dx-platform&data=%7B%22name%22%3A%22Test%20NFT%22%2C%22originalTokenId%22%3A%221%22%7D
```

### 测试步骤：
1. 启动 ArchitectDAO 开发服务器
2. 访问带参数的测试 URL
3. 验证弹窗正常显示
4. 测试接收流程
5. 验证错误处理

## 🚀 部署注意事项

### 环境变量：
- 确保 IPFS 访问配置
- 区块链 RPC 端点配置
- 合约地址配置

### 域名配置：
- 更新 Business Card Mockup 中的 `architectDAOUrl`
- 确保 CORS 设置正确
- SSL 证书配置

## 📞 联系与支持

如有技术问题，请参考：
- Business Card Mockup 的 `js/main.js` 中的 `receiveNFT()` 函数
- 数据结构示例在 `js/nft-data.js`

---

**优先级：**
- 🔴 高优先级：URL 参数解析器 + 外部 NFT 处理组件
- 🟡 中优先级：UI 美化 + 错误处理
- 🟢 低优先级：API 端点 + 高级功能