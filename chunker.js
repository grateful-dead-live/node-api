const request = require('request');
const wav = require('wav');
const lame = require('lame');
//const AV = require('av');
//require('mp3.js');
const Speaker = require('speaker');

exports.pipeMp3Chunk = function(filepath, fromSecond, toSecond, response) {
  const writer = new wav.Writer();
  writer.pipe(response);

  const decoder = new lame.Decoder();
  const input = request(filepath);
  input.pipe(decoder);

  let format, fromSample, toSample, totalSize;
  var numSamplesStreamed = 0;
  var numSamplesAccumulated = 0;
  var samples = []; // array that holds all the chunks

  decoder.on('format', f => {
    //console.log("format", f);
    format = f;
    const factor = f.sampleRate*f.channels*(f.bitDepth/8);
    fromSample = Math.round(fromSecond*factor);
    toSample = Math.round(toSecond*factor);
    totalSize = toSample-fromSample;
  });
  decoder.on('data', chunk => {
    if (numSamplesAccumulated < totalSize) {
      const chunkSize = chunk.length;
      const start = fromSample-numSamplesStreamed;
      if (start < chunk.length) {
        if (0 < start) {
          chunk = chunk.slice(start);
        }
        const chunksToGo = totalSize-numSamplesAccumulated;
        if (chunksToGo < chunk.length) {
          chunk = chunk.slice(0, chunksToGo);
        }
        writer.write(chunk);
        numSamplesAccumulated += chunk.length;
      }
      numSamplesStreamed += chunkSize;
    } else {
      writer.end();
      decoder.end();
      //console.log("DONE")
    }
  });
  decoder.on('error', function() {
    writer.end();
  })
  decoder.on('end', function() {
    console.log("piped", fromSecond, "to", toSecond, "of", filepath)
    writer.end();
  });
}

exports.pipeWavChunk = function(filepath, fromSecond, toSecond, response) {
  var writer = new wav.Writer();
  writer.pipe(response);
  var reader = new wav.Reader();

  var format, fromSample, toSample, totalSize;
  var numSamplesStreamed = 0;
  var numSamplesAccumulated = 0;
  var samples = []; // array that holds all the chunks

  reader.on('format', function (f) {
    format = f;
    var factor = f.sampleRate*f.channels*(f.bitDepth/8);
    fromSample = Math.round(fromSecond*factor);
    toSample = Math.round(toSecond*factor);
    totalSize = toSample-fromSample;
  });
  reader.on('data', function (chunk) {
    if (numSamplesAccumulated < totalSize) {
      var chunkSize = chunk.length;
      var start = fromSample-numSamplesStreamed;
      if (start < chunk.length) {
        if (0 < start) {
          chunk = chunk.slice(start);
        }
        var chunksToGo = totalSize-numSamplesAccumulated;
        if (chunksToGo < chunk.length) {
          chunk = chunk.slice(0, chunksToGo);
        }
        writer.write(chunk);
        numSamplesAccumulated += chunk.length;
      }
      numSamplesStreamed += chunkSize;
    }
  });
  reader.on('error', function() {
    console.log("ERROR")
    writer.end();
  })
  reader.on('end', function() {
    console.log("END")
    writer.end();
  });

  request(filepath).pipe(reader);
}