document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    statusElement.innerText = "OpenCV.jsをロード中...";
    statusElement.className = "alert alert-info"; // Bootstrapのスタイルを適用

    // WASMファイルのロード状態を管理するPromise
    let wasmLoaded = new Promise(resolve => {
        window.Module = {
            // これが最も重要な変更点です。WASMを非同期でロードします。
            locateFile: function(path, prefix) {
                if (path.endsWith('.wasm')) {
                    // ここをあなたのGitHub Pagesの絶対パスに修正します
                    // 'https://Siegenom.github.io/coin-scannersig/' の部分をあなたのサイトのルートURLに置き換える
                    return 'https://siegenom.github.io/coin-scannersig/lib/' + path;
                }
                return prefix + path;
            },
            // WASMモジュールが完全にロードされ、初期化が完了したときに呼び出される関数
            onRuntimeInitialized: function() {
                resolve(); // WASMのロードと初期化が完了したことをPromiseに通知
            }
        };
    });

    // OpenCV.js（<script async>で読み込まれる）がロードされたら
    // onRuntimeInitialized が呼び出されるのを待つ
    wasmLoaded.then(() => {
        try {
            // cv.Mat コンストラクタが利用可能か確認
            const mat = new cv.Mat(10, 10, cv.CV_8UC3); // 10x10の8ビット符号なし3チャンネル行列を作成
            mat.delete(); // メモリ解放

            statusElement.innerText = "OpenCV.jsが正常にロードされ、cv.Matが利用可能です！";
            statusElement.className = "alert alert-success"; // Bootstrapの成功スタイル
            console.log("OpenCV.jsが正常にロードされ、cv.Matが利用可能です！");

            // jQueryとLodashが使えるかも試してみる (オプション)
            if (typeof jQuery !== 'undefined') {
                console.log("jQueryもロードされています！");
            }
            if (typeof _ !== 'undefined') { // Lodashは通常 '_' というグローバル変数でアクセス
                console.log("Lodashもロードされています！");
            }

        } catch (e) {
            statusElement.innerText = "OpenCV.jsのロードまたはcv.Matの利用に失敗しました: " + e.message;
            statusElement.className = "alert alert-danger"; // Bootstrapの失敗スタイル
            console.error("OpenCV.jsのロードまたはcv.Matの利用に失敗しました:", e);
        }
    });
});
