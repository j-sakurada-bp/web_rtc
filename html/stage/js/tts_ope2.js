// ポーリングログの出力要否
const _OUTPUT_LOG = false;
// 再生/保留ステータス
const _STATUS_NORMAL = 0;
const _STATUS_PENDING = 1;
const _STATUS_NO_SOURCE = 2;
// 画面ステータス
const _ON_NOT_READY = 0;
const _ON_CONNECTING = 1;
const _ON_DISCONNECTING = 2;
const _ON_PENDING = 3;
const _ON_INVALID = 9;
// polling間隔
const _POLLING_INTERVAL_CHANNEL_ID = 1000;
const _POLLING_INTERVAL_SEARCH_SOURCE = 500;
// サーバでchannelIdが削除されてドライバとのチャネルが確立されていない事を示すダミーチャネルID
const _DISCONNECTED_ID = '__DISCONNECT_FROM_DRIVER__';
//
const _TTS_VOLUME_RATE = 0.2

// ステータス（通常 / 保留中）
let _status = _STATUS_NO_SOURCE;

// 関数横断で使用する変数
let _ope_id = null;
// チャネルID取得APIで使用する変数
let _channelId = null;
let _new_channelId = null;
// 音源ファイル名取得APIで使用する変数
let _source_path = null;

// 保留音Url
let _wait_sound_url = null;

// Soraオブジェクト
let _publisher = null;
let _subscriber = null;
// Audio Mediaオブジェクト
let _audio = null;
let _gainNode = null;

// =================== 初期化処理系 ==================

/**
 * 初期化処理
 */
$(() => {
    // 画面を使用不可に設定。
    controlItems(_ON_NOT_READY);
    // イベントハンドラの設定
    setupEventHandler();
    // 画面呼出パラメータからオペレータIDを取得する
    if (getOperatorIdFromParameter() === false) return;
    // 2018.05.07 保留音は「保留音４」で固定
    getWaitSoundPath(4);
    // channelIdが設定されるの監視する
    observeChannelId(); // -> ポーリングを開始
});

/**
 * イベントハンドラを設定する。
 */
const setupEventHandler = function() {
    $('#btnDisconnect').on('click', doDisconnect);
    $('#btnPending').on('click', doPending);
    $('#btnPendingOff').on('click', doPendingOff);
};

/**
 * オペレータIDを取得する。
 */
const getOperatorIdFromParameter = function() {

    const param = getGetParameters();
    _ope_id = param.operator_id;
    if (!_ope_id) {
        notifyMsg('GETパラメータにoperator_idを指定して下さい。index2.htmlを使用して下さい。');
        window.location.href = 'index2.html';
        return false;
    }

    return true;
};

// ---- イベントハンドラ----

/**
 * 「切断」ボタンイベントハンドラ。
 */
const doDisconnect = function() {
    // 切断する
    disconnect();
    // channelIdが設定されるの監視する
    observeChannelId(); // -> ポーリングを開始
};

/**
 * 「保留」ボタンイベントハンドラ
 */
const doPending = function() {

    // 保留音が選択済み？
    if (!_wait_sound_url) {
        notifyMsg('保留音を選択して下さい。');
        return;
    }
    // 保留音を接続
    if (_audio) {
        updateAudioSource(_wait_sound_url, true);
    }
    // 画面表示を変更
    _status = _STATUS_PENDING;
    refreshPlayInfo();
};

/**
 * 「保留解除」ボタンイベントハンドラ
 */
const doPendingOff = function() {

    // 保留音を接続
    if (_audio) {
        updateAudioSource(null, false);
    }
    // 画面表示を変更
    _status = _STATUS_NORMAL;
    refreshPlayInfo();
};

// ==================== チャネルID取得処理 ====================

/**
 * チャネルIDの登録/更新/削除を監視して、コネクションを制御する。
 * 画面起動中は、既定インターバルでポーリングし続ける。
 */
const observeChannelId = function() {
    // ポーリングメッセージ
    if (_OUTPUT_LOG) console.log('WAITING 4 CONNECTING...  ' + formatDate(new Date()));

    // サーバからChannelIdが取得できない場合は、_DISCONNECTED_IDが設定されている。
    if (_new_channelId === _DISCONNECTED_ID) {
        _channelId = null;
        _new_channelId = null;
        disconnect();

    // サーバからChannelIdが取得され、かつ、現行のChannelIdと異なる場合は、コネクションをリフレッシュ
    } else if (_new_channelId !== null) {
        console.log('●新しいチャネルIDが設定されました。：' + _new_channelId);
        // 新しいチャネルIDの設定
        _channelId = _new_channelId;
        _new_channelId = null;
        // コネクションをリフレッシュ
        disconnect();
        connect();

        // 再生音源を検索するポーリングをスタートする
        searchNextSourceAndWait();
    }

    // チャネルIDの取得
    getChannelId();
    // チャネルID取得ポーリングは継続される...
    setTimeout(observeChannelId, _POLLING_INTERVAL_CHANNEL_ID);
};

/**
 * ChannelIDを取得する。
 * 非同期でAjax通信を実行する。通信に成功した時は、getChannelIdOnSuccess()がコールバックされる。
 */
const getChannelId = function() {
    // APIパスの生成
    const path = getApiPath(_SUB_DOMAIN_CHANNEL_ID, _ENV_ID, _API_ID_CHANNEL_ID);
    // パラメータ生成
    const param = createCommonPostParameter(path, { operatorId : _ope_id });
    // サーバ通信の実行
    ajax(param, getChannelIdOnSuccess);
};

/**
 * chanelId取得通信成功時に実行するfunction。
 * チャネルIDを取得出来た場合、かつ、現在のチャネルIDと異なる場合は、新たなチャネルIDとして保存する。
 */
const getChannelIdOnSuccess = (data, textStatus, jqXHR) => {

    const cd = parseInt(data.statusCode, 10);
    // HTTP Statusが不正な場合
    if (cd !== 200) {
        notifyMsg('System Errorが発生しました。（StatusCode ; ' + cd + '）');
        // 画面を制御する。
        controlItems(_ON_INVALID);
        return;
    }

    // 結果コードを判定
    const result = JSON.parse(data.body);
    if (result.resultCode === 0) {
        // 現在のチャネルIDと異なる場合のみ
        if (_channelId !== result.channelId) {
            _new_channelId = result.channelId;
        }
    // チャネルIDが取得出来ない（resultCode != 0）かつ現在チャネルに接続中の場合、切断を示すチャネルIDを設定する
    } else if (_channelId !== null) {
        _new_channelId = _DISCONNECTED_ID;
    }
};

// =================== 保留音取得処理 ===================

/**
 * 保留音ソースのURLを取得する。
 * 非同期でAjax通信を実行する。通信に成功した時は、getWaitSoundPathOnSuccess()がコールバックされる。
 */
const getWaitSoundPath = function(soundId) {
    // パラメータ生成
    const paramData = {
        operatorId : _ope_id ,
        soundEffectId : soundId
    };
    // APIパスの生成
    const path = getApiPath(_SUB_DOMAIN_WAIT_SOUND, _ENV_ID, _API_ID_WAIT_SOUND);
    // パラメータ
    const param = createCommonPostParameter(path, paramData);
    // サーバ通信の実行
    ajax(param, getWaitSoundPathOnSuccess);
};

/**
 * 保留音ソースURL取得通信成功時に実行するfunction。
 */
const getWaitSoundPathOnSuccess = function(data, textStatus, jqXHR) {

    const cd = parseInt(data.statusCode);
    // HTTP Statusが不正な場合
    if (cd !== 200) {
        notifyMsg('System Errorが発生しました。（StatusCode ; ' + cd + '）');
        // 画面を制御する。
        controlItems(_ON_INVALID);
        return;
    }

    // 結果コードを判定
    const result = JSON.parse(data.body);
    switch (result.resultCode) {
        // 正常終了時は保留音URLを保持
        case 0:
            _wait_sound_url = result.soundEffectUrl;
            break;
        case 9:
            notifyMsg('Mapping Error. ; ' + result.message);
            break;
        default:
            notifyMsg('予期せぬresultCodeが返却されました。 result code ; ' + result.resultCode + ', ' + result.message);
            break;
    }
};

// =================== 接続制御系 ===================

/**
 * Soraサーバに接続する。
 * TTS音源を発信するためにSubscriberとして接続し、
 * かつ、ドライバ/TTSの音声を受信する為にSubscriberとして接続する。
 */
const connect = function() {

    // 1. TTSを流すmutistreamのPublisherを生成する。
    // AudioMediaを生成して出力先を取得
    const dest = createAudioObject();
    // SoraのPublisherへ接続
    createPublisherAndConnect(dest);

    // 2. 下りstreamを再生するためのmultistreamのsubscriberを生成する
    const subscriber = createSubscriberWithEventHandler();
    // 接続する。
    subscriber.connect()
              .catch(error => console.log(error));

    // 3. 画面表示制御
    controlItems(_ON_CONNECTING);

    console.log('●チャネルに接続しました。：' + _channelId);
};

/**
 * 切断処理。
 * Audioメディアを削除し、SoraのPublisher / Subscriberを切断して削除する。
 */
const disconnect = function() {
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

    // 画面を制御する。
    $('#containerDown').empty();
    // ステータス・画面表示を更新
    _status = _STATUS_NORMAL;
    refreshPlayInfo();
    controlItems(_ON_DISCONNECTING);

    console.log('●チャネルから切断しました。');
}

/**
 * AudioMediaオブジェクトを生成し、その出力先(Destination)を取得する。
 */
const createAudioObject = function() {

    // (デフォルトの)出力先を取得する。
    const ctx = getContext();
    const dest = ctx.createMediaStreamDestination();

    // サーバ上の音源(MP3ファイル)へのパスを指定して、AudioMediaを生成する
    _audio = getAudio(_source_path, searchNextSource); // 第一引数はnullの場合がありその時は音源が指定されない。第二引数は音源が終了した時にコールバックされる関数0
    // AudioMediaから音源を生成し、デフォルト出力先を出力に設定する(connect)。
    const src = ctx.createMediaElementSource(_audio);

    // ボリューム調整用のノードを追加
    _gainNode = ctx.createGain();
    src.connect(_gainNode);
    _gainNode.connect(dest);
    _gainNode.gain.value = _TTS_VOLUME_RATE;

    return dest;
};

/**
 * SoraのPublisherを生成してconnectする。
 */
const createPublisherAndConnect = function(dest) {

    // SoraのPublisherを取得し、引数「音源の出力先」を設定(connect)する。
    // 音声の送出にのみ使用するので、addstreamイベントは設定しない。（新たなstreamが追加されても表示・再生しない）
    _publisher = getSoraPublisher(_channelId);
    // 接続する。
    _publisher.connect(dest.stream);
};

/**
 * addstreamイベントのハンドラを設定したSubscriberを生成する。
 */
const createSubscriberWithEventHandler = function() {

    _subscriber = getSoraSubscriber(_channelId);
    // eventHandlerの設定
    _subscriber.on('addstream', function(event) {

        // 追加されたストリームからAudioタグを生成
        const newAudio = createAudioStreamElement(event.stream);
        // オーディオタグを追加する。
        $('#containerDown').append(newAudio).append('<br/>');

        // removestreamイベントハンドラ (FireFoxは"removestream"イベントを発火しないらしい。ここで設定しておく)
        event.stream.onremovetrack = function(e) {
            $('#' + event.stream.id).remove();
        };
    });

    return _subscriber;
}

// =================== 再生音源制御系 ==================
/**
 * 次に再生すべき音源を取得し、再生する。
 * (ポーリングを開始する前に音源URLをクリアしている)
 */
const searchNextSource = function() {
    // 初期化
    _source_path = null;
    // ポーリング開始
    searchNextSourceAndWait();
}

/**
 * 次に再生すべき音源を取得し、再生する。再生音源が存在しない場合は、音源が設定されるまでポーリングする。
 * チャネルIDが更新された時、音源が終了した時、保留音が設定された時の各タイミングで実行される。
 */
const searchNextSourceAndWait = function() {
    // ポーリングメッセージ
    if (_OUTPUT_LOG) console.log('WAITING 4 FINDING CONTENT...  ' + formatDate(new Date()));

    // サーバから音源パスが取得できた場合は、_new_source_pathに設定されている。音源を生成して再生開始
    if (_source_path === null) {
        // ペンディング中は「ペンディング中」メッセージのまま
        if (_status !== _STATUS_PENDING) {
            _status = _STATUS_NO_SOURCE;
            refreshPlayInfo();
        }

    } else {
        // Audioメディアが切断されている＝Soraとも接続されていない
        if (isDisconnectAudio()) {
            connect();
        } else {
            // Audioメディアの音源だけ更新する
            updateAudioSource(_source_path, false);
        }
        // ステータス・画面表示の更新
        _status = _STATUS_NORMAL;
        refreshPlayInfo();
        // ロギング
        console.log('●新しい音源を取得しました。：' + _source_path);
        // ポーリング中断
        return;
    }
    // 次の音源パスの取得を試みる
    getNextSource();
    // ポーリング継続
    setTimeout(searchNextSourceAndWait, _POLLING_INTERVAL_SEARCH_SOURCE);
};

/**
 * Audioメディアが切断されているかを判定する。
 */
const isDisconnectAudio = function() {
    return _audio === null;
}

/**
 * Audioの音源を更新し、再生する。
 */
const updateAudioSource = function(path, isloop) {

    isloop = isloop || false;
    _audio.pause();
    // 音源が指定されない場合があり、その時は再生しない。
    if (path) {
        _audio.src = path;
        _audio.loop = isloop;
        _audio.play();
    }
}

/**
 * 音声音源のURLを取得する。
 * 非同期でAjax通信を実行する。通信に成功した時は、getNextSourceOnSuccess()がコールバックされる。
 */
const getNextSource = function() {

    // APIパスの生成
    const path = getApiPath(_SUB_DOMAIN_OPE_VOICE, _ENV_ID, _API_ID_OPE_VOICE);
    // パラメータ生成
    const param = createCommonPostParameter(path, { operatorId : _ope_id });
    // サーバ通信の実行
    ajax(param, getNextSourceOnSuccess);
};

/**
 * 音声音源URL取得通信成功時に実行するfunction。
 */
const getNextSourceOnSuccess = (data, textStatus, jqXHR) => {

    const cd = parseInt(data.statusCode, 10);
    // HTTP Statusが不正な場合
    if (cd !== 200) {
        notifyMsg('System Errorが発生しました。（StatusCode ; ' + cd + '）');
        // 画面を制御する。
        controlItems(_ON_INVALID);
        return;
    }

    // 結果コードを判定
    const result = data.body; // サーバからのレスポンスは既にJavaScriptオブジェクトになっており、JSON.parse()の必要はないらしい。
    // const result = JSON.parse(data.body);
    if (result.resultCode === 0) {
        _source_path = (result.voiceUrl === '' ? null : result.voiceUrl);
        _source_path = null;
    }
};

// =================== 画面制御系 ===================

/**
 * 再生状態の表示をリフレッシュする。
 */
const refreshPlayInfo = function() {

    let msg = null;
    if (isDisconnectAudio()) {
        msg = '';
    } else if (_status === _STATUS_NO_SOURCE) {
        msg = '';
    } else if (_status === _STATUS_PENDING) {
        msg = '保留中。。。';
    } else {
        msg = 'Now, Playing ' + getCurrentSrcName() + '...';
    }
    $('#playInfo').text(msg);
}

/**
 * 現在再生中の音源ソースのファイル名を取得する。
 */
const getCurrentSrcName = function() {
    const ary = _audio.src.split('/');
    return ary[ary.length - 1];
}

/**
 * 画面制御。
 */
const controlItems = function(target) {

    let disabled = [];
    let attrs = [];

    if (target === _ON_NOT_READY) {
        disabled = [true, true];
        attrs = ['接続待機中。。', 'green'];

    } else if (target === _ON_CONNECTING) {
        disabled = [true, false];
        attrs = ['接続中', 'blue'];

    } else if (target === _ON_DISCONNECTING) {
        disabled = [false, true];
        attrs = ['接続待機中。。', 'green'];

    } else if (target === _ON_PENDING) {
        disabled = [true, true];
        attrs = ['。。保留にしています。。', 'red'];

    } else if (target === _ON_INVALID) {
        disabled = [true, true];
        attrs = ['エラーが発生しました。', 'red'];

    } else {
        return;
    }

    $('#btnConnect').prop('disabled', disabled[0]);
    $('#btnPending').prop('disabled', disabled[1]);
    $('#status').text(attrs[0]).css('color', attrs[1]);
};
