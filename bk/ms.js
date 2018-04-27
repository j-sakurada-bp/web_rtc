const _pubOptions = {
    multistream: true,
};
const _mediaOptions = {
    video: false,
    audio: true
};

//--------------------------------------------

/**
 * Publisher1インスタンス
 */
let _pub1 = null;

/**
 * Publisher1を生成してconnectする。
 */
const doStart1 = function() {

    _pub1 = getSoraPublisher('tcdt', 'pub1', _pubOptions);

    getUserMedia(_mediaOptions)
        .then(mediaStream => {
            _pub1.connect(mediaStream)
                .then(stream => {
                    const player = getElementById('player1');
                    player.srcObject = stream;
                    player.play();
                });
        })
        .catch(onError);

    _pub1.on('addstream', function(event) {
        // 追加されたストリームからAudioMediaを生成
        const audio = createAudioElement(event.stream);
        // <audio>を追加する。
        getElementById('container1').appendChild(audio);
    });
};

/**
 * Publisher1をdisconnectする。
 */
const doStop1 = function() {
    if (_pub1) {
        _pub1.disconnect()
            .then(function() {
                console.log('pub1 DISCONNECTED.');
            });
    }
    getElementById('container1').innerHTML = '';
    getElementById('player1').srcObject = null;
};

//--------------------------------------------

/**
 * Publisher2インスタンス
 */
let _pub2 = null;

/**
 * Publisher2を生成してconnectする。
 */
const doStart2 = function() {

    _pub2 = getSoraPublisher('tcdt', 'pub2', _pubOptions);

    getUserMedia(_mediaOptions)
        .then(mediaStream => {
            _pub2.connect(mediaStream)
                .then(stream => {
                    const player = getElementById('player2');
                    player.srcObject = stream;
                    player.play();
                });
        })
        .catch(onError);

    _pub2.on('addstream', function(event) {
        // 追加されたストリームからAudioMediaを生成
        const audio = createAudioElement(event.stream);
        // <audio>を追加する。
        getElementById('container2').appendChild(audio);
    });
};

/**
 * Publisher2をdisconnectする。
 */
const doStop2 = function() {
    if (_pub2) {
        _pub2.disconnect()
            .then(function() {
                console.log('pub2 DISCONNECTED.');
            });
    }
    getElementById('container2').innerHTML = '';
    getElementById('player2').srcObject = null;
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
