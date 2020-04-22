/**
 * Noitce:
 * - this file must include into index.html file right after main.js (to make sure window.boot func available)
 */

var UnzipLoader = function() {
    this._unzip = null;
    this._initialized = false;
}

UnzipLoader.prototype.init = function(callback) {
    console.log('init zip loader');
    var self = this;
    var url = 'text-res.zip';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(ev) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) { //0:localhost
                var u8a = new Uint8Array(ev.target.response);
                self._unzip = new Zlib.Unzip(u8a);
                self._initialized = true;
                callback();
            } else {
                console.log('Error load package: ' + xhr.status);
                callback(new Error('Load zip package failed'));
            }
        }
    };
    xhr.responseType = 'arraybuffer';
    xhr.send();
}

UnzipLoader.prototype.getFileDataAsString = function(url) {
    var fileText = '';
    try {
        var rawFileData = this._unzip.decompress(url);
        if(window.TextDecoder) {
            var textDecoder = new TextDecoder('utf-8');
            fileText = textDecoder.decode(rawFileData);
        } else {
            fileText = this.decodeText(rawFileData);
        }
    }catch(err) {
        console.log('Unzip Error[' + err.message + ']: when try to get data from file ' + url);
    }
    return fileText;
}

// custom decode function incase browser not support
UnzipLoader.prototype.decodeText = function(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
    c = array[i++];
    switch(c >> 4)
    { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
    }

    return out;
}

// utils
var _urlAppendTimestamp = function (url) {
    if (cc.game.config['noCache'] && typeof url === 'string') {
        if (/\?/.test(url))
            url += '&_t=' + (new Date() - 0);
        else
            url += '?_t=' + (new Date() - 0);
    }
    return url;
}
//////// Text zip hander ////////
var _textZipHander = function(item, callback) {
    var url = item.url;
    
    // check text data in zip first
    if (window.unzipLoader && window.unzipLoader._initialized) {
        var text = window.unzipLoader.getFileDataAsString(url);
        if (text !== '') {
            callback(null, text);
            return;
        }
    }

    // fallback to default when fail
    url = _urlAppendTimestamp(url);

    var xhr = cc.loader.getXMLHttpRequest(),
        errInfo = 'Load text file failed: ' + url;
    xhr.open('GET', url, true);
    if (xhr.overrideMimeType) xhr.overrideMimeType('text\/plain; charset=utf-8');
    xhr.onload = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 0) {
                callback(null, xhr.responseText);
            }
            else {
                callback({status:xhr.status, errorMessage:errInfo + '(wrong status)'});
            }
        }
        else {
            callback({status:xhr.status, errorMessage:errInfo + '(wrong readyState)'});
        }
    };
    xhr.onerror = function(){
        callback({status:xhr.status, errorMessage:errInfo + '(error)'});
    };
    xhr.ontimeout = function(){
        callback({status:xhr.status, errorMessage:errInfo + '(time out)'});
    };
    xhr.send(null);
}

var _textZipMap = {
    'txt' : _textZipHander,
    'xml' : _textZipHander,
    'vsh' : _textZipHander,
    'fsh' : _textZipHander,
    'atlas' : _textZipHander,

    'tmx' : _textZipHander,
    'tsx' : _textZipHander,

    'json' : _textZipHander,
    'ExportJson' : _textZipHander,
    'plist' : _textZipHander,

    'fnt' : _textZipHander,

    'default' : _textZipHander
};

//////// Cocos creator boot step inject ////////
// boot function only availabe when main.js loaded
var cocos_boot = window.boot;
if(cocos_boot) {
    
    // redefine boot
    window.boot = function() {
        // init unzip text system
        window.unzipLoader = new UnzipLoader();
        window.unzipLoader.init(function(err) {
            // add text zip load hander
            cc.loader.addDownloadHandlers(_textZipMap);
            // boot to normal when complete
            cocos_boot();
        })
    }
} else {
    console.error("Can not find window.boot function. Make sure insert this script in right place (right after main.js)");
}