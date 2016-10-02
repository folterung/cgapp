const {app, BrowserWindow, dialog} = require('electron');
const {CGApp} = require('./home');
const jsonfile = require('jsonfile');
const jsontoxml = require('jsontoxml');
const xlsx = require('xlsx');
const Excel = require('exceljs');

const DOMAIN = 'domain';
const OBJECTIVE = 'objective';
const SECTION = 'section';
const SOURCE = 'source';
const REASON = 'reason';
const QUESTION = 'question';
const CUSTOMER_RESPONSE = 'customer_response';
const AUDITOR_NOTES = 'auditor_notes';
const ANSWER = 'answer';
const POLICY_DEFINED = 'policy_defined';
const CONTROL_IMPLEMENTED = 'control_implemented';
const CONTROL_AUTOMATED = 'control_automated_or_technically_enforced';
const CONTROL_REPORTED = 'control_reported_to_business';
const STATUS = 'status';

let fs = require('fs');
let ipc = require('electron').ipcMain;

ipc.on('bodyLoaded', function(event) {
  let data = jsonfile.readFileSync('data.json');

  event.sender.send('bodyLoadedReply', data);
});

ipc.on('open', function(event) {
  let xlsxRegex, filename, jsonRegex;

  filename = dialog.showOpenDialog({
    title: 'Open file',
    properties: ['openFile']
  });

  jsonRegex = /\.json$/;
  xlsxRegex = /\.xlsx$/;

  if(jsonRegex.test(filename[0])) {
    _loadJSON(filename[0], _callback);
  } else if (xlsxRegex.test(filename[0])) {
    _loadXLSX(filename[0], _callback);
  } else {
    throw new Error('No parser for the selected file type.');
  }

  function _callback(data) {
    event.sender.send('done-opening', data, xlsxRegex.test(filename[0]));
  }

  function _loadJSON(filename, cb) {
    cb(jsonfile.readFileSync(filename));
  }

  function _loadXLSX(filename, cb) {
    var workbook = xlsx.readFile(filename);
    var firstSheetName = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[firstSheetName];

    if(worksheet) {
      cb(xlsx.utils.make_json(worksheet));
    } else {
      throw new Error('Unable to find matching worksheet name... exiting.');
    }
  }
});

ipc.on('export-xml', function(event, data) {
  let allSaveData, filename, i, outputXML, s, size, xml;

  filename = dialog.showSaveDialog({
    title: 'Export XML'
  });

  if(!filename) { return; }

  allSaveData = [];
  size = data.length;

  for(i = 0; i < size; i++) {
    let s = {
      name: 'control',
      children: []
    };

    s.children.push(data[i]);
    allSaveData.push(s);
  }

  xml = {
    'data': allSaveData
  };

  outputXML = jsontoxml(xml, {
    escape: true
  });

  if(!/\.xml$/.test(filename)) {
    filename += '.xml';
  }

  fs.writeFile(filename, outputXML, function(err) {
    if(err === null) {
      event.sender.send('success-message', 'Successfully saved changes.');
    } else {
      event.sender.send('fail-message', 'Something went wrong trying to save the changes.');
    }
  });
});

ipc.on('export-json', function(event, data) {
  let allSaveData, filename, i, outputXML, s, size, xml;

  filename = dialog.showSaveDialog({
    title: 'Export Report'
  });

  if(!filename) { return; }

  if(!/\.json$/.test(filename)) {
    filename += '.json';
  }

  jsonfile.writeFile(filename, data, function(err) {
    if(err === null) {
      event.sender.send('success-message', 'Successfully saved changes.');
    } else {
      event.sender.send('fail-message', 'Something went wrong trying to save the changes.');
    }
  });
});

ipc.on('export-excel', function(event, rows) {
  var filename, sheet,
  workbook = new Excel.Workbook();

  filename = dialog.showSaveDialog({
    title: 'Export Report'
  });

  if(!filename) { return; }

  if(!/\.xlsx$/.test(filename)) {
    filename += '.xlsx';
  }

  sheet = workbook.addWorksheet('Dataset');
  
  sheet.columns = [
    { header: DOMAIN, key: DOMAIN, width: 10 },
    { header: OBJECTIVE, key: OBJECTIVE, width: 10 },
    { header: SECTION, key: SECTION, width: 10 },
    { header: SOURCE, key: SOURCE, width: 10 },
    { header: REASON, key: REASON, width: 10 },
    { header: QUESTION, key: QUESTION, width: 10 },
    { header: CUSTOMER_RESPONSE, key: CUSTOMER_RESPONSE, width: 10 },
    { header: AUDITOR_NOTES, key: AUDITOR_NOTES, width: 10 },
    { header: ANSWER, key: ANSWER, width: 10 },
    { header: POLICY_DEFINED, key: POLICY_DEFINED, width: 10 },
    { header: CONTROL_IMPLEMENTED, key: CONTROL_IMPLEMENTED, width: 10 },
    { header: CONTROL_AUTOMATED, key: CONTROL_AUTOMATED, width: 10 },
    { header: CONTROL_REPORTED, key: CONTROL_REPORTED, width: 10 },
    { header: STATUS, key: STATUS, width: 10 }
  ];

  rows.forEach(function loopRows(row) {
      sheet.addRow({
        'domain': row[DOMAIN],
        'objective': row[OBJECTIVE],
        'section': row[SECTION],
        'source': row[SOURCE],
        'reason': row[REASON],
        'question': row[QUESTION],
        'customer response': row[CUSTOMER_RESPONSE],
        'auditor notes': row[AUDITOR_NOTES],
        'answer': typeof row[ANSWER] !== 'undefined' ? row[ANSWER].id : null,
        'policy defined': typeof row[POLICY_DEFINED] !== 'undefined' ? row[POLICY_DEFINED].id : null,
        'control implemented': typeof row[CONTROL_IMPLEMENTED] !== 'undefined' ? row[CONTROL_IMPLEMENTED].id : null,
        'control automated or technically enforced': typeof row[CONTROL_AUTOMATED] !== 'undefined' ? row[CONTROL_AUTOMATED].id : null,
        'control reported to business': typeof row[CONTROL_REPORTED] !== 'undefined' ? row[CONTROL_REPORTED].id : null,
        'status': typeof row[STATUS] !== 'undefined' ? row[STATUS].id : null 
      });
  });

  workbook.xlsx.writeFile(filename).then(function() {
    event.sender.send('success-message', 'Successfully saved changes.');
  });
});

ipc.on('save', function(event, rows) {
  jsonfile.writeFile('data.json', rows, function(err) {
    if(err === null) {
      event.sender.send('success-message', 'Successfully saved changes.');
    } else {
      event.sender.send('fail-message', 'Something went wrong trying to save the changes.');
    }
  });
});

ipc.on('exit', function() {
  app.quit();
});

new CGApp(app, BrowserWindow);
