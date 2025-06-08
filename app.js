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

            // --- 初期画像の処理を開始 ---
            // initialImageDisplayが完全にロードされてから処理を開始
            if (initialImageDisplay.complete) {
                processInitialImage();
            } else {
                initialImageDisplay.onload = processInitialImage;
                initialImageDisplay.onerror = () => {
                    statusElement.innerText = "初期画像のロードに失敗しました。";
                    statusElement.className = "alert alert-danger text-center";
                    outputCanvas.style.display = 'none';
                    console.error("初期画像ロードエラー: ", initialImageDisplay.src);
                };
            }

        } catch (e) {
            statusElement.innerText = `OpenCV.jsの初期化に失敗しました: ${e.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("OpenCV.js 初期化エラー:", e);
        }
    };

    // --- 初期画像のロードと処理 ---
    function processInitialImage() {
        statusElement.innerText = "初期画像を処理中...";
        statusElement.className = "alert alert-info text-center";

        // カメラ映像要素とfileInput要素を非表示/無効化
        videoElement.style.display = 'none';
        fileInput.disabled = false; // ファイル入力は常に有効にしておく
        
        // initialImageDisplay は表示したまま、hiddenImageForProcessing を使って処理
        outputCanvas.width = hiddenImageForProcessing.naturalWidth;
        outputCanvas.height = hiddenImageForProcessing.naturalHeight;
        outputCanvas.style.display = 'block'; // canvasを表示

        let srcMat = cv.imread(hiddenImageForProcessing);
        processAndDisplayCoins(srcMat); // 画像処理と表示
        srcMat.delete(); // メモリ解放

        statusElement.innerText = "初期画像の処理が完了しました。";
        statusElement.className = "alert alert-success text-center";
        
        // ボタン状態をリセットして、カメラやファイル選択ができるようにする
        captureButton.disabled = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
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

        statusElement.innerText = "カメラを起動中...";
        statusElement.className = "alert alert-warning text-center";
        
        stopProcessingLoop(); // 既存の画像処理ループがあれば停止
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
            captureButton.classList.add('btn-danger'); // 停止ボタンの色に変更
            stopButton.disabled = false;

            videoElement.onloadedmetadata = () => {
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                statusElement.innerText = "カメラが起動しました！ 計数処理中...";
                statusElement.className = "alert alert-success text-center";
                
                videoElement.play();
                startProcessingLoop(processCameraFrame); // カメラ映像処理ループを開始
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
        stopButton.disabled = true; // カメラ停止で停止ボタンは常に無効化
        stopProcessingLoop(); // カメラ停止時に処理ループも停止
        statusElement.innerText = "カメラが停止しました。";
        statusElement.className = "alert alert-info text-center";
        resetCounts();
        outputCanvas.style.display = 'none'; // カメラ停止時はcanvasも非表示
        initialImageDisplay.style.display = 'block'; // 初期画像を表示に戻す
    }

    // --- 汎用的な処理停止 ---
    function stopProcessing() {
        if (isCameraRunning) {
            stopCamera(); // カメラが動いていればカメラ停止
        } else {
            // カメラが動いていないが、画像処理ループがアクティブな場合
            stopProcessingLoop(); 
            outputCanvas.style.display = 'none'; // canvasも非表示
            statusElement.innerText = "画像処理を停止しました。";
            statusElement.className = "alert alert-info text-center";
            resetCounts();
        }
        // 処理停止後は、初期画像を表示し、カメラ起動/ファイル選択可能な状態に戻す
        initialImageDisplay.style.display = 'block'; 
        captureButton.disabled = false;
        captureButton.innerText = 'カメラ起動';
        captureButton.classList.remove('btn-danger');
        captureButton.classList.add('btn-primary');
        stopButton.disabled = true;
    }

    function startProcessingLoop(processFunction) {
        if (isProcessingLoopActive) cancelAnimationFrame(animationFrameId); // 既存のループを停止
        isProcessingLoopActive = true;
        const loop = () => {
            if (isProcessingLoopActive) { // ループがアクティブな場合のみ処理
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
        
        processAndDisplayCoins(srcMat); // コイン処理関数を呼び出す
        
        srcMat.delete();
    }

    // --- 画像ファイルアップロードの処理 ---
    function handleImageUpload(event) {
        stopCamera(); // 画像アップロード時はカメラを停止
        stopProcessingLoop(); // 既存のループを停止
        initialImageDisplay.style.display = 'none'; // 初期画像を非表示
        resetCounts(); // 結果表示をリセット
        outputCanvas.style.display = 'block'; // canvasを表示

        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height);
                statusElement.innerText = "画像が読み込まれました。処理中...";
                statusElement.className = "alert alert-success text-center";
                
                let srcMat = cv.imread(outputCanvas);
                processAndDisplayCoins(srcMat); // 画像処理と表示
                srcMat.delete(); // メモリ解放

                statusElement.innerText = "画像処理が完了しました！";
                captureButton.disabled = false; // カメラ起動を再度有効化
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = false; // 停止ボタンは有効
            };
            img.onerror = function() {
                statusElement.innerText = "画像の読み込みに失敗しました。";
                statusElement.className = "alert alert-danger text-center";
                console.error("画像読み込みエラー:", this.src);
                outputCanvas.style.display = 'none'; // エラー時はcanvasを非表示
                captureButton.disabled = false;
                captureButton.innerText = 'カメラ起動';
                stopButton.disabled = true;
                initialImageDisplay.style.display = 'block'; // 初期画像を表示に戻す
            };
            img.src = URL.createObjectURL(file);
        } else {
            statusElement.innerText = "ファイルが選択されていません。";
            statusElement.className = "alert alert-warning text-center";
            outputCanvas.style.display = 'none';
            initialImageDisplay.style.display = 'block'; // 初期画像を表示に戻す
        }
    }

    // --- コイン認識・計数および表示の共通ロジック ---
    function processAndDisplayCoins(srcMat) {
        let dstMat = new cv.Mat();

        // 例: グレースケール変換とCannyエッジ検出
        cv.cvtColor(srcMat, dstMat, cv.COLOR_RGBA2GRAY);
        cv.Canny(dstMat, dstMat, 50, 100, 3, false); // Cannyエッジ検出

        // 処理結果をcanvasに表示
        cv.imshow('outputCanvas', dstMat); 

        // コインの検出・計数処理 (ダミー関数)
        const counts = detectAndCountCoins(srcMat); // 元のカラー画像（srcMat）を渡す
        updateDisplay(counts);

        dstMat.delete();
    }

    // --- コイン認識・計数ロジック（ダミー） ---
    function detectAndCountCoins(imageMat) {
        const dummyCounts = {
            '100': Math.floor(Math.random() * 5),
            '50': Math.floor(Math.random() * 5),
            '10': Math.floor(Math.random() * 5),
            '5': Math.floor(Math.random() * 5),
            '1': Math.floor(Math.random() * 5),
        };
        return dummyCounts;
    }

    // --- 結果表示の更新 ---
    function updateDisplay(counts) {
        count100.innerText = counts['100'];
        count50.innerText = counts['50'];
        count10.innerText = counts['10'];
        count5.innerText = counts['5'];
        count1.innerText = counts['1'];

        const total = (counts['100'] * 100) + (counts['
