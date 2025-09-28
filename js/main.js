// NFC连携型DXプラットフォーム - メインJavaScript

// 画面履歴管理
let screenHistory = ['topScreen'];

// PDF.js 状态变量
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
// fitMode removed - unified page fitting mode
let currentScale = 1;
let manualScale = 1;
let rotation = 0;
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const canvasWrapper = document.getElementById('pdf-canvas-wrapper');

// パンナビゲーション状態
let isPanning = false;
let startX, startY, scrollStartX, scrollStartY;

// 全画面モード状態
let isFullscreen = false;
let fullscreenCanvas = null;
let fullscreenCtx = null;

// PDF.js ワーカー設定
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
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
            
            // ページ適応モード - ページ全体が表示されるように
            const scaleX = (container.clientWidth - 40) / viewport.width;
            const scaleY = (container.clientHeight - 40) / viewport.height;
            const baseScale = Math.min(scaleX, scaleY);

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
        if (isFullscreen) {
            renderFullscreenPage(num);
            syncFullscreenPageInfo();
        } else {
            renderPage(num);
        }
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

// toggleFitMode関数は削除されました

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
        // fitMode設定不要
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
                        // fitMode設定不要
                    } else if (isPortraitPdf) {
                        // fitMode設定不要
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
function showViewer(title, description, modelSrc) {
    try {
        const modelViewer = document.getElementById('modelViewer');
        if (modelViewer) {
            modelViewer.src = modelSrc;
        }

        const titleElement = document.getElementById('modelTitle');
        const descElement = document.getElementById('modelDescription');
        const nftTitleElement = document.getElementById('nftTitle');
        
        if (titleElement) titleElement.textContent = title;
        if (descElement) descElement.innerHTML = description;
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

// NFTミント機能 - モック版（直接ミント成功を表示）
function receiveNFT() {
    try {
        // NFTデータマネージャーからデータを取得
        const nftData = window.nftDataManager.generateTransferData();

        console.log('Mock NFT minting with data:', nftData);

        // 確認ダイアログ（地道な日本語）
        const confirmed = confirm(`🎁 NFTをミント（発行）しますか？

${nftData.name} のデジタルアセットを、${nftData.blockchain}上のNFTとして無料で発行いたします。

【NFT詳細情報】
• Token ID: ${nftData.originalTokenId}
• Contract: ${nftData.originalContract}
• IPFS: ${nftData.ipfsCID}

【付与される権利】
• 3Dモデルの商用利用権
• 設計図面のダウンロード権
• 技術仕様書へのアクセス権
• 将来のアップデート版の優先入手権

NFTをミント（発行）しますか？`);

        if (confirmed) {
            // ローディング表示
            const loading = showLoading('NFTをミント中...');

            // モックミント処理（少し遅延でリアル感を演出）
            setTimeout(() => {
                hideLoading();

                // ミント成功メッセージを表示
                showNFTMintSuccessMessage(nftData);

            }, 2000); // 2秒後にミント成功を表示
        }

    } catch (error) {
        hideLoading();
        showError('NFTミント中にエラーが発生しました', error);
    }
}

// NFTミント成功メッセージ（地道な日本語版）
function showNFTMintSuccessMessage(nftData) {
    const successDiv = document.createElement('div');
    successDiv.className = 'nft-success-message';
    successDiv.innerHTML = `
        <div class="nft-success-content">
            <div class="success-icon">🎊</div>
            <h3>NFTミントが完了いたしました！</h3>
            <div class="nft-info-box">
                <h4>🏆 ${nftData.name}</h4>
                <p class="nft-description">あなたのウォレットに正常に発行されました</p>
            </div>
            <div class="mint-details">
                <div class="detail-row">
                    <span class="label">Token ID:</span>
                    <span class="value">#${nftData.originalTokenId}</span>
                </div>
                <div class="detail-row">
                    <span class="label">ブロックチェーン:</span>
                    <span class="value">${nftData.blockchain}</span>
                </div>
                <div class="detail-row">
                    <span class="label">発行日時:</span>
                    <span class="value">${new Date().toLocaleString('ja-JP')}</span>
                </div>
            </div>
            <div class="success-features">
                <h4>🎁 ご利用いただける特典:</h4>
                <ul>
                    <li>✨ 3Dモデルの商用利用権限</li>
                    <li>📋 設計図面の無制限ダウンロード</li>
                    <li>📖 技術仕様書への永続アクセス</li>
                    <li>⚡ 将来のアップデート版優先入手</li>
                    <li>🏅 限定コミュニティへの参加権</li>
                </ul>
            </div>
            <div class="success-actions">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-primary">素晴らしい！</button>
                <button onclick="window.open('https://opensea.io/', '_blank')" class="btn btn-secondary">OpenSeaで確認</button>
            </div>
        </div>
    `;
    document.body.appendChild(successDiv);

    // 成功アニメーション効果
    setTimeout(() => {
        successDiv.classList.add('success-animation');
    }, 100);

    // 自動削除（15秒後）
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.classList.add('fade-out');
            setTimeout(() => {
                successDiv.remove();
            }, 300);
        }
    }, 15000);
}

// イベントリスナー設定
function setupEventListeners() {
    // PDF コントロールボタン
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const rotateBtn = document.getElementById('rotate-pdf');
    if (prevPageBtn) prevPageBtn.addEventListener('click', onPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener('click', onNextPage);
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (rotateBtn) rotateBtn.addEventListener('click', rotatePdf);
    
    // 全画面関連ボタン
    const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen');
    if (fullscreenToggleBtn) fullscreenToggleBtn.addEventListener('click', enterFullscreen);
    if (exitFullscreenBtn) exitFullscreenBtn.addEventListener('click', exitFullscreen);
    
    // 全画面モードのコントロールボタン
    const fsPrevPageBtn = document.getElementById('fs-prev-page');
    const fsNextPageBtn = document.getElementById('fs-next-page');
    const fsZoomInBtn = document.getElementById('fs-zoom-in');
    const fsZoomOutBtn = document.getElementById('fs-zoom-out');
    const fsRotateBtn = document.getElementById('fs-rotate-pdf');
    
    if (fsPrevPageBtn) fsPrevPageBtn.addEventListener('click', onPrevPage);
    if (fsNextPageBtn) fsNextPageBtn.addEventListener('click', onNextPage);
    if (fsZoomInBtn) fsZoomInBtn.addEventListener('click', zoomIn);
    if (fsZoomOutBtn) fsZoomOutBtn.addEventListener('click', zoomOut);
    if (fsRotateBtn) fsRotateBtn.addEventListener('click', rotatePdf);
    
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
        const planBtn = event.target.closest('.plan-btn');
        if (planBtn) {
            const modelTitle = planBtn.getAttribute('data-model-title');
            const modelDesc = planBtn.getAttribute('data-model-desc');
            const modelSrc = planBtn.getAttribute('data-model-src') || 'building-model.glb'; // フォールバック
            if (modelTitle && modelDesc) {
                event.preventDefault();
                showViewer(modelTitle, modelDesc, modelSrc);
            }
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

// 全画面PDFビューア機能
function enterFullscreen() {
    if (!pdfDoc) return;
    
    isFullscreen = true;
    fullscreenCanvas = document.getElementById('pdf-fullscreen-canvas');
    fullscreenCtx = fullscreenCanvas ? fullscreenCanvas.getContext('2d') : null;
    
    if (!fullscreenCanvas || !fullscreenCtx) return;
    
    const fullscreenOverlay = document.getElementById('pdf-fullscreen-overlay');
    fullscreenOverlay.classList.add('active');
    
    // ページ情報同期
    syncFullscreenPageInfo();
    
    // 全画面ページレンダリング
    renderFullscreenPage(pageNum);
    
    // body スクロール防止
    document.body.style.overflow = 'hidden';
    
    // ESCキーで全画面終了
    document.addEventListener('keydown', handleFullscreenEscape);
}

function exitFullscreen() {
    if (!isFullscreen) return;
    
    isFullscreen = false;
    
    const fullscreenOverlay = document.getElementById('pdf-fullscreen-overlay');
    fullscreenOverlay.classList.remove('active');
    
    // body スクロール復元
    document.body.style.overflow = '';
    
    // ESCキー監視削除
    document.removeEventListener('keydown', handleFullscreenEscape);
    
    // 通常モードでPDF再レンダリング
    renderPage(pageNum);
}

function handleFullscreenEscape(e) {
    if (e.key === 'Escape') {
        exitFullscreen();
    }
}

function renderFullscreenPage(num) {
    if (!pdfDoc || !fullscreenCanvas || !fullscreenCtx || !isFullscreen) return;
    
    pageRendering = true;
    
    try {
        pdfDoc.getPage(num).then(function(page) {
            const viewer = document.querySelector('.pdf-fullscreen-viewer');
            if (!viewer) return;
            
            const viewport = page.getViewport({ scale: 1, rotation });
            
            // 全画面モードでスクリーンサイズに適応 - 表示領域最大化
            const scaleX = (viewer.clientWidth - 20) / viewport.width;
            const scaleY = (viewer.clientHeight - 20) / viewport.height;
            let baseScale = Math.min(scaleX, scaleY);
            
            // マニュアルズーム適用
            const finalScale = baseScale * manualScale;
            
            // 全画面モードズーム範囲 - 読みやすさのため広範囲対応
            const minScale = baseScale * 0.3;
            const maxScale = baseScale * 8;
            const clampedScale = Math.max(minScale, Math.min(maxScale, finalScale));
            
            const devicePixelRatio = window.devicePixelRatio || 1;
            const scaledViewport = page.getViewport({ 
                scale: clampedScale * devicePixelRatio, 
                rotation 
            });
            
            fullscreenCanvas.height = scaledViewport.height;
            fullscreenCanvas.width = scaledViewport.width;
            fullscreenCanvas.style.height = `${scaledViewport.height / devicePixelRatio}px`;
            fullscreenCanvas.style.width = `${scaledViewport.width / devicePixelRatio}px`;
            
            const renderContext = {
                canvasContext: fullscreenCtx,
                viewport: scaledViewport
            };
            
            page.render(renderContext).promise.then(function() {
                pageRendering = false;
                if (pageNumPending !== null) {
                    if (isFullscreen) {
                        renderFullscreenPage(pageNumPending);
                        syncFullscreenPageInfo();
                    } else {
                        renderPage(pageNumPending);
                    }
                    pageNumPending = null;
                }
            });
            
        }).catch(function(error) {
            console.error('Error rendering fullscreen PDF page:', error);
            pageRendering = false;
        });
        
    } catch (error) {
        console.error('Error in renderFullscreenPage:', error);
        pageRendering = false;
    }
}

function syncFullscreenPageInfo() {
    // 全画面コントロールバーにページ番号情報同期
    const fsPageNum = document.getElementById('fs-page-num');
    const fsPageCount = document.getElementById('fs-page-count');
    const pageNumElement = document.getElementById('page-num');
    const pageCountElement = document.getElementById('page-count');
    
    if (fsPageNum && pageNumElement) {
        fsPageNum.textContent = pageNumElement.textContent;
    }
    if (fsPageCount && pageCountElement) {
        fsPageCount.textContent = pageCountElement.textContent;
    }
}

// DOM読み込み完了後に初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}