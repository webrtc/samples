var fs = require('fs')
var vm = require('vm')
function include(path) {
    var code = fs.readFileSync(path, 'utf-8');
    vm.runInThisContext(code, path);
}

include('webrtctest.js')
include('example.js')
