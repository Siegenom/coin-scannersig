// app.js (バージョン: v1.1)
// 変更点: v1.1: 読み込み画像に対する処理切り替えボタン（グレースケール/線画）を追加。元の画像を保持し、何度でも処理可能に。UI表示制御を改善。

document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    const appVersionElement = document.getElementById('appVersion');
    const videoElement = document.getElementById('cameraFeed');
    const uploadedImageElement = document.getElementById('uploadedImage'); // 読み込んだ画像を表示するimg要素
    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');
    const captureButton = document.getElementById('captureButton');
    const stopButton = document.getElementById('stopButton');
    const fileInput = document.getElementById('fileInput');
    const imageProcessButtonsDiv = document.getElementById('imageProcessButtons');
    const grayscaleBtn = document.getElementById('grayscaleBtn');
    const linedrawBtn = document.getElementById('linedrawBtn');

    // 結果表示要素
    const count100 = document.getElementById('count100');
    const count50 = document.getElementById('count50');
    const count10 = document.getElementById('count10');
    const count5 = document.getElementById('count5');
    const count1 = document.getElementById('count1');
    const totalAmount = document.getElementById('totalAmount');

    let videoStream = null; // カメラのストリームを保持
    let animationFrameId = null; // requestAnimationFrame のIDを保持
    let processingMode = 'none'; // 'camera', 'image_loaded', 'none'
    let currentLoadedImageMat = null; // 読み込んだ画像の元のcv.Matを保持

    // アプリケーションバージョンの表示
    appVersionElement.innerText = document.querySelector('meta[name="version"]').content;

    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info text-center";

    // --- OpenCV.jsの初期化コールバックを設定 ---
    window.Module = window.Module || {};
    window.Module.onRuntimeInitialized = function() {
        try {
            const testMat = new cv.Mat(10, 10, cv.CV_8UC3);
            testMat.delete();

            statusElement.innerText = "OpenCV.jsが正常にロードされました！ 画像を選択するか、カメラを起動できます。";
            statusElement.className = "alert alert-success text-center";
            console.log("OpenCV.jsが正常にロードされました！");

            captureButton.disabled = false;
            stopButton.disabled = true;

            // イベントリスナー設定
            captureButton.addEventListener('click', toggleCamera);
            stopButton.addEventListener('click', stopProcessing);
            fileInput.addEventListener('change', handleImageUpload);
            grayscaleBtn.addEventListener('click', () => processLoadedImage('grayscale'));
            linedrawBtn.addEventListener('click', () => processLoadedImage('linedraw'));

        } catch (e) {
            statusElement.innerText = `OpenCV.jsの初期化に失敗しました: ${e.message}`;
            statusElement.className = "alert alert-danger text-center";
            console.error("OpenCV.js 初期化エラー:", e);
        }
    };

    // --- カメラの起動と停止を切り替える ---
    async function toggleCamera() {
        if (processingMode === 'camera') {
            stopProcessing(); // カメラ停止はstopProcessing経由で
        } else {
            stopProcessing(); // 他の処理中であれば停止してからカメラ起動
            startCamera();
        }
    }

    async function startCamera() {
        statusElement.innerText = "カメラを起動中...";
        statusElement.className = "alert alert-warning text-center";
        
        // UI調整
        fileInput.disabled = true;
        captureButton.innerText = 'カメラ停止';
        stopButton.disabled = false;
        uploadedImageElement.style.display = 'none'; // アップロード画像非表示
        videoElement.style.display = 'block'; // video要素表示
        outputCanvas.style.display = 'block'; // canvas要素表示
        imageProcessButtonsDiv.style.display = 'none'; // 画像処理ボタン非表示

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
            
            stopProcessing(); // エラー時は停止処理
            captureButton.innerText = 'カメラ起動'; // ボタンテキスト戻す
        }
    }

    // --- 全ての処理を停止する ---
    function stopProcessing() {
        // カメラ停止
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
            videoStream = null;
        }
        cancelAnimationFrame(animationFrameId); // 処理ループ停止 (カメラ用)
        
        // 画像関連のリソース解放
        if (currentLoadedImageMat) {
            currentLoadedImageMat.delete();
            currentLoadedImageMat = null;
        }
        uploadedImageElement.src = ''; // アップロード画像のURLをクリア
        uploadedImageElement.style.display = 'none'; // アップロード画像非表示

        processingMode = 'none'; // モードをリセット
        
        statusElement.innerText = "処理を停止しました。";
        statusElement.className = "alert alert-info text-center";
        resetCounts(); // 計数結果をリセット
        outputCanvas.style.display = 'none'; // canvasも非表示
        imageProcessButtonsDiv.style.display = 'none'; // 画像処理ボタンを非表示
        
        // UIコントロールをリセット
        captureButton.innerText = 'カメラ起動';
        captureButton.disabled = false;
        stopButton.disabled = true;
        fileInput.disabled = false;
        fileInput.value = ''; // ファイル選択をリセット
    }

    function resetCounts() {
        count100.innerText = '0';
        count50.innerText = '0';
        count10.innerText = '0';
        count5.innerText = '0';
        count1.innerText = '0';
        totalAmount.innerText = '0';
    }

    // --- カメラ映像処理ループ ---
    function processFrame() {
        if (processingMode === 'camera' && !videoElement.paused && !videoElement.ended && videoStream) {
            outputContext.drawImage(videoElement, 0, 0, outputCanvas.width, outputCanvas.height);
            // カメラ映像は直接処理
            let srcMat = cv.imread(outputCanvas);
            let dstMat = new cv.Mat();

            cv.cvtColor(srcMat, dstMat, cv.COLOR_RGBA2GRAY);
            cv.Canny(dstMat, dstMat, 50, 100, 3, false); 

            cv.imshow('outputCanvas', dstMat);

            const counts = detectAndCountCoins(srcMat); // 元のカラー画像（srcMat）を渡す
            updateDisplay(counts);

            srcMat.delete();
            dstMat.delete();
        }
        animationFrameId = requestAnimationFrame(processFrame);
    }

    // --- 画像ファイル読み込み ---
    function handleImageUpload(event) {
        stopProcessing(); // 現在の処理を停止
        
        const file = event.target.files && event.target.files.length > 0 ? event.target.files.item(0) : null;
        if (file) {
            const img = new Image();
            img.onload = function() {
                uploadedImageElement.src = img.src; // 元画像をimg要素に表示
                uploadedImageElement.style.display = 'block'; // 元画像を表示
                outputCanvas.style.display = 'block'; // canvasも表示

                // 元画像をcv.Matとして保持
                if (currentLoadedImageMat) currentLoadedImageMat.delete(); // 以前のMatがあれば解放
                currentLoadedImageMat = cv.imread(uploadedImageElement); 

                outputCanvas.width = uploadedImageElement.width;
                outputCanvas.height = uploadedImageElement.height;
                
                statusElement.innerText = "画像が読み込まれました。処理を選択してください。";
                statusElement.className = "alert alert-success text-center";
                
                processingMode = 'image_loaded'; // 画像ロードモード
                imageProcessButtonsDiv.style.display = 'grid'; // 画像処理ボタンを表示
                captureButton.disabled = true; // 画像処理中はカメラ起動不可
                stopButton.disabled = false;
                captureButton.innerText = '画像処理中'; // ボタンテキスト変更
                
                // 初回はデフォルトでグレースケール処理を実行
                processLoadedImage('grayscale'); 
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

    // --- 読み込んだ画像に対する処理を実行 ---
    function processLoadedImage(type) {
        if (!currentLoadedImageMat) {
            statusElement.innerText = "処理する画像がありません。";
            statusElement.className = "alert alert-warning text-center";
            return;
        }

        let dstMat = new cv.Mat();
        
        if (type === 'grayscale') {
            cv.cvtColor(currentLoadedImageMat, dstMat, cv.COLOR_RGBA2GRAY);
            statusElement.innerText = "画像をグレースケール化しました。";
        } else if (type === 'linedraw') {
            // 線画化のロジック (提供されたものを流用)
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
            const imgGray = new cv.Mat();
            cv.cvtColor(currentLoadedImageMat, imgGray, cv.COLOR_RGBA2GRAY);
            const imgDilated = new cv.Mat();
            cv.dilate(imgGray, imgDilated, kernel, new cv.Point(-1, -1), 1); // pointは-1,-1でOK
            const imgDiff = new cv.Mat();
            cv.absdiff(imgDilated, imgGray, imgDiff);
            cv.bitwise_not(imgDiff, dstMat); // 結果をdstMatへ
            
            imgGray.delete();
            imgDilated.delete();
            imgDiff.delete();
            kernel.delete();

            statusElement.innerText = "画像を線画化しました。";
        } else {
            // タイプが指定されない場合、元の画像をそのまま表示
            currentLoadedImageMat.copyTo(dstMat);
            statusElement.innerText = "画像を表示中...";
        }

        cv.imshow('outputCanvas', dstMat);
        
        // 検出・計数処理 (ダミー関数) - 元画像に対して行う
        const counts = detectAndCountCoins(currentLoadedImageMat); 
        updateDisplay(counts);

        dstMat.delete(); // 処理結果のMatを解放
    }

    // --- コイン認識・計数ロジック（ダミー） ---
    // ここに金種判別と枚数計数の複雑なロジックを実装します
    function detectAndCountCoins(imageMat) {
        const dummyCounts = {
            '100': Math.floor(Math.random() * 5),
            '50': Math.floor(Math.random() * 5),
            '10': Math.floor(Math.random() * 5),
            '5': Math.floor(Math.random() * 5),
            '1': Math.random() < 0.5 ? 0 : 1, // 1円玉はたまに0
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
