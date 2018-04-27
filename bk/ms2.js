const _pubOptions = {
    multistream: true,
};
const _mediaOptions = {
    video: false,
    audio: true
};

//--------------------------------------------

/**
 * Publisherインスタンス
 */
let _pub = null;

/**
 * Publisherを生成してconnectする。
 */
const doStart = function() {

    _pub = getSoraPublisher('tcdt', 'pub', _pubOptions);

    getUserMedia(_mediaOptions)
        .then(mediaStream => {
            _pub.connect(mediaStream)
                .then(stream => {
                    const player = getElementById('player');
                    player.srcObject = stream;
                    player.play();
                });
        })
        .catch(onError);

    _pub.on('addstream', function(event) {
        // 追加されたストリームからAudioMediaを生成
        const audio = createAudioElement(event.stream);
        // <audio>を追加する。
        getElementById('container').appendChild(audio);
    });
};

/**
 * Publisherをdisconnectする。
 */
const doStop = function() {
    if (_pub) {
        _pub.disconnect()
            .then(function() {
                console.log('pub DISCONNECTED.');
            });
    }
    getElementById('container').innerHTML = '';
    getElementById('player').srcObject = null;
};

// -----------------------------------------

/**
 * エラーハンドラ。
 */
const onError = err => {
    console.log(err);
    alert(err.message);
};

/**
 * document.getElementByIdの簡略化。
 */
const getElementById = function(id) {
    return document.getElementById(id);
};

/**
 * <Audio>タグを生成する。
 * srcObject属性以外は規定値を設定している。
 */
const createAudioElement = function(stream) {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.width = '400';
    audio.height = '40';
    audio.srcObject = stream;
    audio.controls = true;
    return audio;
};
