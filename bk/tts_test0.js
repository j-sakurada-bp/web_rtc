const IP_ADDRESS = '13.231.213.196';
const SUB_DOMAIN = 'resources/wav';
const FILENAME = 'eine.mp3';


function doTest() {
    let ctx = getContext();
    let pc = getRTCPeerConnection();
    
}

function createUrl() {
    return 'http://adrs/sd/fname'
                .replace('adrs', IP_ADDRESS)
                .replace('sd', SUB_DOMAIN)
                .replace('fname', FILENAME);
}

/**
 * audioメディア取得用contextを取得する。
 */
function getContext() {
    var context = window.AudioContext || window.webkitAudioContext;
    return new context();
};

/**
 * RTCPeerConnectionを取得する。
 */
function getRTCPeerConnection() {
    var PC =
        window.RTCPeerConnection
        || window.webkitRTCPeerConnection
        || window.mozRTCPeerConnection;
    return new PC();
}
