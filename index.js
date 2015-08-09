var async = require('async')
var find = require('array-find')
var fs = require('fs')

if (process.argv.length !== 3) {
  console.error('Usage: thinkpad-fan-daemon <config.json>')
  process.exit(1) }

var configuration = require(fs.realpathSync(process.argv[2]))

var lastLevel = null

function setFanLevel(level, callback) {
  var stream
  var data = (
    'level ' +
    ( typeof level === 'string' ?
      level : level.toString() ) )
  try {
    stream = fs.createWriteStream(configuration.fan) }
  catch (error) {
    callback(error)
    return }
  stream.end(data, 'utf8', function() {
    if (lastLevel !== level) {
      console.log('Set fan to "' + data + '"') }
    lastLevel = level
    callback() }) }

function readSensor(path, callback) {
  fs.readFile(path, function(error, data) {
    if (error) {
      callback(error) }
    else {
      callback(null, parseInt(data) / 1000) } }) }

function adjustFan(maxTemp, callback) {
  var threshold = find(configuration.thresholds, function(threshold) {
    return maxTemp >= threshold.min && maxTemp <= threshold.max })
  if (threshold) {
    var level = threshold.level
    if (level !== lastLevel) {
      console.log('Setting fan to level ' + level) }
    setFanLevel(level, callback) }
  else {
    console.error('No threshold for temperature ' + maxTemp)
    setImmediate(function() {
      callback() }) } }

function onInterval() {
  async.map(
    configuration.sensors,
    readSensor,
    function(error, values) {
      if (error) {
        console.error(error) }
      else {
        adjustFan(
          Math.ceil.apply(Math, values),
          function(error) {
            if (error) {
              console.error(error)
              console.error(error.stack) } }) } }) }

var interval = setInterval(onInterval, configuration.interval || 3000)

function cleanupAndExit() {
  clearInterval(interval)
  setFanLevel('auto', function() {
    process.exit(0) }) }

process
  .on('SIGINT', cleanupAndExit)
  .on('SIGHUP', cleanupAndExit)
  .on('SIGQUIT', cleanupAndExit)
  .on('SIGTERM', cleanupAndExit)
