var posix = require('posix'),
    net   = require('net');

var Einhorn = {};

Einhorn.is_worker = function() {
  var env_ppid = process.env['EINHORN_MASTER_PID'];
  if (!env_ppid)
    return false;
  if (posix.getppid() != parseInt(env_ppid))
    return false;
  return true;
}

Einhorn.ack = function(cb) {
  if (!Einhorn.is_worker())
    return;
  var conn;
  if(process.env['EINHORN_SOCK_PATH']) {
    conn = net.connect({
             path: process.env['EINHORN_SOCK_PATH']
        });
  } else if(process.env['EINHORN_SOCK_FD']) {
    conn = new net.Socket({fd: process.env['EINHORN_SOCK_FD']});
    process.nextTick(function() { conn.emit('connect'); });
  }
  conn.on('error', function(err) {
    if (cb) cb(err);
    conn.end();
  });
  conn.on('connect', function() {
    // We should be able to just JSON-encode the ack message, but
    // Ruby 1.8's YAML can't parse JSON-style messages. So just
    // construct YAML by hand, rather than pulling in another
    // dependency just for this one message.
    var msg = "---\ncommand: worker:ack\npid: " + process.pid;
    conn.write(encodeURI(msg) + "\n");
    conn.end();
    if (cb) cb();
  });
}

module.exports = Einhorn;
