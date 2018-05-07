// GETパラメータのキー
const _KEY_FILENAME_PARAM = 'fname';
const _KEY_EXTENSION = 'ext';
// デフォルト値
const _DEFAULT_CHANNEL = 'tcdt';
const _DEFAULT_METADATA = 'ope';
const _DEFAULT_EXTENSION = 'mp3';
const _DEFAULT_FILENAME = 'h1';
// ステータス
const _STATUS_NORMAL = 0;
const _STATUS_PENDING = 1;
const _ON_INIT = 0;
const _ON_CONNECTING = 1;
const _ON_DISCONNECTING = 2;
const _ON_PENDING = 3;

// パラメータ系
let _channelId = null;
let _metadata = null;
let _filename = null;
let _extension = null;

// Sora Publisher
let _publisher = null;
// Sora subscriber
let _subscriber = null;
// Audio Mediaオブジェクト
let _audio = null;
// 音源ファイル名のバッファ（Queueとして使用）
let _sourceBuffer = [];
// ステータス（通常 / 保留中）
let _status = _STATUS_NORMAL;


// ---- 初期化処理系----

/**
 * 初期化処理
 */
$(function() {
    // 音源ファイル名の解決
    resolveFilename();
    // イベントハンドラの設定
    setupEventHandler();
    // 画面を制御する。
    controlItems(_ON_INIT);
});

/**
 * ファイル名を解決する。
 */
const resolveFilename = function() {

    const params = getGetParameters();
    const fname = params[_KEY_FILENAME_PARAM];
    const ext = params[_KEY_EXTENSION];

    _filename = fname || _DEFAULT_FILENAME;
    _extension = ext || _DEFAULT_EXTENSION;

    const name = 'f.e'.replace('f', _filename).replace('e', _extension);
    $('#txtAudioFileName').val(name);
};

/**
 * イベントハンドラを設定する。
 */
const setupEventHandler = function() {
    $('#btnConnect').on('click', doConnect);
    $('#btnDisconnect').on('click', doDisconnect);
    $('#btnSetNext').on('click', doSetNextSource);
    $('#btnPending').on('click', doPending);
};

// ---- イベントハンドラ----

/**
 * 「接続」ボタンイベントハンドラ。
 */
const doConnect = function() {

    // AudioMedia / SoraPublisher 接続用パラメータのセットアップ
    if (setupConnectionParameter() === false) {
        return;
    }

    // 1. TTSを流すmutistreamのPublisherを生成する。
    // AudioMediaを生成して出力先を取得
    const dest = createAudioObject();
    // SoraのPublisherへ接続
    createPublisherAndConnect(dest);
    // 再生する
    _audio.play();

    // 2. 下りstreamを再生するためのmultistreamのsubscriberを生成する
    const subscriber = createSubscriberWithEventHandler();
    // 接続する。
    subscriber.connect().catch(error => console.log(error));

    // 3. 画面表示制御
    refreshSrcListDisplay();
    controlItems(_ON_CONNECTING);
};

/**
 * 「切断」ボタンイベントハンドラ。
 */
const doDisconnect = function() {

    // AudioMediaをクリア
    if (_audio !== null) {
        _audio.pause();
        _audio = null;
    }
    // SoraのPublisherをクリア
    if (_publisher !== null) {
        _publisher.disconnect();
        _publisher = null;
    }
    // SoraのSubscriberをクリア
    if (_subscriber !== null) {
        _subscriber.disconnect();
        _subscriber = null;
    }

    // 音源ソースバッファ（Queue）をクリア
    _sourceBuffer = [];

    // 画面を制御する。
    _status = _STATUS_NORMAL;
    $('#containerDown').empty();
    refreshSrcListDisplay();
    controlItems(_ON_DISCONNECTING);
};

/**
 * 「設定」ボタンイベントハンドラ
 */
const doSetNextSource = function() {
    const nextSrc = $('#txtNextSourceName').val();
    if (!nextSrc) {
        alert('次の音源を指定して下さい。');
        return;
    }
    // 再生ソース Queueに登録
    pushQueue(nextSrc);
    // 画面表示をリフレッシュ
    refreshSrcListDisplay();
};

/**
 * 「保留」ボタンイベントハンドラ
 */
const doPending = function() {
    // Queueをクリア
    _sourceBuffer = [];
    // 保留音を接続
    if (_audio) {
        _audio.pause();
        _audio.src = _MP3_PATH + 'eine.mp3';
        _audio.play();
    }
    // 画面表示を変更
    _status = _STATUS_PENDING;
    refreshSrcListDisplay();
    controlItems(_ON_PENDING);
    // ポーリングを開始
    polling();
};

// ---- 接続制御系 ----

/**
 * AudioMediaオブジェクトを生成し、その出力先(Destination)を取得する。
 */
const createAudioObject = function() {

    // (デフォルト)出力先を取得する。
    const ctx = getContext();
    const dest = ctx.createMediaStreamDestination();

    // サーバ上の音源(MP3ファイル)へのパスを指定して、AudioMediaを生成する
    _audio = getAudio(_filename, searchNextContentAndPlay);
    // AudioMediaから音源を生成し、デフォルト出力先を出力に設定する(connect)。
    const src = ctx.createMediaElementSource(_audio);
    src.connect(dest);

    return dest;
};

/**
 * SoraのPublisherを生成してconnectする。
 */
const createPublisherAndConnect = function(dest) {
    // SoraのPublisherを取得し、上記音源の出力先を設定(connect)する。
    // 音声の送出にのみ使用するので、addstreamイベントは設定しない。
    _publisher = getSoraPublisher(_channelId, _metadata);
    // 接続する。
    _publisher.connect(dest.stream);
};

/**
 * addstreamイベントのハンドラを設定したSubscriberを生成する。
 */
const createSubscriberWithEventHandler = function() {

    _subscriber = getSoraSubscriber(_channelId, _metadata);
    // eventHandlerの設定
    _subscriber.on('addstream', function(event) {
        console.log(event);
        // 追加されたストリームからAudioMediaを生成
        const newAudio = createAudioStreamElement(event.stream);
        // <audio>を追加する。
        $('#containerDown').append(newAudio).append('<br/>');

        // FireFoxは"removestream"イベントを発火しないらしいので、ここで設定しておく
        event.stream.onremovetrack = function(e) {
            $('#' + event.stream.id).remove();
        };
    });
    return _subscriber;
}

// ---- 再生ソースリスト制御系 ----

/**
 * 再生リストに追加する。
 */
const pushQueue = function(src) {
    _sourceBuffer.push(src);
};

/**
 * 再生リストの先頭のソースをポップする。
 */
const popQueue = function() {
    if (_sourceBuffer.length === 0) {
        return null;
    }
    return _sourceBuffer.shift();
};

/**
 * 次に再生すべき音源を取得し、再生する。再生音源が存在しない場合は、音源が設定されるまでポーリングする。
 * 音源が終了したタイミングで実行される。
 */
const searchNextContentAndPlay = function() {
    $('#playInfo').text('次の音源が指定されるまで待機中...');
    polling();
};

/**
 * ポーリングする。
 * AudioMediaが消去されている場合はポーリングを中断する。
 * 再生すべき音源が設定されていた場合はポーリングを中断する。
 */
const polling = function() {
    if (isDisconnectAudio()) {
        return;
    }
    if (playNextSource()) {
        return;
    }
    console.log('WAITING...  ' + formatDate(new Date()));
    setTimeout(polling, _POLLING_INTERVAL);
};

/**
 * AudioMediaが存在するかを判定する。
 */
const isDisconnectAudio = function() {
    return _audio === null;
};

/**
 * 次の再生ソースを取得し再生する。
 */
const playNextSource = function() {

    // TODO 現在は画面上から次のファイル名を手作業で設定している。
    // TODO 本来は次のファイルが存在するかをポーリング中に確認し、次ファイル名を取得する処理が必要。
    // let nextSrc = getSource(onSuccess, onError);

    let nextSrc = popQueue();
    // 再生すべきファイルが無い場合
    if (nextSrc === null) {
        return false;
    }
    // 次に再生するファイルを再生する。
    _audio.src = _MP3_PATH + nextSrc;
    _audio.play();

    // statusを通常に戻して、画面表示をリフレッシュ
    _status = _STATUS_NORMAL;
    refreshSrcListDisplay();
    controlItems(_ON_CONNECTING);

    return true;
};

/**
 * ajax通信に成功した時の処理を記述する。
 */
const onSuccess = function(data) {
    // サーバから取得した再生音源ファイルを再生する（または、Queueに入れておく）。

};

/**
 * ajax通信に失敗した時の処理を記述する。
 */
const onError = function(jqXHR, status) {
    // タイムアウトの場合は再度接続する。

    // それ以外の場合は異常終了とする。

};

/**
 * 接続用パラメータをセットアップする。
 */
const setupConnectionParameter = function() {
    _channelId = $('#txtChannelId').val();
    _metadata = $('#txtMetadata').val();
    _filename = $('#txtAudioFileName').val();
    // 入力チェック
    return validate();
};

/**
 * 入力チェック
 */
const validate = function() {
    if (!_channelId) {
        alert('チャネルIdを入力して下さい。');
        return false;
    }
    if (!_filename) {
        alert('音源ファイル名を入力して下さい。');
        return false;
    }
    return true;
};

/**
 * 画面の「再生リスト」「再生情報」の表示を更新する。
 */
const refreshSrcListDisplay = function() {
    refreshPlayList();
    refreshPlayInfo();
};

/**
 *
 */
const refreshPlayList = function() {

    let playlist = $('#playList');
    playlist.empty();

    if (isDisconnectAudio()) {
        return;
    }

    for (let i = 0; i < _sourceBuffer.length; i++) {
       playlist.append('<li>' + _sourceBuffer[i] + '</li>');
    }
};

/**
 *
 */
const refreshPlayInfo = function() {

    if (_status === _STATUS_PENDING) {
        $('#playInfo').text('保留中。。。');
        return;
    }

    if (isDisconnectAudio()) {
        $('#playInfo').text('');
        return;
    }
    const srcName = getCurrentSrcName();
    $('#playInfo').text('Now, Playing ' + srcName + '...');

}

/**
 *
 */
const getCurrentSrcName = function() {
    if (isDisconnectAudio()) {
        return null;
    }
    const ary = _audio.src.split('/');
    return ary[ary.length - 1];
}

/**
 * 画面制御。
 */
const controlItems = function(target) {

    let disabled = [];
    let attrs = [];

    if (target === _ON_INIT) {
        disabled = [false, true, true];
        attrs = ['未接続', 'blue'];
        // デフォルトチャネル・メタデータの表示
        $('#txtChannelId').val(_DEFAULT_CHANNEL);
        $('#txtMetadata').val(_DEFAULT_METADATA);

    } else if (target === _ON_CONNECTING) {
        disabled = [true, false, false];
        attrs = ['接続中。。', 'red'];

    } else if (target === _ON_DISCONNECTING) {
        disabled = [false, true, true];
        attrs = ['未接続', 'blue'];

    } else if (target === _ON_PENDING) {
        disabled = [true, false, true];
        attrs = ['接続中。。', 'red'];

    } else {
        return;
    }

    $('#btnConnect').prop('disabled', disabled[0]);
    $('#btnDisconnect').prop('disabled', disabled[1]);
    $('#btnPending').prop('disabled', disabled[2]);
    $('#status').text(attrs[0]).css('color', attrs[1]);
};
