// app.js
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const videoElement = document.getElementById('cameraFeed');
    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('captureButton');
    const stopButton = document.getElementById('stopButton');

    // 結果表示要素
    const count100 = document.getElementById('count100');
    const count50 = document.getElementById('count50');
    const count10 = document.getElementById('count10');
    const count5 = document.getElementById('count5');
    const count1 = document.getElementById('count1');
    const totalAmount = document.getElementById('totalAmount');

    let videoStream = null; // カメラのストリームを保持
    let animationFrameId = null; // requestAnimationFrame のIDを保持

    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info text-center";

    // --- OpenCV.jsの初期化コールバックを設定 ---
    // OpenCV.js（単一ファイル版）がロードされ、内部のWebAssemblyが初期化された後にこの関数が呼ばれる
    // window.Moduleオブジェクトはopencv.jsによって定義されることを想定
    window.Module = window.Module || {}; // 念のため、window.Moduleが存在しない場合に備える
    window.Module.onRuntimeInitialized = function() {
        try {
            // OpenCV.jsのcvオブジェクトが利用可能になったことを確認
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            statusElement.innerText = "OpenCV.jsが正常にロードされました！ カメラを起動できます。";
            statusElement.className = "alert alert-success text-center";
            console.log("OpenCV.jsが正常にロードされました！");

            captureButton.disabled = false;
            stopButton.disabled = true;

            captureButton.addEventListener('click', startCounting);
            stopButton.addEventListener('click', stopCounting);

        } catch (e) {
            statusElement.innerText = `OpenCV.jsの初期化に失敗しました: ${e.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("OpenCV.js 初期化エラー:", e);
        }
    };

    // --- カメラの起動と映像処理 ---
    async function startCounting() {
        statusElement.innerText = "カメラを起動中...";
        statusElement.className = "alert alert-warning text-center";
        
        try {
            // 背面カメラ (environment) を優先してアクセス
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            videoElement.srcObject = videoStream;
            videoElement.style.display = 'block'; // video要素を表示
            outputCanvas.style.display = 'block'; // canvas要素を表示

            videoElement.onloadedmetadata = () => {
                // video要素のサイズに合わせてcanvasのサイズを設定
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                statusElement.innerText = "カメラが起動しました！ 計数準備完了。";
                statusElement.className = "alert alert-success text-center";
                
                videoElement.play();
                captureButton.disabled = true; // 計数開始後はボタン無効化
                stopButton.disabled = false; // 停止ボタン有効化
                
                // 映像処理ループを開始
                requestAnimationFrame(processVideo);
            };

        } catch (err) {
            statusElement.innerText = `カメラへのアクセスに失敗しました: ${err.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("カメラアクセスエラー:", err);
            captureButton.disabled = false; // 再度開始できるように
            stopButton.disabled = true;
        }
    }

    function stopCounting() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop()); // カメラ停止
            videoElement.srcObject = null;
            videoElement.style.display = 'none'; // video要素を非表示
            outputCanvas.style.display = 'none'; // canvas要素を非表示
            cancelAnimationFrame(animationFrameId); // 映像処理ループを停止
            statusElement.innerText = "計数を停止しました。";
            statusElement.className = "alert alert-info text-center";
        }
        captureButton.disabled = false; // 計数開始ボタンを再度有効化
        stopButton.disabled = true;
        resetCounts(); // 計数結果をリセット
    }

    function resetCounts() {
        count100.innerText = '0';
        count50.innerText = '0';
        count10.innerText = '0';
        count5.innerText = '0';
        count1.innerText = '0';
        totalAmount.innerText = '0';
    }

    function processVideo() {
        if (videoElement.paused || videoElement.ended) {
            return;
        }

        outputContext.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);

        // canvasからOpenCVのMatオブジェクトを作成
        // この時点では、カメラ映像のMatオブジェクトがsrcMatになる
        let srcMat = cv.imread(outputCanvas);
        let dstMat = new cv.Mat();

        // --- ここにコインの認識・計数ロジックを実装します ---
        // 例: グレースケール変換とエッジ検出
        cv.cvtColor(srcMat, dstMat, cv.COLOR_RGBA2GRAY);
        cv.Canny(dstMat, dstMat, 50, 100, 3, false); // Cannyエッジ検出

        // 処理結果をcanvasに表示
        cv.imshow('outputCanvas', dstMat); // 変換された画像をoutputCanvasに表示

        // コインの検出・計数処理 (ダミー関数)
        const counts = detectAndCountCoins(srcMat); // 元のカラー画像（srcMat）を渡す
        updateDisplay(counts);

        // メモリ解放
        srcMat.delete();
        dstMat.delete();

        // 次のフレームを処理
        animationFrameId = requestAnimationFrame(processVideo);
    }

    // --- コイン認識・計数ロジック（ダミー） ---
    // ここに金種判別と枚数計数の複雑なロジックを実装します
    function detectAndCountCoins(imageMat) {
        // 例: 実際には、画像処理アルゴリズムを使ってコインを検出し、金種を識別します
        // 今はダミーの値を返すだけ
        const dummyCounts = {
            '100': Math.floor(Math.random() * 5), // 0-4枚
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
