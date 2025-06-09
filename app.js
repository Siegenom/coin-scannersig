// app.js
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const videoElement = document.getElementById('cameraFeed'); // 参照は残すが使用しない
    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('captureButton'); // 参照は残すが使用しない
    const stopButton = document.getElementById('stopButton');
    const fileInput = document.getElementById('fileInput');
    const initialImageDisplay = document.getElementById('initialImageDisplay');
    const hiddenImageForProcessing = document.getElementById('hiddenImageForProcessing');
    const appVersionDisplay = document.getElementById('appVersionDisplay');
    const appChangesDisplay = document.getElementById('appChangesDisplay');
    const fileInputContainer = document.getElementById('fileInputContainer');
    const loadingSpinnerButton = document.getElementById('loadingSpinnerButton');
    const controlButtonsContainer = document.getElementById('controlButtonsContainer');

    const APP_VERSION = "v1.2.1"; // バージョンを更新
    const APP_CHANGES = "UI要素の参照エラー修正。"; // 今回の変更点

    if (appVersionDisplay) {
        appVersionDisplay.innerText = APP_VERSION;
    }
    if (appChangesDisplay) {
        appChangesDisplay.innerText = `変更点: ${APP_CHANGES}`;
    }

    const count100 = document.getElementById('count100');
    const count50 = document.getElementById('count50');
    const count10 = document.getElementById('count10');
    const count5 = document.getElementById('count5');
    const count1 = document.getElementById('count1');
    const totalAmount = document.getElementById('totalAmount');

    // let videoStream = null; // カメラ機能サスペンドのため不要
    // let animationFrameId = null; // カメラサスペンドのため不要
    // let isCameraRunning = false; // カメラサスペンドのため不要
    // let isProcessingLoopActive = false; // カメラサスペンドのため不要

    let isProcessingImageTask = false; 
    let statusAnimationInterval = null; 
    let processingTimeout = null; 

    // --- ステータス表示とアニメーションを管理する関数 ---
    function updateStatus(message, type, animate = false) {
        statusElement.innerText = message;
        statusElement.className = `alert alert-${type} text-center`;

        if (statusAnimationInterval) {
            clearInterval(statusAnimationInterval);
            statusAnimationInterval = null;
        }

        if (animate) {
            let dotCount = 0;
            statusAnimationInterval = setInterval(() => {
                dotCount = (dotCount % 3) + 1;
                statusElement.innerText = message + ".".repeat(dotCount);
            }, 500);
        }
    }

    // --- UIの無効化/有効化を管理する関数 ---
    function setUiState(processingState) { // 'loading', 'ready'
        if (processingState === 'loading') { 
            fileInput.disabled = true;
            if (captureButton) captureButton.disabled = true; // captureButtonが存在すれば無効化
            stopButton.disabled = false; // 停止ボタンは常に有効にする

            fileInputContainer.classList.add('processing-indicator');
            controlButtonsContainer.classList.add('processing-indicator');
            loadingSpinnerButton.style.display = 'block';
            initialImageDisplay.style.cursor = 'not-allowed';
            outputCanvas.style.cursor = 'not-allowed';
        } else if (processingState === 'ready') { 
            fileInput.disabled = false;
            if (captureButton) captureButton.disabled = false; // captureButtonが存在すれば有効化
            stopButton.disabled = true; // デフォルトで停止ボタンは無効

            fileInputContainer.classList.remove('processing-indicator');
            controlButtonsContainer.classList.remove('processing-indicator');
            loadingSpinnerButton.style.display = 'none';
            initialImageDisplay.style.cursor = 'pointer';
            outputCanvas.style.cursor = 'pointer';
        }
    }


    updateStatus("OpenCV.jsをロード中...", "info", true);

    // --- OpenCV.jsの初期化コールバックを設定 ---
    window.Module = window.Module || {};
    window.Module.onRuntimeInitialized = function() {
        try {
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            updateStatus("OpenCV.jsが正常にロードされました！", "success");
            console.log("OpenCV.jsが正常にロードされました！");

            setUiState('ready'); // UIを有効化
            if (captureButton) captureButton.disabled = false; // captureButtonが存在すれば有効化
            stopButton.disabled = true;

            if (captureButton) captureButton.addEventListener('click', () => { /* カメラ機能サスペンド */ });
            stopButton.addEventListener('click', stopProcessing);
            fileInput.addEventListener('change', handleImageUpload);

            // 初期画像はHTMLで表示するのみ。ユーザーが画像をタップしたら処理を開始。
            initialImageDisplay.style.display = 'block'; // 初期画像を表示
            outputCanvas.style.display = 'none'; // outputCanvasは非表示
            initialImageDisplay.addEventListener('click', () => {
                // 画像が完全にロードされていれば処理を開始
                if (!isProcessingImageTask && initialImageDisplay.complete && initialImageDisplay.naturalWidth > 0) { 
                    processInitialImage(initialImageDisplay);
                } else if (!isProcessingImageTask) { // 処理中でなければロード中表示
                    updateStatus("画像をロード中...", "warning", true); 
                    // 画像のonloadを再度トリガーする（画像がキャッシュされていても念のため）
                    const tempImg = new Image();
                    tempImg.src = initialImageDisplay.src;
                    tempImg.onload = () => {
                        requestAnimationFrame(() => processInitialImage(initialImageDisplay));
                    };
                    tempImg.onerror = () => {
                         updateStatus(`初期画像 (${initialImageDisplay.src}) のロードに失敗しました。`, "danger");
                         initialImageDisplay.style.display = 'none';
                         setUiState('ready');
                    };
                }
            });

            updateStatus("画像をタップするか、ファイルを選択してください。", "success"); // カメラ起動の文言を削除

        } catch (e) {
            updateStatus(`OpenCV.jsの初期化に失敗しました: ${e.message}`, "danger");
            console.error("OpenCV.js 初期化エラー:", e);
            setUiState('ready'); // UIを無効化
            if (captureButton) captureButton.disabled = true; // captureButtonが存在すれば無効化
            stopButton.disabled = true;
            fileInput.disabled = true;
        }
    };

    // --- 初期画像のロードと処理 ---
    function processInitialImage(imageElement) {
        if (isProcessingImageTask) return; 
        isProcessingImageTask = true; 
        
        updateStatus("画像処理を開始します...", "info", true); 
        setUiState('loading'); // UIを無効化 (停止ボタンは有効)

        // videoElement.style.display = 'none'; // カメラ機能サスペンドのため不要
        
        outputCanvas.width = imageElement.naturalWidth;
        outputCanvas.height = imageElement.naturalHeight;
        
        outputContext.drawImage(imageElement, 0, 0, outputCanvas.width, outputCanvas.height);
        
        initialImageDisplay.style.display = 'none'; // 処理中は初期画像を非表示
        outputCanvas.style.display = 'block'; // Canvasを表示

        // OpenCV処理を実行 (非同期で実行しUIブロックを避ける)
        processingTimeout = setTimeout(() => { // setTimeoutで実際の処理を遅延
            if (!isProcessingImageTask) return; // 処理中に停止された場合は中断

            try {
                let srcMat = cv.imread(imageElement); 
                processAndDisplayCoins(srcMat); 
                srcMat.delete(); // メモリ解放

                updateStatus("画像処理が完了しました！", "success");
            } catch (e) {
                updateStatus(`画像処理中にエラーが発生しました: ${e.message}`, "danger");
                console.error("画像処理エラー:", e);
                outputCanvas.style.display = 'none';
                initialImageDisplay.style.display = 'block'; 
            } finally {
                isProcessingImageTask = false; // 処理完了
                setUiState('ready'); // UIを有効化
                // captureButton.innerText = 'カメラ起動'; // カメラボタン削除のため不要
                stopButton.disabled = true; 
            }
        }, 50); // 50msの遅延
    }


    // --- カメラ関連関数は削除またはコメントアウト ---
    // async function toggleCamera() { ... } // app.jsに存在しないのでコメントアウト不要
    // async function startCamera() { ... } // app.jsに存在しないのでコメントアウト不要
    // function processCameraFrame() { ... } // app.jsに存在しないのでコメントアウト不要

    function stopCamera() { // カメラ機能サスペンド中のダミー関数
        // isCameraRunning = false; // カメラ関連のフラグは使わない
        // updateStatus("カメラが停止しました。", "info"); // カメラが停止した旨のステータスは不要
    }
    
    function startProcessingLoop() { // カメラがサスペンドされたため、このループは使わない
        // 処理内容なし
    }

    function stopProcessingLoop() { // stopProcessingから呼ばれるため、ダミーとして残す
        // 処理内容なし
    }

    // --- 汎用的な処理停止 ---
    function stopProcessing() {
        // カメラ機能サスペンドのため、カメラ関連の停止ロジックは削除
        
        // requestAnimationFrame ループがアクティブな場合 (現在カメラサスペンドで使われないが、念のため)
        if (isProcessingLoopActive) { 
            stopProcessingLoop(); 
            outputCanvas.style.display = 'none'; 
            updateStatus("画像処理を停止しました。", "info");
            resetCounts();
            initialImageDisplay.style.display = 'block'; 
            setUiState('ready'); 
            stopButton.disabled = true;
            return; // 処理完了
        } 
        
        // 単発の画像処理がアクティブな場合（画像タップやファイル選択）
        if (isProcessingImageTask) { 
            clearTimeout(processingTimeout); // setTimeoutをクリア
            isProcessingImageTask = false; // 処理を中断
            updateStatus("画像処理を中断しました。", "info");
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block';
            resetCounts();
            setUiState('ready'); 
            stopButton.disabled = true;
            return; // 処理完了
        } else { // その他、特に処理中でないが停止ボタンが押された場合
             updateStatus("操作を停止しました。", "info");
             setUiState('ready');
             stopButton.disabled = true;
        }
        // captureButton.innerText = 'カメラ起動'; // カメラボタン削除のため不要
    }

    function resetCounts() {
        count100.innerText = '0';
        count50.innerText = '0';
        count10.innerText = '0';
        count5.innerText = '0';
        count1.innerText = '0';
        totalAmount.innerText = '0';
    }

    // --- 画像ファイルアップロードの処理 ---
    function handleImageUpload(event) {
        stopCamera(); // カメラ機能サスペンドのため、実質ダミー呼び出し
        stopProcessingLoop(); // カメラ機能サスペンドのため、実質ダミー呼び出し
        initialImageDisplay.style.display = 'none'; // 初期画像を非表示
        resetCounts(); 
        outputCanvas.style.display = 'block'; // canvasを表示

        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                updateStatus("画像を読み込み中...", "warning", true); 
                setUiState('loading'); // UI無効化

                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height); 
                
                updateStatus("画像が読み込まれました。処理中...", "info", true); 
                isProcessingImageTask = true; 
                
                setTimeout(() => { 
                    if (!isProcessingImageTask) { 
                         updateStatus("画像処理が中断されました。", "info");
                         outputCanvas.style.display = 'none';
                         initialImageDisplay.style.display = 'block';
                         resetCounts();
                         setUiState('ready');
                         return;
                    }
                    try {
                        let srcMat = cv.imread(img); 
                        processAndDisplayCoins(srcMat); 
                        srcMat.delete(); 

                        updateStatus("画像処理が完了しました！", "success");
                    } catch (e) {
                        updateStatus(`画像処理中にエラーが発生しました: ${e.message}`, "danger");
                        console.error("画像処理エラー:", e);
                        outputCanvas.style.display = 'none'; 
                        initialImageDisplay.style.display = 'block'; 
                    } finally {
                        isProcessingImageTask = false; 
                        setUiState('ready'); 
                        // captureButton.innerText = 'カメラ起動'; // カメラボタン削除のため不要
                        stopButton.disabled = true; 
                    }
                }, 50); 
            };
            img.onerror = function() {
                updateStatus("画像の読み込みに失敗しました。", "danger");
                console.error("画像読み込みエラー:", this.src);
                outputCanvas.style.display = 'none'; 
                setUiState('ready'); 
                // captureButton.innerText = 'カメラ起動'; // カメラボタン削除のため不要
                stopButton.disabled = true;
                initialImageDisplay.style.display = 'block'; 
            };
            img.src = URL.createObjectURL(file);
        } else {
            updateStatus("ファイルが選択されていません。", "warning");
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block'; 
            setUiState('ready'); 
        }
    }

    // --- コイン認識・計数および表示の共通ロジック ---
    function processAndDisplayCoins(srcMat) {
        let dstMat = new cv.Mat();
        let circles = new cv.Mat(); 

        cv.cvtColor(srcMat, dstMat, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(dstMat, dstMat, new cv.Size(9, 9), 2, 2); 
        cv.Canny(dstMat, dstMat, 50, 100, 3, false); 

        let minRadius = Math.max(10, Math.floor(srcMat.cols / 40));
        let maxRadius = Math.min(200, Math.floor(srcMat.cols / 8)); 

        cv.HoughCircles(dstMat, circles, cv.HOUGH_GRADIENT, 1, 
                        minRadius, 
                        param1=100, param2=30, minRadius=minRadius, maxRadius=maxRadius); 
        
        let displayMat = new cv.Mat();
        cv.cvtColor(srcMat, displayMat, cv.COLOR_RGBA2RGB); 
        
        for (let i = 0; i < circles.cols; ++i) {
            let x = circles.data32F[i * 3];
            let y = circles.data32F[i * 3 + 1];
            let radius = circles.data32F[i * 3 + 2];
            let center = new cv.Point(x, y);
            cv.circle(displayMat, center, 3, new cv.Scalar(0, 255, 0, 255), -1);
            cv.circle(displayMat, center, radius, new cv.Scalar(255, 0, 0, 255), 3);
        }

        cv.imshow('outputCanvas', displayMat); 

        const detectedCoinCount = circles.cols;
        const counts = detectAndCountCoins(srcMat, detectedCoinCount); 
        updateDisplay(counts);

        dstMat.delete();
        circles.delete();
        displayMat.delete(); 
    }

    // --- コイン認識・計数ロジック（ダミー） ---
    function detectAndCountCoins(imageMat, detectedCoinCount = 0) { // 引数名をdetectedCountに統一
        const dummyCounts = {
            '100': 0,
            '50': 0,
            '10': 0,
            '5': 0,
            '1': 0,
        };

        if (detectedCoinCount > 0) {
            dummyCounts['10'] = detectedCoinCount;
        }
        
        return dummyCounts;
    }

    // --- 結果表示の更新 ---
    function updateDisplay(counts) {
        count100.innerText = counts['100'];
        count50.innerText = counts['50'];
        count10.innerText = counts['10'];
        count5.innerText = counts['5'];
        count1.innerText = counts['1'];

        const total = (counts['100'] * 100) + (counts['50'] * 50) +
                      (counts['10'] * 10) + (counts['5'] * 5) +
                      (counts['1'] * 1);
        totalAmount.innerText = total;
    }
});