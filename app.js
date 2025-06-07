document.addEventListener('DOMContentLoaded', async () => { // async キーワードを追加
    const statusElement = document.getElementById('status');
    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info"; // Bootstrapのスタイルを適用

    try {
        // WASMファイルを非同期的に取得
        const wasmUrl = 'https://siegenom.github.io/coin-scannersig/lib/opencv_js.wasm'; // あなたのサイトの絶対パス
        const response = await fetch(wasmUrl); // await を使って非同期処理を待つ
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
        }
        const wasmBinary = await response.arrayBuffer(); // バイナリデータを取得

        // Moduleオブジェクトを準備し、wasmBinaryを直接渡す
        window.Module = {
            wasmBinary: wasmBinary, // ここで取得したバイナリデータを渡す
            onRuntimeInitialized: function() {
                // WASMモジュールが完全にロードされ、初期化が完了したときに呼び出される関数
                try {
                    const mat = new cv.Mat(10, 10, cv.CV_8UC3); // 10x10の8ビット符号なし3チャンネル行列を作成
                    mat.delete(); // メモリ解放

                    statusElement.innerText = "OpenCV.jsが正常にロードされ、cv.Matが利用可能です！";
                    statusElement.className = "alert alert-success"; // Bootstrapの成功スタイル
                    console.log("OpenCV.jsが正常にロードされ、cv.Matが利用可能です！");

                    if (typeof jQuery !== 'undefined') {
                        console.log("jQueryもロードされています！");
                    }
                    if (typeof _ !== 'undefined') {
                        console.log("Lodashもロードされています！");
                    }

                } catch (e) {
                    statusElement.innerText = "OpenCV.jsのロードまたはcv.Matの利用に失敗しました: " + e.message;
                    statusElement.className = "alert alert-danger"; // Bootstrapの失敗スタイル
                    console.error("OpenCV.jsのロードまたはcv.Matの利用に失敗しました:", e);
                }
            }
        };

        // opencv.jsスクリプトがまだ読み込まれていない場合は、ここで動的に読み込む
        // ただし、index.htmlで <script async src="lib/opencv.js"> があるので通常は不要だが、念のため
        if (typeof cv === 'undefined' && typeof window.Module.asm === 'undefined') {
             const script = document.createElement('script');
             script.src = 'lib/opencv.js';
             script.async = true;
             document.body.appendChild(script);
        }

    } catch (e) {
        statusElement.innerText = `致命的なエラーが発生しました: ${e.message}`;
        statusElement.className = "alert alert-danger";
        console.error("Fatal error during WASM fetch or initialization:", e);
    }
});
