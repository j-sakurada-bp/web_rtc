let _pub = null;
let _pub2 = null;
let _sub = null;

const connPub = function() {

    const options = {
        mutistream: true,
    };
    _pub = getSoraPublisher('tcdt', 'md1', options);

    getUserMedia({audio : true, video : false})
        .then(mediaStream => {
            _pub.connect(mediaStream)
                .then(stream => {
                    document.getElementById('player').srcObject = stream;
                });
        })
        .catch(error => {
            console.log(error);
            alert('ERROR RAISED.' + error.message)
        });

    _pub.on('addstream', e => {
        console.log('==== ADD STREAM.');
    });
    _pub.on('removestream', e => {
        console.log('==== REMOVE STREAM.');
    });
};

const disconnPub = function() {
    if (_pub) {
        _pub.disconnect();
    }
};

const connSub = function() {

    const options = {
        mutistream: true,
    };

    _pub2 = getSoraPublisher('tcdt', 'md2', options);

    getUserMedia({audio : true, video : false})
        .then(mediaStream => {
            _pub2.connect(mediaStream)
                .then(stream => {
                    const audio = document.getElementById('player2');
                    const newSrc = document.createElement('audio');
                    newSrc.srcObject = stream;
                });
        })
        .catch(error => {
            console.log(error);
            alert('ERROR RAISED.' + error.message)
        });

    _pub2.on('addstream', e => {
        console.log('**** ADD STREAM.');
    });
    _pub2.on('removestream', e => {
        console.log('**** REMOVE STREAM.');
    });

};

const disconnSub = function() {
    if (_sub) {
        _sub.disconnnect();
    }
    if (_pub2) {
        _pub2.disconnect();
    }
};
