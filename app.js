document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const videoElement = document.getElementById('cameraFeed');
    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('captureButton');
    const stopButton = document.getElementById('stopButton');
    const fileInput = document.getElementById('fileInput'); // ファイル入力要素への参照

    // 結果表示要素
    const count100 = document.getElementById('count100');
    const count50 = document.getElementById('count50');
    const count10 = document.getElementById('count10');
    const count5 = document.getElementById('count5');
    const count1 = document.getElementById('count1');
    const totalAmount = document.getElementById('totalAmount');

    let videoStream = null; // カメラのストリームを保持
    let animationFrameId = null; // requestAnimationFrame のIDを保持
    let processingMode = 'none'; // 'camera', 'image', 'none'

    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info text-center";

    // --- OpenCV.jsの初期化コールバックを設定 ---
    window.Module = window.Module || {};
    window.Module.onRuntimeInitialized = function() {
        try {
            // OpenCV.jsのcvオブジェクトが利用可能になったことを確認
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            statusElement.innerText = "OpenCV.jsが正常にロードされました！ 画像を選択するか、カメラを起動できます。";
            statusElement.className = "alert alert-success text-center";
            console.log("OpenCV.jsが正常にロードされました！");

            captureButton.disabled = false; // カメラ起動ボタンを有効化
            stopButton.disabled = true;

            // イベントリスナー設定
            captureButton.addEventListener('click', toggleCamera);
            stopButton.addEventListener('click', stopProcessing);
            fileInput.addEventListener('change', handleImageUpload);

        } catch (e) {
            statusElement.innerText = `OpenCV.jsの初期化に失敗しました: ${e.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("OpenCV.js 初期化エラー:", e);
        }
    };

    // --- カメラの起動と停止を切り替える ---
    async function toggleCamera() {
        if (processingMode === 'camera') {
            stopCamera();
        } else {
            // 画像処理中であれば停止
            if (processingMode === 'image') {
                stopProcessing();
            }
            startCamera();
        }
    }

    async function startCamera() {
        statusElement.innerText = "カメラを起動中...";
        statusElement.className = "alert alert-warning text-center";
        
        // UIを調整
        fileInput.disabled = true; // カメラ中はファイル選択不可
        captureButton.innerText = 'カメラ停止';
        stopButton.disabled = false;
        videoElement.style.display = 'block'; // video要素を表示
        outputCanvas.style.display = 'block'; // canvas要素を表示

        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoElement.srcObject = videoStream;
            
            videoElement.onloadedmetadata = () => {
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                statusElement.innerText = "カメラが起動しました！ 計数準備完了。";
                statusElement.className = "alert alert-success text-center";
                
                videoElement.play();
                processingMode = 'camera';
                requestAnimationFrame(processFrame);
            };

        } catch (err) {
            statusElement.innerText = `カメラへのアクセスに失敗しました: ${err.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("カメラアクセスエラー:", err);
            
            // エラー時はUIを元に戻す
            stopCamera(); // カメラが起動しなかった場合は停止処理
            captureButton.innerText = 'カメラ起動';
            fileInput.disabled = false;
        }
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
            videoStream = null;
        }
        captureButton.innerText = 'カメラ起動';
        stopButton.disabled = true;
        fileInput.disabled = false; // カメラ停止時はファイル選択可能に
        if (processingMode === 'camera') { // カメラモードからの停止であれば
            processingMode = 'none';
            outputCanvas.style.display = 'none'; // canvasも非表示
            resetCounts();
            statusElement.innerText = "カメラを停止しました。";
            statusElement.className = "alert alert-info text-center";
        }
        cancelAnimationFrame(animationFrameId); // ループ停止
    }

    function stopProcessing() {
        stopCamera(); // カメラが起動していれば停止
        processingMode = 'none';
        cancelAnimationFrame(animationFrameId); // 処理ループを停止
        statusElement.innerText = "処理を停止しました。";
        statusElement.className = "alert alert-info text-center";
        resetCounts();
        outputCanvas.style.display = 'none'; // canvasも非表示
        
        captureButton.innerText = 'カメラ起動';
        captureButton.disabled = false;
        stopButton.disabled = true;
        fileInput.disabled = false; // 停止時はファイル選択可能に
    }

    function resetCounts() {
        count100.innerText = '0';
        count50.innerText = '0';
        count10.innerText = '0';
        count5.innerText = '0';
        count1.innerText = '0';
        totalAmount.innerText = '0';
    }

    // --- 映像処理ループ ---
    function processFrame() {
        if (processingMode === 'camera' && !videoElement.paused && !videoElement.ended && videoStream) {
            outputContext.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
            processCvImage();
        }
        animationFrameId = requestAnimationFrame(processFrame);
    }

    // --- 画像ファイル読み込み ---
    function handleImageUpload(event) {
        stopProcessing(); // 現在の処理を停止 (カメラや以前の画像処理)
        processingMode = 'image';
        
        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                outputCanvas.width = img.width;
                outputCanvas.height = img.height;
                outputContext.drawImage(img, 0, 0, img.width, img.height);
                statusElement.innerText = "画像が読み込まれました。処理中...";
                statusElement.className = "alert alert-success text-center";
                outputCanvas.style.display = 'block';
                
                processCvImage(); // 画像処理を実行
                
                captureButton.disabled = true; // 画像処理中はカメラ起動不可
                stopButton.disabled = false;
                captureButton.innerText = '画像処理中'; // ボタンテキスト変更
            };
            img.onerror = function() {
                statusElement.innerText = "画像の読み込みに失敗しました。";
                statusElement.className = "alert alert-danger text-center";
                stopProcessing(); // エラー時は停止処理
            };
            img.src = URL.createObjectURL(file);
        } else {
            stopProcessing(); // ファイルが選択されなかった場合
        }
    }

    // --- OpenCVによる画像処理の共通部分 ---
    function processCvImage() {
        let srcMat = cv.imread(outputCanvas);
        let dstMat = new cv.Mat();

        // 例: グレースケール変換とエッジ検出
        cv.cvtColor(srcMat, dstMat, cv.COLOR_RGBA2GRAY);
        cv.Canny(dstMat, dstMat, 50, 100, 3, false); 

        cv.imshow('outputCanvas', dstMat); // 変換された画像をoutputCanvasに表示

        // コインの検出・計数処理 (ダミー関数)
        const counts = detectAndCountCoins(srcMat); // 元のカラー画像（srcMat）を渡す
        updateDisplay(counts);

        // メモリ解放
        srcMat.delete();
        dstMat.delete();
    }

    // --- コイン認識・計数ロジック（ダミー） ---
    // ここに金種判別と枚数計数の複雑なロジックを実装します
    function detectAndCountCoins(imageMat) {
        // 例: 実際には、画像処理アルゴリズムを使ってコインを検出し、金種を識別します
        // 今はダミーの値を返すだけ
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

        const total = (counts['100'] * 100) + (counts['50'] * 50) +
                      (counts['10'] * 10) + (counts['5'] * 5) +
                      (counts['1'] * 1);
        totalAmount.innerText = total;
    }
});
