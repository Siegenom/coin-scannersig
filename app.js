document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info"; // Bootstrapのスタイルを適用

    // window.Moduleオブジェクトの準備
    // OpenCV.jsがWebAssemblyコードを内部に含むことを想定し、特別なWASMロード設定は不要
    window.Module = {
        onRuntimeInitialized: function() {
            // OpenCV.jsのWASMモジュールが完全にロードされ、初期化が完了したときに呼び出される関数
            try {
                // cv.Mat コンストラクタが利用可能か確認
                const mat = new cv.Mat(10, 10, cv.CV_8UC3); // 10x10の8ビット符号なし3チャンネル行列を作成
                mat.delete(); // メモリ解放

                statusElement.innerText = "OpenCV.jsが正常にロードされ、cv.Matが利用可能です！ カメラを起動します...";
                statusElement.className = "alert alert-success"; // Bootstrapの成功スタイル
                console.log("OpenCV.jsが正常にロードされ、cv.Matが利用可能です！");

                // jQueryとLodashが使えるかも試してみる (オプション)
                if (typeof jQuery !== 'undefined') {
                    console.log("jQueryもロードされています！");
                }
                if (typeof _ !== 'undefined') {
                    console.log("Lodashもロードされています！");
                }

                // --- ここからカメラと画像処理のロジックを開始します ---
                startCamera();

            } catch (e) {
                statusElement.innerText = "OpenCV.jsのロードまたは初期化に失敗しました: " + e.message;
                statusElement.className = "alert alert-danger"; // Bootstrapの失敗スタイル
                console.error("OpenCV.jsのロードまたは初期化に失敗しました:", e);
            }
        }
    };

    // --- カメラの起動と映像処理の関数 ---
    async function startCamera() {
        const video = document.getElementById('cameraFeed');
        const canvas = document.getElementById('cameraCanvas');
        const context = canvas.getContext('2d');

        try {
            // カメラにアクセスし、映像ストリームを取得
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // 背面カメラを優先
            video.srcObject = stream;
            video.style.display = 'block'; // video要素を表示

            video.onloadedmetadata = () => {
                // video要素のサイズに合わせてcanvasのサイズを設定
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                statusElement.innerText = "カメラが起動しました！";

                // 映像が再生されたら、フレームごとに画像処理を行う
                video.play();
                requestAnimationFrame(processVideo);
            };

        } catch (err) {
            statusElement.innerText = `カメラへのアクセスに失敗しました: ${err.message}`;
            statusElement.className = "alert alert-danger";
            console.error("カメラアクセスエラー:", err);
        }
    }

    function processVideo() {
        const video = document.getElementById('cameraFeed');
        const canvas = document.getElementById('cameraCanvas');
        const context = canvas.getContext('2d');

        if (video.paused || video.ended) {
            return;
        }

        // videoフレームをcanvasに描画
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // canvasからOpenCVのMatオブジェクトを作成
        let src = cv.imread(canvas);
        let dst = new cv.Mat();

        // 例: グレースケール変換とエッジ検出
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.Canny(dst, dst, 50, 100, 3, false); // Cannyエッジ検出

        // 処理結果をcanvasに表示
        cv.imshow(canvas, dst);

        // メモリ解放
        src.delete();
        dst.delete();

        // 次のフレームを処理
        requestAnimationFrame(processVideo);
    }
});
