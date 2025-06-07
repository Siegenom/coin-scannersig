document.addEventListener('DOMContentLoaded', () => {
    const statusElement = document.getElementById('status');
    statusElement.innerText = "OpenCV.jsをロード中...";

    // window.Moduleオブジェクトを準備
    // OpenCV.jsのWASMファイルの場所を明示的に指定
    window.Module = {
        // この locateFile が重要です。opencv_js.wasm の場所を正確に伝えます。
     window.Module = {
    locateFile: function(path, prefix) {
        if (path.endsWith('.wasm')) {
            // 絶対パスを指定する (GitHub PagesのURLを正確に記述)
            // 'https://Siegenom.github.io/coin-scannersig/' の部分をあなたのサイトのルートURLに置き換える
            return 'https://Siegenom.github.io/coin-scannersig/lib/' + path;
        }
        return prefix + path;
    },
    onRuntimeInitialized: function() {
        // ... 以降のコードは変更なし ...
    }
};
        onRuntimeInitialized: function() {
            // OpenCV.jsのWASMモジュールが完全にロードされ、初期化が完了したときに呼び出される関数
            try {
                // cv.Mat コンストラクタが利用可能か確認
                const mat = new cv.Mat(10, 10, cv.CV_8UC3); // 10x10の8ビット符号なし3チャンネル行列を作成
                mat.delete(); // メモリ解放

                statusElement.innerText = "OpenCV.jsが正常にロードされ、cv.Matが利用可能です！";
                statusElement.style.color = "green";
                console.log("OpenCV.jsが正常にロードされ、cv.Matが利用可能です！");
            } catch (e) {
                statusElement.innerText = "OpenCV.jsのロードまたはcv.Matの利用に失敗しました: " + e.message;
                statusElement.style.color = "red";
                console.error("OpenCV.jsのロードまたはcv.Matの利用に失敗しました:", e);
            }
        }
    };
});
