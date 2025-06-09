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

    // アプリケーションのバージョンと変更点
    const APP_VERSION = "v1.0.11"; // バージョンを更新
    const APP_CHANGES = "Gitログ表示強化。画像処理中UX改善。停止ボタン機能拡張。"; // 今回の変更点

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
    let isProcessingLoopActive = false;
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
        // stopButtonは常に有効/無効を直接制御するため、ここでは制御しない

        if (isProcessing) {
            fileInputContainer.classList.add('processing-indicator');
            controlButtonsContainer.classList.add('processing-indicator');
            loadingSpinnerButton.style.display = 'block';
            initialImageDisplay.style.cursor = 'not-allowed'; // カーソルを変更
            outputCanvas.style.cursor = 'not-allowed'; // カーソルを変更
        } else {
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

            setUiState(false); // UIを有効化
            captureButton.disabled = false;
            stopButton.disabled = true;

            captureButton.addEventListener('click', toggleCamera);
            stopButton.addEventListener('click', stopProcessing);
            fileInput.addEventListener('change', handleImageUpload);

            // 初期画像はHTMLで表示するのみ。ユーザーが画像をタップしたら処理を開始。
            initialImageDisplay.style.display = 'block'; // 初期画像を表示
            outputCanvas.style.display = 'none'; // outputCanvasは非表示
            initialImageDisplay.addEventListener('click', () => {
                // 画像が完全にロードされていれば処理を開始
                if (!isProcessingImage && !isCameraRunning && initialImageDisplay.complete && initialImageDisplay.naturalWidth > 0) { 
                    processDisplayedImage(initialImageDisplay);
                } else if (!isProcessingImage && !isCameraRunning) {
                    updateStatus("画像がまだ読み込まれていません。", "warning");
                }
            });

            updateStatus("画像をタップするか、ファイルを選択、またはカメラを起動してください。", "success");

        } catch (e) {
            updateStatus(`OpenCV.jsの初期化に失敗しました: ${e.message}`, "danger");
            console.error("OpenCV.js 初期化エラー:", e);
            setUiState(true); // 失敗時はUIを無効化
            captureButton.disabled = true;
            stopButton.disabled = true;
            fileInput.disabled = true;
        }
    };

    // --- 初期画像のロードと処理 ---
    function processDisplayedImage(imageElement) {
        if (isProcessingImage) return; 
        isProcessingImage = true;
        
        updateStatus("画像処理を開始します...", "info", true); // 処理中はアニメーション
        setUiState(true); // UIを無効化

        videoElement.style.display = 'none';
        
        outputCanvas.width = imageElement.naturalWidth;
        outputCanvas.height = imageElement.naturalHeight;
        outputContext.drawImage(imageElement, 0, 0, outputCanvas.width, outputCanvas.height);
        
        initialImageDisplay.style.display = 'none'; // 処理中は初期画像を非表示
        outputCanvas.style.display = 'block'; // Canvasを表示

        try {
            let srcMat = cv.imread(imageElement); 
            processAndDisplayCoins(srcMat); 
            srcMat.delete(); 

            updateStatus("画像処理が完了しました！", "success");

        } catch (e) {
            updateStatus(`画像処理中にエラーが発生しました: ${e.message}`, "danger");
            console.error("画像処理エラー:", e);
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block'; 
        } finally {
            isProcessingImage = false; 
            setUiState(false); // UIを有効化
            captureButton.innerText = 'カメラ起動';
            stopButton.disabled = true; // 画像処理完了後は停止ボタンは無効
        }
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

        updateStatus("カメラを起動中...", "warning", true); 
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
                updateStatus("カメラが起動しました！ 計数処理中...", "success", true); 
                
                videoElement.play();
                startProcessingLoop(processCameraFrame); 
            };

        } catch (err) {
            const errorMessage = `カメラへのアクセスに失敗しました。詳細: ${err.name || "不明なエラー"} - ${err.message || "詳細なし"}`;
            updateStatus(errorMessage, "danger"); 
            console.error("カメラアクセスエラー:", err);
            isCameraRunning = false;
            captureButton.innerText = 'カメラ起動';
            captureButton.classList.remove('btn-danger');
            captureButton.classList.add('btn-primary');
            stopButton.disabled = true;
            videoStream = null;
            outputCanvas.style.display = 'none'; 
            initialImageDisplay.style.display = 'block'; 
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
        captureButton.classList.remove('btn-primary');
        captureButton.classList.add('btn-primary'); // 色をプライマリに戻す
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
        } else if (isProcessingImage || isProcessingLoopActive) { // 画像処理中またはループがアクティブな場合
            stopProcessingLoop(); 
            outputCanvas.style.display = 'none'; 
            updateStatus("画像処理を停止しました。", "info");
            resetCounts();
            // 処理停止後は、初期画像を表示し、カメラ起動/ファイル選択可能な状態に戻す
            initialImageDisplay.style.display = 'block'; 
            setUiState(false); // UIを有効化
            captureButton.innerText = 'カメラ起動';
            stopButton.disabled = true;
        }
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
                updateStatus("画像を読み込み中...", "warning", true);
                setUiState(true); // UI無効化

                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height); 
                
                updateStatus("画像処理を開始中...", "info", true);
                
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