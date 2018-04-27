// 定数
const _DEBUG = false;

// PATH系
// 「WebRTCチャネル取得」サブドメイン
const _SUB_DOMAIN_CHANNEL_ID = 'bp7ahui7yg';
// 「保留音音源取得URL取得」サブドメイン
const _SUB_DOMAIN_WAIT_SOUND = '38lhnz89x4';
// 環境ID
const _ENV_ID = 'prod';
// 「WebRTCチャネル取得」API_ID
const _API_ID_CHANNEL_ID = 'get_webrtc_channel';
// 「保留音音源取得URL取得」API_ID
const _API_ID_WAIT_SOUND = 'get_wait_sound_effect';
// シグナリングサーバ
const _SIGNALING_SERVER = 'ws://13.231.213.196:5000/signaling';
// APIのURLのフォーマット
const _API_FORMAT = 'https://SUBDOMAIN.execute-api.ap-northeast-1.amazonaws.com/ENV/APINAME';
// 音源ソース（仮）相対パス
const _MP3_PATH = './resources/audio/'; // 相対パスは、htmlファイルディレクトリがBaseとなるらしい。。

// OPTIONS系
// getUserMediaを取得する際のoptions
const _DEFAULT_MEDIA_OPTIONS = {
    audio: true,
    video: false,
    audioBitRate: 32
};
// Publisher / SubscriberをMultiStreamで取得する際のoptions
const _MULTISTREAM_OPTIONS = {
    audio: true,
    video: false,
    audioBitRate: 32,
    multistream: true,
}
// ajaxでのPOST通信共通パラメータ。この定数を直接使用せずに、createCommonPostParameter()を使用する。
// urlとdata属性は、外部から設定する。
const _COMMON_POST_PARAM = {
    // url:url,
    type:'POST',
    contentType:'application/json; charset=utf-8',
    dataType: "json",
    // data: JSON.stringify(data),
    crossDomain: true,
    scriptCharset: 'utf-8'
};

// メディア（audio）HTMLタグ
const _MEDIA_TAG = 'audio';
// polling間隔
const _POLLING_INTERVAL = 50;
// ログフォーマット
const _LOG_FORMAT = 'YYYY-MM-DD hh:mm:ss.SSS'

// ========================================================

/**
 * ajaxでPOST通信用のパラメータオブジェクトを取得する。
 */
const createCommonPostParameter = function(url, data) {
    // ORIGINALのDeepCopyを生成する。
    const param = JSON.parse(JSON.stringify(_COMMON_POST_PARAM));

    param.url = url;
    param.data = JSON.stringify(data);

    return param;
};

/**
 * 自ページがコールされた時のREQUEST(GET)パラメータから、マップ(KeyValueオブジェクト)を生成する。
 */
function getGetParameters() {

    // GETパラメータ
    const urlParameter = location.search;
    if (!urlParameter) {
        return {};
    }
    let params = urlParameter.substring(1);
    if (!params) {
        return {};
    }
    // mapに変換
    params = params.split('&');
    const paramObj = {};
    for (let i = 0; i < params.length; i++) {
        const keyValue = params[i].split('=');
        paramObj[keyValue[0]] = keyValue[1];
    }
    return paramObj;
};

/**
 * サーバのAPIを生成して取得する。
 */
const getApiPath = function(subdomain, env, apiname) {
    return _API_FORMAT.replace('SUBDOMAIN', subdomain)
                      .replace('ENV', env)
                      .replace('APINAME', apiname);
};

/**
 * UserMediaを取得する。
 */
const getUserMedia = function(options) {

    navigator.mediaDevices.getUserMedia =
        navigator.mediaDevices.getUserMedia
        || navigator.mediaDevices.webkitGetUserMedia
        || navigator.mediaDevices.mozGetUserMedia;

    if (!navigator.mediaDevices.getUserMedia) {
        raiseError('UserMediaを取得出来ません。');
    }

    options = options || _DEFAULT_MEDIA_OPTIONS;

    return navigator.mediaDevices.getUserMedia(options);
};

/**
 * SORAのPublisherオブジェクトを取得する。
 */
const getSoraPublisher = function(channelId, metadata, options) {
    // channelId未指定はNG
    if (!channelId) {
        throw new Error('channelId is required.');
    }
    // 残りはデフォルト値を
    metadata = metadata || '';
    options = options || _MULTISTREAM_OPTIONS;

    return getSoraConnection().publisher(channelId, metadata, options);
};

/**
 * SoraのSubscriberオブジェクトを取得する。
 */
const getSoraSubscriber = function(channelId, metadata, options) {
    // channelId未指定はNG
    if (!channelId) {
        raiseError('チャネルIDを指定して下さい。');
    }
    // 残りはデフォルト値を
    metadata = metadata || '';
    options = options || _MULTISTREAM_OPTIONS;

    return getSoraConnection().subscriber(channelId, metadata, options);
};

/**
 * SORAのコネクションを取得する。
 */
const getSoraConnection = function(url, debug) {
    url = url || _SIGNALING_SERVER;
    debug = debug || _DEBUG;
    return Sora.connection(url, debug);
};

/**
 * AudioContextオブジェクトを取得する。
 */
const getContext = function() {
    var context = window.AudioContext || window.webkitAudioContext;
    return new context();
};

/**
 * リモートファイルをリソースとして、AudioMediaを生成して取得する。
 * 第二引数には、音声データ再生が終了した時にコールする関数を指定する。
 */
const getAudio = function(filename, callback) {
    const audio = new Audio(_MP3_PATH + filename);
    if (callback) {
        audio.addEventListener("ended", callback);
    }
    return audio;
};

/**
 * AJAX通信を行う。
 * 内部では、$.ajax()を実行しているだけ。
 */
function ajax(param, funcOnSuccess, funcOnError) {
    if (!param) {
        throw new Error('ajax通信parameterを指定して下さい。');
    }
    funcOnSuccess = funcOnSuccess || ajaxDefaultFuncOnSuccess;
    funcOnError = funcOnError || ajaxDefaultFuncOnError;
    $.ajax(param).done(funcOnSuccess).fail(funcOnError);
};
/**
 * AJAX通信成功時に実行するfunctionのデフォルト実装。
 * テスト時に使用します。
 */
const ajaxDefaultFuncOnSuccess = function(d, s, x) {
    console.log(JSON.stringify(d));
    console.log(s);
    console.log(x);
};
/**
 * AJAX通信失敗時に実行するfunctionのデフォルト実装。
 * テスト時に使用します。
 */
const ajaxDefaultFuncOnError = function(e) {
    notifyMsg(JSON.stringify(e));
}

/**
 * Stremを元に<Audio>タグを生成する。
 * srcObject属性以外は規定値を設定している。
 */
const createAudioStreamElement = function(stream, autoplay) {
    if (!stream) {
        throw new Error('パラメータstreamを指定して下さい。');
    }
    const audio = document.createElement(_MEDIA_TAG);
    audio.id = stream.id;
    audio.autoplay = autoplay || true;
    audio.width = '400'; // 無効力
    audio.height = '40'; // 無効力
    audio.srcObject = stream;
    audio.controls = true;
    return audio;
};

// ========================================

/**
 * 値を保持しているかを判定する。
 * undefinedまたはnullまたは空文字の場合、値を保持していないと判定する。
 */
const hasValue = function(target) {
    if (target === undefined) {
        return false;
    }
    if (target === null) {
        return false;
    }
    if (target === '') {
        return false;
    }
    return true;
};

/**
 * メッセージを通知する。
 * consoleにログ出力し、alertで表示している。
 */
const notifyMsg = function(msg) {
    console.log(msg);
    alert(msg);
};

/**
 * エラーを発生する。
 */
const raiseError = function(msg) {
    console.log(msg);
    throw new Error(msg);
};

/**
 * 日付をフォーマットして返却する。
 */
const formatDate = function (date) {

    let format = _LOG_FORMAT;
    format = format.replace(/YYYY/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/hh/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    if (format.match(/S/g)) {
        const milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
        const length = format.match(/S/g).length;
        for (let i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
    }
    return format;
};
