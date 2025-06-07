// DOMの読み込みが完了したら処理を開始
document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    
    /**
     * ステータスメッセージを画面とコンソールに表示するヘルパー関数
     * @param {string} message - 表示するメッセージ
     * @param {'info' | 'success' | 'danger' | 'warning'} type - メッセージの種類
     */
    const updateStatus = (message, type) => {
        statusElement.innerText = message;
        statusElement.className = `alert alert-${type}`;
        console.log(`[Status: ${type}] ${message}`);
    };

    updateStatus("OpenCV.jsの初期化準備中...", "info");

    // --- ステップ 1: Moduleオブジェクトを準備します ---
    window.Module = {
        /**
         * locateFileは、opencv.jsが必要なファイル（特にWASMファイル）を見つけるために使用します。
         */
        locateFile: (path, scriptDirectory) => {
            // ★変更点：CDNをjsDelivrからunpkgに変更
            const wasmUrl = 'https://unpkg.com/opencv-js@4.8.0/dist/opencv_js.wasm';
            if (path === 'opencv_js.wasm') {
                updateStatus(`WASMファイル "${path}" を "${wasmUrl}" から読み込みます...`, 'info');
                return wasmUrl;
            }
            return scriptDirectory + path;
        },
        
        onRuntimeInitialized: () => {
            try {
                updateStatus("OpenCVランタイム初期化完了。テスト実行中...", "info");
                const mat = new cv.Mat(5, 5, cv.CV_8UC4, new cv.Scalar(0, 255, 0, 255));
                mat.delete(); 

                updateStatus("成功: OpenCV.jsが正常にロードされ、利用可能です！", "success");
                
            } catch (e) {
                console.error("OpenCV.jsのテスト実行中にエラーが発生しました:", e);
                updateStatus(`エラー: OpenCV.jsのテスト実行に失敗しました - ${e.message}`, "danger");
            }
        },
        
        onAbort: (reason) => {
             console.error("OpenCV.jsのランタイムが中断されました:", reason);
             updateStatus(`致命的エラー: OpenCV.jsのランタイムが中断されました - ${reason}`, "danger");
        }
    };

    // --- ステップ 2: opencv.jsのスクリプトを動的に読み込みます ---
    updateStatus("opencv.jsスクリプトをCDNから読み込んでいます...", "info");
    const script = document.createElement('script');
    
    // ★変更点：スクリプトのソースもunpkgのURLに変更
    script.src = 'https://unpkg.com/opencv-js@4.8.0/dist/opencv.js';
    
    script.async = true;
    script.id = 'opencv-script';
    script.onerror = () => {
        updateStatus("エラー: opencv.jsスクリプトの読み込みに失敗しました。", "danger");
    };
    document.body.appendChild(script);
});
