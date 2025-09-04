// NFC连携型DXプラットフォーム - メインJavaScript

// 画面履歴管理
let screenHistory = ['topScreen'];

// PDF.js 状态变量
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let fitMode = 'width'; // 'width' or 'page'
let currentScale = 1;
let manualScale = 1;
let rotation = 0;
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const canvasWrapper = document.getElementById('pdf-canvas-wrapper');

// パンナビゲーション状態
let isPanning = false;
let startX, startY, scrollStartX, scrollStartY;

// PDF.js ワーカー設定
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.11.338/build/pdf.worker.min.js';
}

// エラーハンドリング機能
function showError(message, error = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>🚫 エラーが発生しました</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()" class="btn">閉じる</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    if (error) {
        console.error('Application Error:', error);
    }
    
    // 5秒後に自動で削除
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// ローディング表示機能
function showLoading(message = '読み込み中...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
}

function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.remove();
    }
}

// PDF レンダリング機能
function renderPage(num) {
    if (!pdfDoc || !canvas || !ctx) return;
    
    pageRendering = true;
    
    try {
        pdfDoc.getPage(num).then(function(page) {
            const container = document.getElementById('pdf-container');
            if (!container) return;
            
            const viewport = page.getViewport({ scale: 1, rotation });
            
            // フィットモードに基づいてベーススケールを計算
            let baseScale;
            if (fitMode === 'width') {
                baseScale = (container.clientWidth - 40) / viewport.width;
            } else {
                const scaleX = (container.clientWidth - 40) / viewport.width;
                const scaleY = (container.clientHeight - 40) / viewport.height;
                baseScale = Math.min(scaleX, scaleY);
            }

            // マニュアルズームを適用
            const finalScale = baseScale * manualScale;
            currentScale = finalScale;

            // モバイル最適化：最小読み取り可能サイズを確保
            const minScale = Math.max(baseScale * 0.8, 0.5);
            const maxScale = baseScale * 5;
            const clampedScale = Math.max(minScale, Math.min(maxScale, finalScale));

            const devicePixelRatio = window.devicePixelRatio || 1;
            const scaledViewport = page.getViewport({ scale: clampedScale * devicePixelRatio, rotation });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            canvas.style.height = `${scaledViewport.height / devicePixelRatio}px`;
            canvas.style.width = `${scaledViewport.width / devicePixelRatio}px`;

            // コンテナより小さい場合は中央揃え
            const canvasDisplayWidth = scaledViewport.width / devicePixelRatio;
            const canvasDisplayHeight = scaledViewport.height / devicePixelRatio;
            
            if (canvasDisplayWidth < container.clientWidth) {
                canvas.style.marginLeft = `${(container.clientWidth - canvasDisplayWidth) / 2}px`;
            } else {
                canvas.style.marginLeft = '0px';
            }
            
            if (canvasDisplayHeight < container.clientHeight) {
                canvas.style.marginTop = `${(container.clientHeight - canvasDisplayHeight) / 2}px`;
            } else {
                canvas.style.marginTop = '0px';
            }

            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport,
                renderInteractiveForms: false,
            };
            const renderTask = page.render(renderContext);

            renderTask.promise.then(function() {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            }).catch(function(error) {
                showError('PDFページのレンダリングに失敗しました', error);
                pageRendering = false;
            });
        }).catch(function(error) {
            showError('PDFページの取得に失敗しました', error);
            pageRendering = false;
        });
    } catch (error) {
        showError('PDFレンダリング中にエラーが発生しました', error);
        pageRendering = false;
    }

    const pageNumElement = document.getElementById('page-num');
    if (pageNumElement) {
        pageNumElement.textContent = num;
    }
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// PDF ナビゲーション機能
function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

function toggleFitMode() {
    fitMode = fitMode === 'width' ? 'page' : 'width';
    manualScale = 1;
    if (pdfDoc) {
        queueRenderPage(pageNum);
    }
}

// ズーム機能
function zoomIn() {
    manualScale = Math.min(manualScale * 1.2, 5);
    if (pdfDoc) {
        queueRenderPage(pageNum);
    }
}

function zoomOut() {
    manualScale = Math.max(manualScale / 1.2, 0.5);
    if (pdfDoc) {
        queueRenderPage(pageNum);
    }
}

// 回転機能
function rotatePdf() {
    rotation = (rotation + 90) % 360;
    if (pdfDoc) {
        queueRenderPage(pageNum);
    }
}

// タッチ距離計算
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// パンナビゲーション設定
function setupPanNavigation() {
    if (!canvasWrapper) return;
    
    // マウスイベント
    canvasWrapper.addEventListener('mousedown', function(e) {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        scrollStartX = canvasWrapper.scrollLeft;
        scrollStartY = canvasWrapper.scrollTop;
        canvasWrapper.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;
        canvasWrapper.scrollLeft = scrollStartX + dx;
        canvasWrapper.scrollTop = scrollStartY + dy;
        e.preventDefault();
    });

    document.addEventListener('mouseup', function(e) {
        isPanning = false;
        if (canvasWrapper) {
            canvasWrapper.style.cursor = 'grab';
        }
    });

    // タッチイベント
    canvasWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            isPanning = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            scrollStartX = canvasWrapper.scrollLeft;
            scrollStartY = canvasWrapper.scrollTop;
            e.preventDefault();
        }
    });

    canvasWrapper.addEventListener('touchmove', function(e) {
        if (isPanning && e.touches.length === 1) {
            const dx = startX - e.touches[0].clientX;
            const dy = startY - e.touches[0].clientY;
            canvasWrapper.scrollLeft = scrollStartX + dx;
            canvasWrapper.scrollTop = scrollStartY + dy;
            e.preventDefault();
        }
    });

    canvasWrapper.addEventListener('touchend', function(e) {
        isPanning = false;
    });

    // ピンチズーム
    let initialDistance = 0;
    let initialScale = 1;

    canvasWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
            initialScale = manualScale;
            e.preventDefault();
        }
    });

    canvasWrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
            const scaleChange = currentDistance / initialDistance;
            manualScale = Math.max(0.5, Math.min(5, initialScale * scaleChange));
            queueRenderPage(pageNum);
            e.preventDefault();
        }
    });
}

// 画面遷移機能
function showScreen(screenId) {
    try {
        if (screenId === 'topScreen') {
            screenHistory = ['topScreen'];
        } else {
            if (screenHistory[screenHistory.length - 1] !== screenId) {
                screenHistory.push(screenId);
            }
        }

        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            showError(`画面 ${screenId} が見つかりません`);
        }
    } catch (error) {
        showError('画面遷移中にエラーが発生しました', error);
    }
}

// PDFビューア表示機能
function showPdfViewer(title, url) {
    try {
        const loading = showLoading('PDFを読み込み中...');
        
        const titleElement = document.getElementById('pdf-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        // PDF ビューア状態をリセット
        fitMode = 'width';
        manualScale = 1;
        rotation = 0;
        currentScale = 1;
        
        if (typeof pdfjsLib === 'undefined') {
            hideLoading();
            showError('PDF.jsライブラリが読み込まれていません');
            return;
        }
        
        pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            const pageCountElement = document.getElementById('page-count');
            if (pageCountElement) {
                pageCountElement.textContent = pdfDoc.numPages;
            }
            pageNum = 1;
            
            // PDF特性に基づいて初期設定を最適化
            pdfDoc.getPage(1).then(function(page) {
                const viewport = page.getViewport({ scale: 1 });
                const aspectRatio = viewport.width / viewport.height;
                const isMobile = window.innerWidth < 768;
                const isLandscapePdf = aspectRatio > 1.4;
                const isPortraitPdf = aspectRatio < 0.8;
                
                // モバイル向けスマート初期設定
                if (isMobile) {
                    if (isLandscapePdf) {
                        fitMode = 'page';
                    } else if (isPortraitPdf) {
                        fitMode = 'width';
                    }
                    
                    if (isLandscapePdf && viewport.width > 1000) {
                        manualScale = 1.3;
                    }
                }
                
                renderPage(pageNum);
                hideLoading();
            }).catch(function(error) {
                hideLoading();
                showError('PDFの初期ページ取得に失敗しました', error);
            });
            
            // パンナビゲーション設定（DOM準備後）
            setTimeout(setupPanNavigation, 100);
        }).catch(function(error) {
            hideLoading();
            showError(`PDF "${title}" の読み込みに失敗しました。ファイルが存在するか確認してください。`, error);
            return;
        });

        showScreen('pdfViewerScreen');
    } catch (error) {
        hideLoading();
        showError('PDFビューアの起動中にエラーが発生しました', error);
    }
}

// 3Dモデルビューア表示機能
function showViewer(title, description) {
    try {
        const titleElement = document.getElementById('modelTitle');
        const descElement = document.getElementById('modelDescription');
        const nftTitleElement = document.getElementById('nftTitle');
        
        if (titleElement) titleElement.textContent = title;
        if (descElement) descElement.textContent = description;
        if (nftTitleElement) nftTitleElement.textContent = title + ' NFT';
        
        showScreen('viewerScreen');
    } catch (error) {
        showError('3Dモデルビューアの起動中にエラーが発生しました', error);
    }
}

// 戻る機能
function goBack() {
    try {
        if (screenHistory.length > 1) {
            const currentScreenId = screenHistory[screenHistory.length - 1];
            screenHistory.pop();
            const targetScreenId = screenHistory[screenHistory.length - 1];
            
            // PDF ビューアから戻る際のクリーンアップ
            if (currentScreenId === 'pdfViewerScreen' && pdfDoc) {
                if (pdfDoc.destroy) {
                    pdfDoc.destroy();
                }
                pdfDoc = null;
                if (canvas && ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }

            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => screen.classList.remove('active'));
            
            const targetScreen = document.getElementById(targetScreenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
            }
        } else {
            showScreen('topScreen');
        }
    } catch (error) {
        showError('画面遷移中にエラーが発生しました', error);
        showScreen('topScreen');
    }
}

// NFT受け取り機能 - ArchitectDAO連携（真実データ使用）
function receiveNFT() {
    try {
        // NFTデータマネージャーから真実データを取得
        const nftData = window.nftDataManager.generateTransferData();
        
        console.log('Using real NFT data for transfer:', nftData);

        // ArchitectDAO URL構築（環境に応じて変更）
        const architectDAOUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5173'  // ローカル開発用
            : 'https://architect-dao.vercel.app';  // 本番用ArchitectDAO
        
        // URLパラメータとしてデータを渡す（本番環境では暗号化推奨）
        const params = new URLSearchParams({
            action: 'mint',
            source: 'nfc-dx-platform',
            data: JSON.stringify(nftData)
        });

        // 確認ダイアログ（真実データを使用）
        const confirmed = confirm(`🎁 ArchitectDAO でNFTを受け取りますか？

${nftData.name} のデジタルアセットが、${nftData.blockchain}上のNFTとして無料で転送されます。

【NFT詳細情報】
• Token ID: ${nftData.originalTokenId}
• Contract: ${nftData.originalContract}
• IPFS: ${nftData.ipfsCID}

【付与される権利】
• 3Dモデルの商用利用権
• 設計図面のダウンロード権  
• 技術仕様書へのアクセス権
• 将来のアップデート版の優先入手権

ArchitectDAO プラットフォームに移動してNFTを受け取りますか？`);

        if (confirmed) {
            // ローディング表示
            const loading = showLoading('ArchitectDAO に接続中...');
            
            // 少し遅延を入れてユーザーフィードバック向上
            setTimeout(() => {
                hideLoading();
                
                // ArchitectDAOに新しいタブで移動
                const newTab = window.open(
                    `${architectDAOUrl}?${params.toString()}`,
                    '_blank',
                    'noopener,noreferrer'
                );
                
                if (!newTab) {
                    showError('ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。');
                } else {
                    // 成功メッセージ
                    showNFTSuccessMessage();
                }
            }, 1500);
        }
        
    } catch (error) {
        hideLoading();
        showError('ArchitectDAO連携中にエラーが発生しました', error);
    }
}

// NFT受け取り成功メッセージ
function showNFTSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.className = 'nft-success-message';
    successDiv.innerHTML = `
        <div class="nft-success-content">
            <div class="success-icon">🎉</div>
            <h3>ArchitectDAO に移動しました</h3>
            <p>新しいタブで ArchitectDAO が開かれました。<br>そちらでNFTのミント（発行）を完了してください。</p>
            <div class="success-features">
                <h4>取得できる権利：</h4>
                <ul>
                    <li>✅ 3Dモデルの商用利用権</li>
                    <li>✅ 設計図面のダウンロード権</li>
                    <li>✅ 技術仕様書へのアクセス権</li>
                    <li>✅ 将来のアップデート版の優先入手権</li>
                </ul>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="btn">確認</button>
        </div>
    `;
    document.body.appendChild(successDiv);
    
    // 自動削除（10秒後）
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 10000);
}

// イベントリスナー設定
function setupEventListeners() {
    // PDF コントロールボタン
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const rotateBtn = document.getElementById('rotate-pdf');
    const fitModeBtn = document.getElementById('fit-mode-toggle');

    if (prevPageBtn) prevPageBtn.addEventListener('click', onPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener('click', onNextPage);
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (rotateBtn) rotateBtn.addEventListener('click', rotatePdf);
    if (fitModeBtn) fitModeBtn.addEventListener('click', toggleFitMode);
    
    // 戻るボタン（全ての画面共通）
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('back-btn')) {
            event.preventDefault();
            goBack();
        }
    });
    
    // 画面遷移ボタン（data-target属性）
    document.addEventListener('click', function(event) {
        const target = event.target.getAttribute('data-target');
        if (target) {
            event.preventDefault();
            showScreen(target);
        }
    });
    
    // PDFドキュメントクリック
    document.addEventListener('click', function(event) {
        const pdfTitle = event.target.closest('.document-item')?.getAttribute('data-pdf-title');
        const pdfUrl = event.target.closest('.document-item')?.getAttribute('data-pdf-url');
        if (pdfTitle && pdfUrl) {
            event.preventDefault();
            showPdfViewer(pdfTitle, pdfUrl);
        }
    });
    
    // 3Dモデルプランクリック
    document.addEventListener('click', function(event) {
        const modelTitle = event.target.closest('.plan-btn')?.getAttribute('data-model-title');
        const modelDesc = event.target.closest('.plan-btn')?.getAttribute('data-model-desc');
        if (modelTitle && modelDesc) {
            event.preventDefault();
            showViewer(modelTitle, modelDesc);
        }
    });
    
    // NFT受け取りボタン
    const receiveNftBtn = document.getElementById('receiveNftBtn');
    if (receiveNftBtn) {
        receiveNftBtn.addEventListener('click', receiveNFT);
    }
}

// 初期化処理
function initializeApp() {
    try {
        // イベントリスナー設定
        setupEventListeners();
        
        // Service Worker 登録（対応している場合）
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registered successfully');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed');
                });
        }
        
    } catch (error) {
        showError('アプリケーションの初期化中にエラーが発生しました', error);
    }
}

// DOM読み込み完了後に初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}