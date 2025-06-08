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
    const APP_VERSION = "v1.0.8"; // バージョンを更新
    const APP_CHANGES = "初期画像ロード時の'IndexSizeError'修正 (onloadイベントの強化)。"; // 今回の変更点

    if (appVersionElement) {
        appVersionElement.innerText = `Version: ${APP_VERSION}`;
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

    let videoStream = null; // カメラのストリームを保持
    let animationFrameId = null; // requestAnimationFrame のIDを保持
    let isCameraRunning = false; // カメラがアクティブな状態か
    let isProcessingLoopActive = false; // requestAnimationFrame ループがアクティブか

    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info text-center";

    // --- OpenCV.jsの初期化コールバックを設定 ---
    window.Module = window.Module || {};
    window.Module.onRuntimeInitialized = function() {
        try {
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            statusElement.innerText = "OpenCV.jsが正常にロードされました！";
            statusElement.className = "alert alert-success text-center";
            console.log("OpenCV.jsが正常にロードされました！");

            captureButton.disabled = false; // カメラ起動ボタンを有効化
            stopButton.disabled = true;

            captureButton.addEventListener('click', toggleCamera);
            stopButton.addEventListener('click', stopProcessing); // 停止ボタンは共通化
            fileInput.addEventListener('change', handleImageUpload);

            // --- 初期画像のロード完了を待ってから処理を開始 ---
            // hiddenImageForProcessingが完全にロードされてから処理を開始
            if (hiddenImageForProcessing.complete && hiddenImageForProcessing.naturalWidth > 0) {
                processInitialImage(hiddenImageForProcessing);
            } else {
                hiddenImageForProcessing.onload = () => processInitialImage(hiddenImageForProcessing);
                hiddenImageForProcessing.onerror = () => {
                    statusElement.innerText = "初期画像 (" + hiddenImageForProcessing.src + ") のロードに失敗しました。";
                    statusElement.className = "alert alert-danger text-center";
                    console.error("初期画像ロードエラー: ", hiddenImageForProcessing.src);
                    // エラー時はoutputCanvasを非表示にし、ボタン状態をリセット
                    outputCanvas.style.display = 'none'; 
                    captureButton.disabled = false;
                    captureButton.innerText = 'カメラ起動';
                    stopButton.disabled = true;
                };
            }

        } catch (e) {
            statusElement.innerText = `OpenCV.jsの初期化に失敗しました: ${e.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("OpenCV.js 初期化エラー:", e);
        }
    };

    // --- 初期画像のロードと処理 ---
    // imageElement: 処理対象のHTMLImageElement (hiddenImageForProcessing)
    function processInitialImage(imageElement) {
        statusElement.innerText = "初期画像を処理中...";
        statusElement.className = "alert alert-info text-center";

        videoElement.style.display = 'none';
        
        // Canvasのサイズを画像に合わせる
        outputCanvas.width = imageElement.naturalWidth;
        outputCanvas.height = imageElement.naturalHeight;
        
        // 画像をCanvasに描画する（displayMatに描画するための一時的な表示用）
        outputContext.drawImage(imageElement, 0, 0, outputCanvas.width, outputCanvas.height);
        outputCanvas.style.display = 'block'; // Canvasを表示

        // Image要素から直接imreadを呼び出す
        let srcMat = cv.imread(imageElement); 
        
        processAndDisplayCoins(srcMat); 
        srcMat.delete(); 

        statusElement.innerText = "初期画像の処理が完了しました。";
        statusElement.className = "alert alert-success text-center";
        
        captureButton.disabled = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
        stopButton.disabled = true;
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

        statusElement.innerText = "カメラを起動中...";
        statusElement.className = "alert alert-warning text-center";
        
        stopProcessingLoop(); 
        initialImageDisplay.style.display = 'none'; // 初期画像を非表示
        outputCanvas.style.display = 'block'; // カメラ映像表示のためにcanvasを表示

        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoElement.srcObject = videoStream;
            videoElement.style.display = 'block'; // video要素を表示
            
            isCameraRunning = true;
            captureButton.innerText = 'カメラ停止';
            captureButton.classList.remove('btn-primary');
            captureButton.classList.add('btn-danger'); 
            stopButton.disabled = false;

            videoElement.onloadedmetadata = () => {
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                statusElement.innerText = "カメラが起動しました！ 計数処理中...";
                statusElement.className = "alert alert-success text-center";
                
                videoElement.play();
                startProcessingLoop(processCameraFrame); 
            };

        } catch (err) {
            statusElement.innerText = `カメラへのアクセスに失敗しました: ${err.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("カメラアクセスエラー:", err);
            isCameraRunning = false;
            captureButton.innerText = 'カメラ起動';
            captureButton.classList.remove('btn-danger');
            captureButton.classList.add('btn-primary');
            stopButton.disabled = true;
            videoStream = null;
            outputCanvas.style.display = 'none'; // エラー時はcanvasを非表示
            initialImageDisplay.style.display = 'block'; // 初期画像を表示に戻す
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
            videoStream = null;
        }
        isCameraRunning = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
        stopButton.disabled = true; 
        stopProcessingLoop(); 
        statusElement.innerText = "カメラが停止しました。";
        statusElement.className = "alert alert-info text-center";
        resetCounts();
        outputCanvas.style.display = 'none'; 
        initialImageDisplay.style.display = 'block'; 
    }

    // --- 汎用的な処理停止 ---
    function stopProcessing() {
        if (isCameraRunning) {
            stopCamera(); 
        } else {
            stopProcessingLoop(); 
            outputCanvas.style.display = 'none'; 
            statusElement.innerText = "画像処理を停止しました。";
            statusElement.className = "alert alert-info text-center";
            resetCounts();
        }
        initialImageDisplay.style.display = 'block'; 
        captureButton.disabled = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
        stopButton.disabled = true;
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
        initialImageDisplay.style.display = 'none'; 
        resetCounts(); 
        outputCanvas.style.display = 'block'; 

        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height); 
                
                statusElement.innerText = "画像が読み込まれました。処理中...";
                statusElement.className = "alert alert-success text-center";
                
                let srcMat = cv.imread(img); // Image要素から直接imreadを呼び出す
                processAndDisplayCoins(srcMat); 
                srcMat.delete(); 

                statusElement.innerText = "画像処理が完了しました！";
                captureButton.disabled = false; 
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = false; 
            };
            img.onerror = function() {
                statusElement.innerText = "画像の読み込みに失敗しました。";
                statusElement.className = "alert alert-danger text-center";
                console.error("画像読み込みエラー:", this.src);
                outputCanvas.style.display = 'none'; 
                captureButton.disabled = false;
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = true;
                initialImageDisplay.style.display = 'block'; 
            };
            img.src = URL.createObjectURL(file);
        } else {
            statusElement.innerText = "ファイルが選択されていません。";
            statusElement.className = "alert alert-warning text-center";
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block'; 
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
    function detectAndCountCoins(imageMat, detectedCount = 0) {
        const dummyCounts = {
            '100': 0,
            '50': 0,
            '10': 0,
            '5': 0,
            '1': 0,
        };

        if (detectedCount > 0) {
            dummyCounts['10'] = detectedCount;
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