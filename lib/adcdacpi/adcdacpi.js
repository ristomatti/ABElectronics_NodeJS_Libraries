﻿// ================================================
// ABElectronics ADC-DAC Pi Zero Analogue to Digital / Digital to Analogue Converter
// https://www.abelectronics.co.uk/p/74/ADC-DAC-Pi-Zero-Raspberry-Pi-ADC-and-DAC-expansion-board
// 
// 
// Version 1.0 Created 06/07/2016
// Version 1.1 Updated 19/06/2017 - changed library to use rpio and optimised code for speed.
// ================================================
// 
// Based on the Microchip MCP3202 and MCP4822
// 
// Requires rpio to be installed, install with: npm install rpio
//
// ================================================
//

const rpio = require('rpio');

const ADCDAC = (function () {

    // variables
    let adc;
    let dac;
    let adcRefVoltage = 3.3;  //reference voltage for the ADC chip.
    let maxDacVoltage = 2.048; // maximum voltage for the DAC output
    let dacGain = 1;
    let adctx = new Buffer([0x01, 0xC0, 0x00]);
    let adcrx = new Buffer([0, 0, 0]);
    let dactx = new Buffer([0x00, 0x00]);
    let dacrx = new Buffer(2);
    let out;
    

    function ADCDAC() {
        /// <summary>
        /// Create ADCDAC object and connect to the SPI bus
        /// </summary>

        rpio.spiBegin();
        rpio.spiSetCSPolarity(0, rpio.LOW);
        rpio.spiSetDataMode(0);

    }

    

    ADCDAC.prototype.readADCRaw = function (channel, mode) {
        /// <summary>
        /// Returns the raw value from the selected ADC channel
        /// </summary>
        /// <param name="channel" type="Number">1 or 2</param>
        /// <param name="mode" type="Number">Mode: 0 = Single Ended or 1 = Differential</param>
        /// When in differential mode setting channel to 1 will make IN1 = IN+ and IN2 = IN-
	    /// When in differential mode setting channel to 2 will make IN1 = IN- and IN2 = IN+
        /// <returns type="Number">Returns 12 bit value between 0 and 4096</returns>
	         
        if (channel == 1) {
            if (mode == 0) {
                adctx[1] = 0x80;
            } else if (mode == 1) {
                adctx[1] = 0x00;
            } else {
                throw new Error("Channel 1 Mode Argument Out Of Range");
            }
        } else if (channel == 2) {
            if (mode == 0) {
                adctx[1] = 0xC0;
            } else if (mode == 1) {
                adctx[1] = 0x40;
            } else {
                throw new Error("Channel 2 Mode Argument Out Of Range");
            }
        } else {
            throw new Error("Channel Argument Out Of Range");
        }

        rpio.spiChipSelect(0);			/* Use CE0 */
        rpio.spiSetClockDivider(140);
        rpio.spiTransfer(adctx, adcrx, 3);
        out = ((adcrx[1] & 0x0F) << 8) + adcrx[2];

        return out;
    }

    ADCDAC.prototype.readADCVoltage = function (channel, mode) {

        /// <summary>
        /// Returns the voltage from the selected ADC channel
        /// </summary>
        /// <param name="channel" type="Number">1 or 2</param>
        /// <param name="mode" type="Number">Mode: 0 = Single Ended or 1 = Differential</param>
        /// When in differential mode setting channel to 1 will make IN1 = IN+ and IN2 = IN-
	    /// When in differential mode setting channel to 2 will make IN1 = IN- and IN2 = IN+
        /// <returns type="Number">Returns voltage between 0 and vref</returns>
        let raw = this.readADCRaw(channel, mode);

        let voltage = (adcRefVoltage / 4096) * raw;
        return voltage;
    }

    ADCDAC.prototype.setADCRefVoltage = function (voltage) {

        /// <summary>
        /// Sets the reference voltage for the ADC
        /// </summary>
        /// <param name="voltage" type="Number">This should be the voltage as measured on the Raspberry Pi 3.3V power rail.</param>
       
        adcRefVoltage = voltage;
    }

    ADCDAC.prototype.setDACVoltage = function (channel, voltage) {
        /// <summary>
        /// Set the DAC voltage.
        /// </summary>
        /// <param name="channel">1 or 2</param>
        /// <param name="voltage">voltage can be between 0 and 2.047 volts when gain is 1 or 0 and 3.3V when gain is 2</param>

        if (channel < 1 || channel > 2) {
            throw new Error("Channel Out Of Range");
        }

        if (voltage < 0 || voltage > maxDacVoltage) {
            throw new Error("Voltage Out Of Range");
        }

        let rawval = ((voltage / 2.048) * 4096) / dacGain; // convert the voltage into a raw value
        this.setDACRaw(channel, rawval); // set the raw value

    }

    ADCDAC.prototype.setDACRaw = function (channel, value) {
        /// <summary>
        /// Set the raw value for the selected dac channel
        /// </summary>
        /// <param name="channel">1 to 2</param>
        /// <param name="value">0 to 4095</param>

        if (channel < 1 || channel > 2) {
            throw new Error("Channel Out Of Range");
        }

        if (value < 0 || value > 4095) {
            throw new Error("Value Out Of Range");
        }

        dactx[1] = (value & 0xff);
        dactx[0] = (((value >> 8) & 0xff) | (channel - 1) << 7 | 0x1 << 5 | 1 << 4);

        if (dacGain == 2) {
            dactx[0] = (dactx[0] &= ~(1 << 5));
        }

        rpio.spiChipSelect(1);			/* Use CE1 */
        rpio.spiSetClockDivider(14);
        rpio.spiTransfer(dactx, dacrx, 2);
    }

    ADCDAC.prototype.setDACGain = function (gain) {
        /// <summary>
        /// Set the gain for the DAC.  This is used to set the output based on the reference voltage of 2.048V.
        /// When the gain is set to 2 the maximum voltage will be approximately 3.3V.
        /// </summary>
        /// <param name="gain">1 or 2</param>
        /// <returns type=""></returns>
        if (gain < 1 || gain > 2) {
            throw new Error("Gain Out Of Range");
        }

        if (gain == 1) {
            dacGain = 1;
            maxDacVoltage = 2.048;
        }
        if (gain == 2) {
            dacGain = 2;
            maxDacVoltage = 3.3;
        }
    }

    ADCDAC.prototype.closeSPI = function () {
        /// <summary>
        /// Close the SPI bus
        /// </summary>
        adc.close();
        dac.close();
    }


    return ADCDAC;

})();

module.exports = ADCDAC;
