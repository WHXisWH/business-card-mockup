// 真实NFT数据管理器
class NFTDataManager {
    constructor() {
        // 環境に応じてURLを設定
        this.architectDAOUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5173'
            : 'https://architect-dao.vercel.app';
        this.nftCache = new Map();
        this.initializeRealData();
    }

    // 初始化真实NFT数据
    async initializeRealData() {
        try {
            // 从ArchitectDAO API获取NFT列表
            const nfts = await this.fetchNFTsFromArchitectDAO();
            
            // 如果有数据，使用第一个作为展示
            if (nfts && nfts.length > 0) {
                this.currentNFT = nfts[0];
                console.log('Using real NFT data:', this.currentNFT);
            } else {
                // fallback到示例数据
                this.currentNFT = this.getExampleNFTData();
            }
        } catch (error) {
            console.warn('Failed to fetch real NFT data, using example:', error);
            this.currentNFT = this.getExampleNFTData();
        }
    }

    // 从ArchitectDAO获取NFT数据
    async fetchNFTsFromArchitectDAO() {
        try {
            const response = await fetch(`${this.architectDAOUrl}/api/nfts`);
            if (!response.ok) {
                console.warn(`ArchitectDAO API not available (${response.status}), using fallback data`);
                return null;
            }
            const text = await response.text();
            // 检查是否是HTML响应（表示API不存在）
            if (text.startsWith('<!doctype') || text.startsWith('<!DOCTYPE')) {
                console.warn('ArchitectDAO API endpoint not found, using fallback data');
                return null;
            }
            return JSON.parse(text);
        } catch (error) {
            console.warn('ArchitectDAO API not available, using fallback data:', error.message);
            return null;
        }
    }

    // 示例NFT数据（作为fallback）
    getExampleNFTData() {
        return {
            tokenId: "1",
            name: "Modern Office Complex - Phase 1",
            description: "革新的なオフィス複合施設の3Dモデル。サステナブルデザインと最新のスマートビルディング技術を融合させた次世代建築です。",
            creator: "戸田建設株式会社",
            contractAddress: "0x742d35Cc60C2f2f13C4D7c20c2C2b5B5E3F6C8A1",
            ipfsCID: "QmYwAPJzv5CZsnA1bFKRqLdB1NpbCiDHjx5HLJ9MvMhQfM",
            glbFile: "building-model.glb",
            imageUrl: "",
            attributes: [
                { trait_type: "Type", value: "Office Complex" },
                { trait_type: "Style", value: "Modern" },
                { trait_type: "Floors", value: "15" },
                { trait_type: "Area", value: "25000 sqm" },
                { trait_type: "Certification", value: "LEED Gold" },
                { trait_type: "Smart Features", value: "IoT Enabled" }
            ],
            blockchain: "Nero Chain",
            network: "mainnet",
            price: "0", // 无料ギフト
            giftType: "free",
            royalty: "5%",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    // 获取当前NFT数据
    getCurrentNFT() {
        return this.currentNFT;
    }

    // 生成给ArchitectDAO的完整数据
    generateTransferData() {
        const nft = this.getCurrentNFT();
        
        return {
            // 原始NFT信息
            originalTokenId: nft.tokenId,
            originalContract: nft.contractAddress,
            ipfsCID: nft.ipfsCID,
            
            // 展示信息
            name: `${nft.name} - 戸田建設デジタルギフト`,
            description: `${nft.description}\n\n🎁 戸田建設からの無料NFTギフトです。この建築3Dモデルの商用利用権、設計図面のダウンロード権、技術仕様書へのアクセス権が含まれます。`,
            
            // メタデータ
            category: 'Architecture',
            creator: nft.creator,
            originalPlatform: 'NFC-DX-Platform',
            blockchain: nft.blockchain,
            
            // アセット情報
            modelFile: nft.glbFile,
            modelSize: '1.2MB',
            ipfsUrl: `https://ipfs.io/ipfs/${nft.ipfsCID}`,
            
            // 権利情報
            attributes: [
                ...nft.attributes,
                { trait_type: 'Provider', value: '戸田建設株式会社' },
                { trait_type: 'Rights', value: 'Commercial Use' },
                { trait_type: 'Source', value: 'NFC DX Platform' },
                { trait_type: 'Transfer Type', value: 'Gift' }
            ],
            
            // 取引情報
            giftType: 'free',
            price: '0',
            royalty: nft.royalty,
            
            // タイムスタンプ
            timestamp: Date.now(),
            transferId: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }

    // NFTデータを更新
    updateNFTData(newData) {
        this.currentNFT = { ...this.currentNFT, ...newData };
    }
}

// グローバルインスタンス
window.nftDataManager = new NFTDataManager();