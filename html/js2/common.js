// 定数
const _URL = 'ws://13.231.213.196:5000/signaling';
const _MP3_PATH = './resources/audio/'; // 相対パスは、htmlファイルディレクトリがBaseとなるらしい。。
const _DEBUG = false;
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
};
// polling間隔
const _POLLING_INTERVAL = 50;
const _LOG_FORMAT = 'YYYY-MM-DD hh:mm:ss.SSS'
const _MEDIA_TAG = 'audio';

/**
 * REQUEST(GET)パラメータから、マップ(KeyValueオブジェクト)を生成する。
 */
function getGetParameters() {

    // GETパラメータ
    let urlParameter = location.search;
    if (!urlParameter) {
        return {};
    }
    let params = urlParameter.substring(1);
    if (!params) {
        return {};
    }
    // mapに変換
    params = params.split('&');
    let paramObj = {};
    for (let i = 0; i < params.length; i++) {
        let keyValue = params[i].split('=');
        paramObj[keyValue[0]] = keyValue[1];
    }
    return paramObj;
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
        alert('UserMediaを取得出来ません。');
        throw new Error('UserMediaを取得出来ません。');
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
        throw new Error('channelId is required.');
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
    url = url || _URL;
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
 * サーバから次に再生する音源ファイル名を取得する。(未調整。サーバAPIが確定次第、修正）
 */
function getSource(funcOnSuccess, funcOnError) {

    const param = {};

    $.ajax({
        type: 'GET',
        url: '/audiosource', // not exist
        data: param,
        content: 'application/json',
        dataType: 'json',
        timeout: 10000,
    }).done(function(data) {
        if (funcOnSuccess) {
            funcOnSuccess(data);
        }
    }).fail(function(jqXHR, status) {
        if (funcOnError) {
            funcOnError(jqXHR, status);
        }
    });
};

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
    audio.width = '400';
    audio.height = '40';
    audio.srcObject = stream;
    audio.controls = true;
    return audio;
};
//
// const createAudioSourceElement = function(source, id, autoplay) {
//     if (!source) {
//         throw new Error('パラメータsourceを指定して下さい。');
//     }
//     const audio = document.createElement(_MEDIA_TAG);
//     if (id) {
//         audio.id = id;
//     }
//     audio.autoplay = autoplay || false;
//     audio.width = '400';
//     audio.height = '40';
//     audio.src = source;
//     audio.controls = true;
//     return audio;
// };

// -------------------------------------

/**
 * 値を保持しているかを判定する。
 * undefinedまたはnullの場合、値を保持していないと判定する。
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
        var milliSeconds = ('00' + date.getMilliseconds()).slice(-3);
        var length = format.match(/S/g).length;
        for (var i = 0; i < length; i++) format = format.replace(/S/, milliSeconds.substring(i, i + 1));
    }
    return format;
};

// /**
//  * document.getElementByIdの簡略化。
//  */
// const getElById = function(id) {
//     return document.getElementById(id);
// };
