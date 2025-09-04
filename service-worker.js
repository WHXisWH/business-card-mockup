// Service Worker - NFC连携型DXプラットフォーム
// キャッシュとオフライン機能を提供

const CACHE_NAME = 'nfc-dx-platform-v1.0.0';
const STATIC_CACHE_NAME = 'nfc-dx-platform-static-v1.0.0';

// キャッシュするリソース
const CACHE_RESOURCES = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    '/building-model.glb'
];

// CDN リソース（オプション）
const CDN_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js',
    'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
];

// 大きなPDFファイル（条件付きキャッシュ）
const LARGE_RESOURCES = [
    '/pdfs/会社概要.pdf',
    '/pdfs/提案書.pdf', 
    '/pdfs/環境認証.pdf'
    // 施工実績.pdf (13MB) は除外 - 必要時のみ読み込み
];

// インストール時の処理
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        Promise.all([
            // 静的リソースをキャッシュ
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching static resources');
                return cache.addAll(CACHE_RESOURCES);
            }),
            
            // CDNリソースをキャッシュ（エラーを無視）
            caches.open(CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching CDN resources');
                return Promise.allSettled(
                    CDN_RESOURCES.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`Failed to cache CDN resource: ${url}`, err);
                        })
                    )
                );
            }),
            
            // 小さなPDFファイルをキャッシュ
            caches.open(CACHE_NAME).then(cache => {
                console.log('Service Worker: Caching PDF resources');
                return Promise.allSettled(
                    LARGE_RESOURCES.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`Failed to cache PDF: ${url}`, err);
                        })
                    )
                );
            })
        ]).then(() => {
            console.log('Service Worker: Installation completed');
            // 新しいService Workerを即座にアクティベート
            return self.skipWaiting();
        })
    );
});

// アクティベート時の処理
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 古いキャッシュを削除
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Activation completed');
            // 即座に全てのクライアントをコントロール
            return self.clients.claim();
        })
    );
});

// フェッチ時の処理
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // GETリクエストのみ処理
    if (request.method !== 'GET') {
        return;
    }
    
    // PDF ファイルの処理（特別な戦略）
    if (url.pathname.endsWith('.pdf')) {
        event.respondWith(handlePdfRequest(request));
        return;
    }
    
    // 3D モデルファイルの処理
    if (url.pathname.endsWith('.glb') || url.pathname.endsWith('.gltf')) {
        event.respondWith(handleModelRequest(request));
        return;
    }
    
    // その他のリソース（Cache First戦略）
    event.respondWith(handleGeneralRequest(request));
});

// PDF ファイルのリクエスト処理
async function handlePdfRequest(request) {
    const url = new URL(request.url);
    
    try {
        // 大きなPDFファイル（施工実績.pdf）は Network First
        if (url.pathname.includes('施工実績.pdf')) {
            return await handleNetworkFirst(request);
        }
        
        // 小さなPDFファイルは Cache First
        return await handleCacheFirst(request);
    } catch (error) {
        console.error('PDF request failed:', error);
        return createErrorResponse('PDFファイルの読み込みに失敗しました');
    }
}

// 3D モデルファイルのリクエスト処理
async function handleModelRequest(request) {
    try {
        // 3Dモデルは Cache First（大きなファイルなので）
        return await handleCacheFirst(request);
    } catch (error) {
        console.error('3D model request failed:', error);
        return createErrorResponse('3Dモデルの読み込みに失敗しました');
    }
}

// 一般リソースのリクエスト処理
async function handleGeneralRequest(request) {
    try {
        return await handleCacheFirst(request);
    } catch (error) {
        console.error('General request failed:', error);
        
        // HTMLファイルの場合はオフラインページを返す
        if (request.destination === 'document') {
            return createOfflinePage();
        }
        
        return new Response('リソースが利用できません', { status: 404 });
    }
}

// Cache First 戦略
async function handleCacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const staticCache = await caches.open(STATIC_CACHE_NAME);
    
    // キャッシュから検索
    let response = await cache.match(request) || await staticCache.match(request);
    
    if (response) {
        console.log('Service Worker: Serving from cache:', request.url);
        return response;
    }
    
    // キャッシュにない場合はネットワークから取得
    console.log('Service Worker: Fetching from network:', request.url);
    response = await fetch(request);
    
    // 成功した場合はキャッシュに保存
    if (response && response.status === 200) {
        const responseClone = response.clone();
        cache.put(request, responseClone);
    }
    
    return response;
}

// Network First 戦略
async function handleNetworkFirst(request) {
    try {
        console.log('Service Worker: Network first for:', request.url);
        const response = await fetch(request);
        
        // 成功した場合はキャッシュに保存
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache:', request.url);
        
        // ネットワーク失敗時はキャッシュから取得
        const cache = await caches.open(CACHE_NAME);
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        return await cache.match(request) || await staticCache.match(request);
    }
}

// エラーレスポンス作成
function createErrorResponse(message) {
    return new Response(
        JSON.stringify({ error: message }),
        {
            status: 500,
            statusText: 'Service Worker Error',
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

// オフラインページ作成
function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>オフライン - NFC连携型DXプラットフォーム</title>
            <style>
                body {
                    font-family: 'Hiragino Sans', sans-serif;
                    background: linear-gradient(135deg, #87CEEB 0%, #FF6347 50%, #C0C0C0 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    color: white;
                    text-align: center;
                }
                .offline-container {
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 400px;
                    margin: 20px;
                }
                .offline-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                button {
                    background: linear-gradient(45deg, #87CEEB, #4682B4);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1>オフライン状態です</h1>
                <p>インターネット接続を確認してください。一部のコンテンツはオフラインでもご利用いただけます。</p>
                <button onclick="window.location.reload()">再試行</button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    console.log('Service Worker: Background sync triggered');
    // 将来的にオフライン時のデータ同期などに使用
}

// プッシュ通知（将来の拡張用）
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192.png',
                badge: '/badge-72.png'
            })
        );
    }
});

// 通知クリック処理
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('Service Worker: Script loaded');