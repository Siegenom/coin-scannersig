document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('status');
    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info";

    try {
        // WASMファイルを非同期的に取得
        const wasmUrl = 'https://siegenom.github.io/coin-scannersig/lib/opencv_js.wasm';
        const response = await fetch(wasmUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
        }
        const wasmBinary = await response.arrayBuffer();

        // Moduleオブジェクトを準備し、wasmBinaryを直接渡す
        // このオブジェクトは、後から読み込まれるopencv.jsによって使用される
        window.Module = {
            wasmBinary: wasmBinary,
            onRuntimeInitialized: function() {
                try {
                    const mat = new cv.Mat(10, 10, cv.CV_8UC3);
                    mat.delete();

                    statusElement.innerText = "OpenCV.jsが正常にロードされ、cv.Matが利用可能です！";
                    statusElement.className = "alert alert-success";
                    console.log("OpenCV.jsが正常にロードされ、cv.Matが利用可能です！");

                    if (typeof jQuery !== 'undefined') {
                        console.log("jQueryもロードされています！");
                    }
                    if (typeof _ !== 'undefined') {
                        console.log("Lodashもロードされています！");
                    }

                } catch (e) {
                    statusElement.innerText = "OpenCV.jsの初期化またはテスト実行に失敗しました: " + e.message;
                    statusElement.className = "alert alert-danger";
                    console.error("OpenCV.js initialization or test failed:", e);
                }
            }
        };

        // opencv.jsスクリプトを動的に読み込む
        // これにより、上記のModuleオブジェクトが確実に使用される
        const script = document.createElement('script');
        script.src = 'lib/opencv.js';
        script.async = true;
        script.onerror = () => {
            throw new Error("Failed to load opencv.js script.");
        };
        document.body.appendChild(script);

    } catch (e) {
        statusElement.innerText = `致命的なエラーが発生しました: ${e.message}`;
        statusElement.className = "alert alert-danger";
        console.error("Fatal error during WASM fetch or initialization:", e);
    }
});
