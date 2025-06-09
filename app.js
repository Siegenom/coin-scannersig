// app.js
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const videoElement = document.getElementById('cameraFeed');
    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('captureButton');
    const stopButton = document.getElementById('stopButton');
    const fileInput = document.getElementById('fileInput');
    const initialImageDisplay = document.getElementById('initialImageDisplay'); // 初期画像表示用 img
    const hiddenImageForProcessing = document.getElementById('hiddenImageForProcessing'); // 処理用隠し img
    const appVersionElement = document.getElementById('appVersion'); // アプリケーションバージョン表示要素
    const appChangesElement = document.getElementById('appChanges'); // アプリケーション変更点表示要素
    const fileInputContainer = document.getElementById('fileInputContainer'); // ファイル入力コンテナ
    const loadingSpinnerButton = document.getElementById('loadingSpinnerButton'); // ボタンのスピナー
    const controlButtonsContainer = document.getElementById('controlButtonsContainer'); // ボタンコンテナ

    // アプリケーションのバージョンと変更点
    const APP_VERSION = "v1.0.11"; // バージョンを更新
    const APP_CHANGES = "処理中ステータス表示強化とアニメーション。カメラエラー詳細化。"; // 今回の変更点

    if (appVersionElement) {
        appVersionElement.innerText = APP_VERSION;
    }
    if (appChangesElement) {
        appChangesElement.innerText = `変更点: ${APP_CHANGES}`;
    }

    // 結果表示要素
    const count100 = document.getElementById('count100');
    const count50 = document.getElementById('count50');
    const count10 = document.getElementById('count10');
    const count5 = document.getElementById('count5');
    const count1 = document.getElementById('count1');
    const totalAmount = document.getElementById('totalAmount');

    let videoStream = null;
    let animationFrameId = null;
    let isCameraRunning = false;
    let isProcessingLoopActive = false; // requestAnimationFrame ループがアクティブか
    let isProcessingImage = false; // 画像処理中（フリーズ防止用）
    let statusAnimationInterval = null; // ステータスアニメーションのインターバルID

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
            }, 500); // 0.5秒ごとにドットを更新
        }
    }

    // --- UIの無効化/有効化を管理する関数 ---
    function setUiState(isProcessing) {
        fileInput.disabled = isProcessing;
        captureButton.disabled = isProcessing;
        stopButton.disabled = isProcessing;

        if (isProcessing) {
            fileInputContainer.classList.add('processing-indicator');
            controlButtonsContainer.classList.add('processing-indicator');
            loadingSpinnerButton.style.display = 'block';
            if (!isCameraRunning) { // カメラでなければカーソル変更
                 initialImageDisplay.style.cursor = 'not-allowed';
                 outputCanvas.style.cursor = 'not-allowed';
            }
        } else {
            fileInputContainer.classList.remove('processing-indicator');
            controlButtonsContainer.classList.remove('processing-indicator');
            loadingSpinnerButton.style.display = 'none';
            initialImageDisplay.style.cursor = 'pointer';
            outputCanvas.style.cursor = 'pointer';
        }
    }


    updateStatus("OpenCV.jsをロード中...", "info", true); // ロード中はアニメーション表示

    // --- OpenCV.jsの初期化コールバックを設定 ---
    window.Module = window.Module || {};
    window.Module.onRuntimeInitialized = function() {
        try {
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            updateStatus("OpenCV.jsが正常にロードされました！", "success");
            console.log("OpenCV.jsが正常にロードされました！");

            setUiState(false); // UIを有効化
            captureButton.disabled = false;
            stopButton.disabled = true; // 最初は停止ボタンは無効

            captureButton.addEventListener('click', toggleCamera);
            stopButton.addEventListener('click', stopProcessing);
            fileInput.addEventListener('change', handleImageUpload);

            // --- 初期画像の処理を開始 ---
            // hiddenImageForProcessingが完全にロードされてから処理を開始
            if (hiddenImageForProcessing.complete && hiddenImageForProcessing.naturalWidth > 0) {
                 requestAnimationFrame(() => processInitialImage(hiddenImageForProcessing));
            } else {
                hiddenImageForProcessing.onload = () => {
                    requestAnimationFrame(() => processInitialImage(hiddenImageForProcessing));
                };
                hiddenImageForProcessing.onerror = () => {
                    updateStatus(`初期画像 (${hiddenImageForProcessing.src}) のロードに失敗しました。`, "danger");
                    console.error("初期画像ロードエラー:", hiddenImageForProcessing.src);
                    outputCanvas.style.display = 'none'; 
                    initialImageDisplay.style.display = 'none'; 
                    setUiState(false); // UIを有効化
                    captureButton.innerText = 'カメラ起動';
                    stopButton.disabled = true;
                };
            }

        } catch (e) {
            updateStatus(`OpenCV.jsの初期化に失敗しました: ${e.message}`, "danger");
            console.error("OpenCV.js 初期化エラー:", e);
            setUiState(true); // 失敗時はUIを無効化
            captureButton.disabled = true; // ボタンを無効化
            stopButton.disabled = true;
            fileInput.disabled = true;
        }
    };

    // --- 初期画像のロードと処理 ---
    function processInitialImage(imageElement) {
        updateStatus("初期画像を処理中...", "info", true); // 処理中はアニメーション
        setUiState(true); // UIを無効化

        videoElement.style.display = 'none';
        
        outputCanvas.width = imageElement.naturalWidth;
        outputCanvas.height = imageElement.naturalHeight;
        outputContext.drawImage(imageElement, 0, 0, outputCanvas.width, outputCanvas.height);
        outputCanvas.style.display = 'block'; 

        let srcMat = cv.imread(imageElement); 
        
        processAndDisplayCoins(srcMat); 
        srcMat.delete(); // メモリ解放

        updateStatus("初期画像の処理が完了しました。", "success");
        
        setUiState(false); // UIを有効化
        captureButton.innerText = 'カメラ起動';
        stopButton.disabled = true; // 初期画像処理後は停止ボタンは無効
    }

    // --- カメラの起動/停止の切り替え ---
    async function toggleCamera() {
        if (!isCameraRunning) {
            startCamera();
        } else {
            stopCamera();
        }
    }

    async function startCamera() {
        if (isCameraRunning) return;

        updateStatus("カメラを起動中...", "warning", true); // 起動中はアニメーション
        setUiState(true); // UIを無効化 (カメラ起動中はファイル選択不可)
        
        stopProcessingLoop(); 
        initialImageDisplay.style.display = 'none'; // 初期画像を非表示
        outputCanvas.style.display = 'block'; // カメラ映像表示のためにcanvasを表示

        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoElement.srcObject = videoStream;
            
            isCameraRunning = true;
            captureButton.innerText = 'カメラ停止';
            captureButton.classList.remove('btn-primary');
            captureButton.classList.add('btn-danger'); 
            stopButton.disabled = false;

            videoElement.onloadedmetadata = () => {
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                updateStatus("カメラが起動しました！ 計数処理中...", "success", true); // 処理中はアニメーション
                
                videoElement.play();
                startProcessingLoop(processCameraFrame); 
            };

        } catch (err) {
            const errorMessage = `カメラへのアクセスに失敗しました。詳細: ${err.name} - ${err.message}`;
            updateStatus(errorMessage, "danger"); // エラー詳細化
            console.error("カメラアクセスエラー:", err);
            isCameraRunning = false;
            captureButton.innerText = 'カメラ起動';
            captureButton.classList.remove('btn-danger');
            captureButton.classList.add('btn-primary');
            stopButton.disabled = true;
            videoStream = null;
            outputCanvas.style.display = 'none'; 
            initialImageDisplay.style.display = 'block'; // エラー時は初期画像を表示に戻す
            setUiState(false); // UIを有効化
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoStream = null;
        }
        isCameraRunning = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
        stopButton.disabled = true; 
        stopProcessingLoop(); 
        updateStatus("カメラが停止しました。", "info");
        resetCounts();
        outputCanvas.style.display = 'none'; 
        initialImageDisplay.style.display = 'block'; 
        setUiState(false); // UIを有効化
    }

    // --- 汎用的な処理停止 ---
    function stopProcessing() {
        if (isCameraRunning) {
            stopCamera(); 
        } else {
            stopProcessingLoop(); 
            outputCanvas.style.display = 'none'; 
            updateStatus("画像処理を停止しました。", "info");
            resetCounts();
        }
        initialImageDisplay.style.display = 'block'; 
        setUiState(false); // UIを有効化
        captureButton.innerText = 'カメラ起動';
    }

    function startProcessingLoop(processFunction) {
        if (isProcessingLoopActive) cancelAnimationFrame(animationFrameId); 
        isProcessingLoopActive = true;
        const loop = () => {
            if (isProcessingLoopActive) { 
                processFunction();
                animationFrameId = requestAnimationFrame(loop);
            }
        };
        animationFrameId = requestAnimationFrame(loop);
    }

    function stopProcessingLoop() {
        if (isProcessingLoopActive) {
            cancelAnimationFrame(animationFrameId);
            isProcessingLoopActive = false;
            updateStatus("処理が中断されました。", "info"); // ループ停止時のステータス
        }
    }

    function resetCounts() {
        count100.innerText = '0';
        count50.innerText = '0';
        count10.innerText = '0';
        count5.innerText = '0';
        count1.innerText = '0';
        totalAmount.innerText = '0';
    }

    // --- カメラフレームの処理 ---
    function processCameraFrame() {
        if (videoElement.paused || videoElement.ended || !isCameraRunning) {
            return;
        }

        outputContext.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
        let srcMat = cv.imread(outputCanvas);
        
        processAndDisplayCoins(srcMat); 
        
        srcMat.delete();
    }

    // --- 画像ファイルアップロードの処理 ---
    function handleImageUpload(event) {
        stopCamera(); 
        stopProcessingLoop(); 
        initialImageDisplay.style.display = 'none'; // 初期画像を非表示
        resetCounts(); 
        outputCanvas.style.display = 'block'; // canvasを表示

        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                updateStatus("画像を読み込み中...", "warning", true); // 読み込み中はアニメーション
                setUiState(true); // UI無効化

                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height); 
                
                updateStatus("画像処理を開始中...", "info", true); // 処理中はアニメーション
                
                let srcMat = cv.imread(img); // Image要素から直接imreadを呼び出す
                processAndDisplayCoins(srcMat); 
                srcMat.delete(); 

                updateStatus("画像処理が完了しました！", "success");
                setUiState(false); // UI有効化
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = false; 
            };
            img.onerror = function() {
                updateStatus("画像の読み込みに失敗しました。", "danger");
                console.error("画像読み込みエラー:", this.src);
                outputCanvas.style.display = 'none'; 
                setUiState(false); // UI有効化
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = true;
                initialImageDisplay.style.display = 'block'; 
            };
            img.src = URL.createObjectURL(file);
        } else {
            updateStatus("ファイルが選択されていません。", "warning");
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block'; 
            setUiState(false); // UI有効化
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