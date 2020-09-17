const fs = require('fs');
const path = require('path');
const { check: checkFilter, update: updateFilter } = require('./filter');

const MAX_LENGTH = 10;
const noop = () => {};

module.exports = (server, { storage }) => {
  let sessions = [];
  let timer;
  const writeSessions = (dir) => {
    try {
      const text = JSON.stringify(sessions.slice(), null, '  ');
      sessions = [];
      dir = path.resolve(dir, `${Date.now()}.txt`);
      fs.writeFile(dir, text, (err) => {
        if (err) {
          fs.writeFile(dir, text, noop);
        }
      });
    } catch (e) {}
  };
  const filterData = (s) => {
    const fnContent = storage.getProperty('filterData');
    // eslint-disable-next-line no-new-func
    return (new Function('session', fnContent))(s);
  };
  updateFilter(storage.getProperty('filterText'));
  server.on('request', (req) => {
    // filter
    const active = storage.getProperty('active');
    if (!active) {
      return;
    }
    const dir = storage.getProperty('sessionsDir');
    if (!dir || typeof dir !== 'string') {
      sessions = [];
      return;
    }
    if (!checkFilter(req.originalReq.url)) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      clearTimeout(timer);
      const result = filterData(s);
      sessions.push(result);
      if (sessions.length >= MAX_LENGTH) {
        writeSessions(dir);
      } else {
        // 10秒之内没满10条强制写入
        timer = setTimeout(() => writeSessions(dir), 10000);
      }
    });
  });
};
