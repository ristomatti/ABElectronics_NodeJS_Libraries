require('strict-mode')(function() {

  const exp = require('./lib/expanderpi/expanderpi');

  const lib = {
    ADCDAC: require('./lib/adcdacpi/adcdacpi'),
    ADCDifferentialPi: require('./lib/adcdifferentialpi/adcdifferentialpi'),
    ADCPi: require('./lib/adcpi/adcpi'),
    ExpanderPiADC: exp.ExpanderPiADC,
    ExpanderPiDAC: exp.ExpanderPiDAC,
    ExpanderPiIO: exp.ExpanderPiIO,
    ExpanderPiRTC: exp.ExpanderPiRTC,
    IoPi: require('./lib/iopi/iopi'),
    RTCPi: require('./lib/rtcpi/rtcpi'),
    ServoPi: require('./lib/servopi/servopi')
  };

  module.exports = lib;

});
