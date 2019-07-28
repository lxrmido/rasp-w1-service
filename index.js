require('dotenv').config();
var express = require('express');
var bodyParser = require("body-parser");
var fs = require('fs');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var config = {
    servicePort: process.env.SERIVCE_PORT || 3000,
    dataDir: process.env.DATA_DIR || 'data',
    backupFile: process.env.BACKUP_FILE || 'data/values.json',
    backupInterval: parseInt(process.env.BACKUP_INTERVAL || 60000),
    readInterval: parseInt(process.env.READ_INTERVAL || 10000),
    readLimit: parseInt(process.env.READ_LIMIT || 8640),
    deviceDir: provess.env.DEVICE_DIR || "/sys/bus/w1/devices/",
    deviceFile: process.env.DEVICE
};

if (!config.deviceFile) {
    fs.readdirSync(config.deviceDir).forEach(function (name) {
        if (name.indexOf('28-') === 0) {
            config.deviceFile = config.deviceDir + name + '/w1_slave';
        }
    });
}

if (!config.deviceFile) {
    console.log('No Device Found.');
    process.exit();
}

var values = [];
var current = 0;
var updated = 0;
var daily  = {
    values: [],
    key: '',
    file: ''
};

if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir);
}

if (fs.existsSync(config.backupFile)) {
    values = JSON.parse(fs.readFileSync(config.backupFile));
}

app.get('/', function (req, res) {
    res.send({
        updated: updated,
        value: current
    });
});

app.get('/today', function (req, res) {
    res.send(daily);
});

app.get('/range', function (req, res) {
    res.send(values);
});

app.listen(config.servicePort, function () {
  console.log('Listening on port ' + config.servicePort);
});

function backup(){
    fs.writeFileSync(config.backupFile, JSON.stringify(values));
    backupDaily();
    setTimeout(backup, config.backupInterval);
}

function backupDaily(){
    if (daiy.file.length) {
        return fs.writeFileSync(daily.file, JSON.stringify(daily.values));
    }
    return false;
}

function getDailyKey(){
    let d = new Date();
    function pad(x){
        return (x > 9 ? '' : '0') + x;
    }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function addValue(v){
    if (values.length >= config.readLimit) {
        values.splice(0, values.length - config.readLimit + 1);
    }
    values.push(v);
    let vot = {
        time: new Date().getTime(),
        value: v
    };
    let key = getDailyKey();
    if (key != daily.key) {
        backupDaily();
        daily.file = config.DATA_DIR + '/' + key + '.json';
        daily.key = key;
        daily.values.length = 0;
    }
    daily.values.push(vot);
}


function readTemp(){
    let timeStart = new Date().getTime();
    let fileContent = fs.readFileSync(deviceFile).toString();
    if (!fileContent) {
        console.log('Read failed at ' + new Date().toString());
        return;
    }
    let temp = parseInt(fileContent.match(/t=(\d+)/)[1]);
    if (temp <= 0) {
        console.log('Parsed failed at ' + new Date().toString());
        return;
    }
    updated = new Date().getTime()
    current = temp;
    addValue(temp);
    console.log('Read at ' + new Date().toString() + ', time cost: ' + (updated - timeStart) + 'ms');
    console.log('Temp: ' + temp + ', values length ' + values.length + ', daily length' + daily.values.length);
    setTimeout(readTemp, config.READ_INTERVAL);
}

setTimeout(backup, config.backupInterval);
readTemp();

process.on('SIGINT', (code) => {
    fs.writeFileSync(
        config.backupFile,
        JSON.stringify(valuesMap)
    );
    console.log('Process exit.')
    process.exit('SIGINT');
});