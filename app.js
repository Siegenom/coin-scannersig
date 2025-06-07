// DOMの読み込みが完了したら非同期処理を開始
document.addEventListener('DOMContentLoaded', async () => {
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

    updateStatus("OpenCV.jsの初期化を開始します...", "info");

    try {
        // --- ステップ 1: WASMファイルを非同期で先に取得します ---
        // このパスはあなたのGitHub Pagesリポジトリに合わせてください
        const wasmUrl = 'https://siegenom.github.io/coin-scannersig/lib/opencv_js.wasm';
        updateStatus("WASMファイルの取得中...", "info");

        const response = await fetch(wasmUrl);
        if (!response.ok) {
            throw new Error(`WASMファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        const wasmBinary = await response.arrayBuffer();
        updateStatus("WASMファイルの取得が完了しました。", "info");

        // --- ステップ 2: opencv.jsが読み込まれる前に、グローバル空間にModuleオブジェクトを準備します ---
        // このオブジェクトがopencv.jsの初期化設定として利用されます
        window.Module = {
            wasmBinary: wasmBinary, // 取得したWASMバイナリを設定
            onRuntimeInitialized: () => {
                // このコールバックはOpenCVの準備が全て完了したときに呼び出されます
                try {
                    // 簡単なテストを実行して、cvオブジェクトが利用可能か確認します
                    const mat = new cv.Mat(5, 5, cv.CV_8UC4, new cv.Scalar(0, 255, 0, 255));
                    mat.delete(); // メモリ解放を忘れないように

                    updateStatus("成功: OpenCV.jsが正常にロードされ、利用可能です！", "success");
                    
                } catch (e) {
                    console.error("OpenCV.jsのテスト実行中にエラーが発生しました:", e);
                    updateStatus(`エラー: OpenCV.jsのテスト実行に失敗しました - ${e.message}`, "danger");
                }
            },
            // エラーハンドリングを強化
            onAbort: (reason) => {
                 console.error("OpenCV.jsのランタイムが中断されました:", reason);
                 updateStatus(`致命的エラー: OpenCV.jsのランタイムが中断されました - ${reason}`, "danger");
            }
        };

        // --- ステップ 3: Moduleオブジェクトの準備ができたので、opencv.jsのスクリプトを動的に読み込みます ---
        updateStatus("opencv.jsスクリプトを読み込んでいます...", "info");
        const script = document.createElement('script');
        script.src = 'lib/opencv.js'; // 読み込むスクリプトのパス
        script.async = true; // 非同期で読み込む
        script.onerror = () => {
            // スクリプト自体の読み込みに失敗した場合のエラーハンドリング
            throw new Error("opencv.jsスクリプトの読み込みに失敗しました。パスが正しいか確認してください。");
        };
        document.body.appendChild(script);

    } catch (e) {
        console.error("初期化プロセス中に致命的なエラーが発生しました:", e);
        updateStatus(`致命的エラー: ${e.message}`, "danger");
    }
});
