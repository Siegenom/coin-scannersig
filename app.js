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

    // --- ステップ 1: opencv.jsが読み込まれる前に、グローバル空間にModuleオブジェクトを準備します ---
    // このオブジェクトはopencv.jsの初期化設定として利用されます。
    window.Module = {
        /**
         * locateFileは、opencv.jsが必要なファイル（特にWASMファイル）を見つけるために使用します。
         * これにより、ライブラリが正しいパスからファイルを非同期に読み込むようになります。
         * 手動でfetchする代わりに、ファイルの場所をライブラリに教えます。
         */
        locateFile: (path, scriptDirectory) => {
            if (path === 'opencv_js.wasm') {
                updateStatus(`WASMファイル "${path}" の場所を特定中...`, 'info');
                // WASMファイルの完全なURLを返します。
                return 'https://siegenom.github.io/coin-scannersig/lib/opencv_js.wasm';
            }
            return scriptDirectory + path;
        },
        
        // このコールバックはOpenCVのランタイムが準備完了したときに呼び出されます
        onRuntimeInitialized: () => {
            try {
                updateStatus("OpenCVランタイム初期化完了。テスト実行中...", "info");
                // 簡単なテストを実行して、cvオブジェクトが利用可能か確認します
                const mat = new cv.Mat(5, 5, cv.CV_8UC4, new cv.Scalar(0, 255, 0, 255));
                mat.delete(); // メモリ解放を忘れずに

                updateStatus("成功: OpenCV.jsが正常にロードされ、利用可能です！", "success");
                
            } catch (e) {
                console.error("OpenCV.jsのテスト実行中にエラーが発生しました:", e);
                updateStatus(`エラー: OpenCV.jsのテスト実行に失敗しました - ${e.message}`, "danger");
            }
        },
        
        // エラーハンドリング
        onAbort: (reason) => {
             console.error("OpenCV.jsのランタイムが中断されました:", reason);
             updateStatus(`致命的エラー: OpenCV.jsのランタイムが中断されました - ${reason}`, "danger");
        }
    };

    // --- ステップ 2: Moduleオブジェクトの準備ができたので、opencv.jsのスクリプトを動的に読み込みます ---
    updateStatus("opencv.jsスクリプトを読み込んでいます...", "info");
    const script = document.createElement('script');
    script.src = 'lib/opencv.js'; // 読み込むスクリプトのパス
    script.async = true; // 非同期で読み込む
    script.id = 'opencv-script';
    script.onerror = () => {
        updateStatus("エラー: opencv.jsスクリプトの読み込みに失敗しました。", "danger");
        console.error("opencv.jsスクリプトの読み込みに失敗しました。パスが正しいか確認してください。");
    };
    document.body.appendChild(script);
});
