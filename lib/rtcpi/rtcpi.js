﻿//
// ================================================
// ABElectronics RTC Pi real-time clock
// For use with the RTC Pi, RTC Pi Plus and RTC Pi Zero
// Version 1.0 Created 06/07/2016
// Requires rpio to be installed, install with: npm install rpio
// ================================================
//

// Define registers values from datasheet
const SECONDS = 0x00
const MINUTES = 0x01
const HOURS = 0x02
const DAYOFWEEK = 0x03
const DAY = 0x04
const MONTH = 0x05
const YEAR = 0x06
const CONTROL = 0x07

// variables
let rtcAddress = 0x68  // I2C address
// initial configuration - square wave and output disabled, frequency set
// to 32.768KHz.
let config = 0x03
// the DS1307 does not store the current century so that has to be added on
// manually.
let century = 2000

const rpio = require('rpio');

const RTCPi = (function () {

    function RTCPi() {
        /// <summary>
        //  Initialise the RTC Pi I2C connection and set the default configuration to the control register
        /// </summary>
        rpio.i2cBegin();
        rpio.i2cSetSlaveAddress(rtcAddress);
        i2cWriteByte(CONTROL, config);
    }
    // local methods

    function i2cWriteByte(register, val) {
        /// <summary>
        /// Write a single byte to the I2C bus.
        /// </summary>
        /// <param name="register">Register to write to</param>
        /// <param name="val">Value to be written</param>
        let txbuf = new Buffer([register, val]);
        rpio.i2cSetSlaveAddress(rtcAddress);
        rpio.i2cWrite(txbuf);
    }


    function updateByte(oldByte, bit, value) {
        /// <summary>
        /// Internal function for updating a single bit within a variable
        /// </summary>
        /// <param name="oldByte" type="Number">Variable to be updated</param>
        /// <param name="bit" type="Number">The location of the bit to be changed</param>
        /// <param name="value" type="Boolean">The new value for the bit.  true or false</param>
        let newByte = 0;
        if (value == false) {
            newByte = oldByte & ~(1 << bit);
        } else {

            newByte = oldByte | 1 << bit;
        }
        return (newByte);
    }


    function bcdToDec(val) {
        /// <summary>
        /// Internal function for converting BCD formatted number to decimal.
        /// </summary>
        /// <param name="x">Number to convert</param>
        /// <returns type="Number">Decimal formatted number</returns>
        return val - 6 * (val >> 4);
    }

    function decToBcd(val) {
        /// <summary>
        /// Internal function for converting decimal to BCD formatted number
        /// </summary>
        /// <param name="val">Number to convert</param>
        /// <returns type="">BCD formatted number</returns>
        return (((val / 10) << 4) | (val % 10));
    }

    function getCentury(val) {
        /// <summary>
        /// Internal function for calculating the current century
        /// </summary>
        /// <param name="val">Year</param>
        if (val.length > 2) {
            let y = val[0] + val[1];
            century = parseInt(y) * 100;
        }
    }



    // public methods
    RTCPi.prototype.setDate = function (date) {
        /// <summary>
        /// Set the date and time on the RTC
        /// </summary>
        /// <param name="date" type="Date">Use a javascript Date object</param>

        getCentury(date.getFullYear())
        i2cWriteByte(SECONDS, decToBcd(date.getSeconds()));
        i2cWriteByte(MINUTES, decToBcd(date.getMinutes()));
        i2cWriteByte(HOURS, decToBcd(date.getHours()));
        i2cWriteByte(DAYOFWEEK, decToBcd(date.getDay()));
        i2cWriteByte(DAY, decToBcd(date.getDate()));
        i2cWriteByte(MONTH, decToBcd(date.getMonth() - 1));
        i2cWriteByte(YEAR, decToBcd(date.getFullYear() - century));
       
    }

    RTCPi.prototype.readDate = function () {
        /// <summary>
        /// Read the date and time from the RTC
        /// </summary>
        /// <returns type="Date">Returns the date as a javascript Date object</returns>

        let txbuf = new Buffer(1);
        let rxbuf = new Buffer(7);
        txbuf[0] = 0;

        rpio.i2cWrite(txbuf);
        rpio.i2cRead(rxbuf, 7);

        let d = new Date(bcdToDec(rxbuf[6]) + century, bcdToDec(rxbuf[5]), bcdToDec(rxbuf[4]), bcdToDec(rxbuf[2]), bcdToDec(rxbuf[1]), bcdToDec(rxbuf[0]),0);

        return d;
    }

    RTCPi.prototype.enableOutput = function () {
        /// <summary>
        /// Enable the output pin
        /// </summary>

        config = updateByte(config, 7, 1);
        config = updateByte(config, 4, 1);
        i2cWriteByte(CONTROL, config);
    }

    RTCPi.prototype.disableOutput = function () {
        /// <summary>
        /// Disable the output pin
        /// </summary>

        config = updateByte(config, 7, 0);
        config = updateByte(config, 4, 0);
        i2cWriteByte(CONTROL, config);
    }

    RTCPi.prototype.setFrequency = function (frequency) {
        /// <summary>
        /// Set the frequency of the output pin square- wave
        /// </summary>
        /// <param name="frequency" type="Number">1 = 1Hz, 2 = 4.096KHz, 3 = 8.192KHz, 4 = 32.768KHz</param>

        switch (frequency) {
            case 1:
                config = updateByte(config, 0, 0);
                config = updateByte(config, 1, 0);
                break;
            case 2:
                config = updateByte(config, 0, 1);
                config = updateByte(config, 1, 0);
                break;
            case 3:
                config = updateByte(config, 0, 0);
                config = updateByte(config, 1, 1);
                break;
            case 4:
                config = updateByte(config, 0, 1);
                config = updateByte(config, 1, 1);
                break;
            default:
                throw new Error("Argument Out Of Range");
        }
        i2cWriteByte(CONTROL, config);
    }

    RTCPi.prototype.writeMemory = function (address, valuearray) {
        /// <summary>
        /// Write to the memory on the DS1307
        /// The DS1307 contains 56 - Byte, battery - backed RAM with Unlimited Writes
        /// </summary>
        /// <param name="address" type="Number">0x08 to 0x3F</param>
        /// <param name="valuearray" type="Uint8Array">byte array containing data to be written to memory</param>
        if (address + valuearray.length <= 0x3F) {
            if ((address >= 0x08) && (address <= 0x3F)) {
                // create a new array with the address at the start of the array
                let data = new Uint8Array(valuearray.length + 1);
                data[0] = address;
                // copy the data from the valuearray into data
                for (let a = 0; a < data.length; a++) {
                    data[a + 1] = valuearray[a];
                }

                // write the array to the RTC memory
                rpio.i2cSetSlaveAddress(rtcAddress);
                rpio.i2cWrite(data);
                return true;
            }
            else {
                throw new Error("Memory address outside of range: 0x08 to 0x3F");
            }
        }
        else {
            throw new Error("Array is larger than the available memory space");
        }

    }

    RTCPi.prototype.readMemory = function (address, length) {
        /// <summary>
        /// Read from the memory on the DS1307
        /// The DS1307 contains 56 - Byte, battery - backed RAM with Unlimited Writes
        /// </summary>
        /// <param name="address" type="Number">0x08 to 0x3F</param>
        /// <param name="length" type="Number">Up to 32 bytes.  length can not exceed the avaiable address space.</param>
        /// <returns type="Uint8Array">Returns an array of the data read from memory</returns>
        if (address >= 0x08 && address <= 0x3F) {
            if (address <= (0x3F - length)) {
                let txbuf = new Uint8Array(1);
                let rxbuf = new Uint8Array(length);
                txbuf[0] = address;

                rpio.i2cWrite(txbuf);
                rpio.i2cRead(rxbuf, length);

                return rxbuf;
            }
            else {
                throw new Error("Memory overflow error: address + length exceeds 0x3F");
            }
        }
        else {
            throw new Error("Memory address outside of range: 0x08 to 0x3F");
        }
     }

    return RTCPi;

})();

module.exports = RTCPi;
