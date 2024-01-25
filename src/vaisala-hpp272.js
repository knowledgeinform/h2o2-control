// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED 'AS IS.' JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ad = require('./abstract-driver.js')
const vaisalaM211972ENF = require('./vaisala-M211972EN-F.js')
const crc16 = require('./lib/utils/crc16.js')
const ui = require('./ui.js')
var ModbusRTU = require('./lib/modbus-rtu.js')

// class CSWatlowSettings {
//   constructor({obj = vaisalaM211972ENF.obj}) {
//     this.services = []
//   }
// }

/**
  Either generate buttons or generate pages
*/

class VaisalaHPP272C {
  constructor({router, testFlag = true, rtuAddress = 240}) {
    this.rtuAddress = rtuAddress
    this.mb = new ModbusRTU()
    this.mb.setID(this.rtuAddress)
    this.index = 0
    this.val = 0
    this.router = router
    this.testFlag = testFlag
    this.serialControl = new ad.SerialControl({router: router, testFlag: testFlag, timeout: 300})

    // Object.defineProperty(this, 'setPoint', {
    //   enumerable: true,
    //   value: [
    //     { get: () => {return this.getSP(0)}, set: (val) => {return this.setSP(0, val)} },
    //     { get: () => {return this.getSP(1)}, set: (val) => {return this.setSP(1, val)} },
    //     { get: () => {return this.getSP(2)}, set: (val) => {return this.setSP(2, val)} },
    //     { get: () => {return this.getSP(3)}, set: (val) => {return this.setSP(3, val)} },
    //   ]
    // })
    this.processValue = [new ad.DataPoint({}), new ad.DataPoint({}), new ad.DataPoint({})]

    this.obj = vaisalaM211972ENF.obj
    this.Settings = []
    var pages = this.settingsObj({obj: this.obj})
    this.Settings = pages
    // pages.forEach((item, i) => {
    //   var menu = this.settingsObj({obj: this.obj[item]})
    //   var temp = []
    //   this.Settings.push({item: []})
    //   menu.forEach((subitem, subi) => {
    //     // console.log('Menu subitem')
    //     // console.log(item)
    //     this.Settings[i].push(subitem, this.settingsObj({obj: this.obj[item][subitem]}))
    //   })
    //
    // })
    console.log('Settings')
    console.log(this.Settings)
  }

  getLength(obj) {
    if (obj.Type[0] === 'float') {
      // for a 32-bit, signed float
      return 2
    } else if (obj.Type[0] === 'int') {
      // for a 32-bit, signed int
      return 2
    } else if (obj.Type[0] === 'uint') {
      // this is really a short int (16-bits)
      return 1
    } else if (obj.Type[0] === 'string') {
      // probably need a better method for strings
      return 4
    } else {
      return 1
    }
  }

  getH2O2Concentration() {
    var obj = this.obj.Measurement['H2O2 Vapor Concentration']
    this.getDatapoint(obj, this.processValue[0], this.convertFloat).catch(error => {
      console.log('Get H2O2 Concentration error')
      console.log(error)
    })
  }

  getHumditiy() {
    var obj = this.obj.Measurement['Relative humidity']
    this.getDatapoint(obj, this.processValue[1], this.convertFloat).catch(error => {
      console.log('Get Humidity error')
      console.log(error)
    })
  }

  getTemperatureProbe() {
    var obj = this.obj.Measurement['Temperature']
    this.getDatapoint(obj, this.processValue[2], this.convertFloat).catch(error => {
      console.log('Get Temperature Probe error')
      console.log(error)
    })
  }

  async getDatapoint(obj, datapoint, conversionFunc) {
    // example obj
    // var obj = this.obj.Measurement['Temperature']
    // example conversionFunc = this.convertFloat()
    var command = this.basicCommandString({address: obj.Modbus[0], length: this.getLength(obj)})
    // command = 'getPV'
    var time
    var resp
    resp = await this.serialControl.serial(command)
    time = Date.now()
    // time = Date.now()
    console.log(resp)
    // console.log(this.convertUint(resp[0]))
    var val = conversionFunc(resp[0])
    console.log(val)
    datapoint.value = val
    datapoint.units = obj.Units
    datapoint.time = time
  }

  get PV0() {
    // a calibrated value
    this.getH2O2Concentration()
    return this.processValue[0]
  }

  get PV1() {
    // a calibrated value
    this.getHumditiy()
    return this.processValue[1]
  }

  get PV2() {
    // from the probe
    this.getTemperatureProbe()
    return this.processValue[2]
  }

  commandString({loc, index, obj, val}) {
    var error = false
    var register
    var length
    var convert
    var rw = false // false for reading, true for writing
    var array
    // first check valid object path/reference
    loc.forEach((item, i) => {
      var i2
      var subobj = obj
      for (i2 = 0; i2 < i; i2++) {
        // console.log(loc[i2])

        subobj = subobj[loc[i2]]
      }
      // console.log(item)
      // console.log(subobj)

      if (!Object.prototype.hasOwnProperty.call(subobj, item)) {
        error = true
        console.log('INVALID OBJECT REFERENCE')
        console.log('Object:')
        console.log(subobj)
        console.log('Reference:')
        console.log(item)
      }
      if (i + 1 === loc.length && !error) {
        if (!Object.prototype.hasOwnProperty.call(subobj[item], 'Modbus')) {
          error = true
          console.log('FINAL REFERENCE DOES NOT HAVE MODBUS PROPERTY')
        }
        if (index >= subobj[item].Modbus.length) {
          error = true
          console.log('INVALID INDEX FOR Modbus')
          console.log('Modbus array length')
          console.log(subobj[item].Modbus.length)
          console.log('Requested index')
          console.log(index)
        } else {
          // console.log(subobj[item])
          // console.log(subobj[item].Modbus)
          // console.log(index)
          // console.log(subobj[item].Modbus[index])
          register = subobj[item].Modbus[index] - 1 // must subtract 1 per the manual :(
          if ((subobj[item].Type[1] === 'W') && val !== undefined) {
            rw = true
          } else {
            rw = false
          }
          if (subobj[item].Type[0] === 'uint') {
            length = 1
            convert = this.convertUint
            if (rw) {
              array = Buffer.allocUnsafe(2)
              array.writeUInt16BE(val)
            }
          } else if (subobj[item].Type[0] === 'float') {
            length = 2
            convert = this.convertFloat
            if (rw) {
              array = Buffer.allocUnsafe(4)
              array.writeFloatLE(val)
              array.swap16()
            }
          }
        }
      }
    })

    if (error) {
      return ''
    }
    if (this.testFlag) console.log('register: ' + register)
    if (this.testFlag) console.log('length: ' + length)

    var ret
    if (rw) {
      // console.log('Writing')
      ret = this.mb.writeFC16(this.mb._unitID, register, array)
    } else {
      // console.log('Reading')
      ret = this.mb.readHoldingRegisters(this.mb._unitID, register, length)
    }
    if (this.testFlag) console.log(ret)
    return {buf: ret, convert: convert}
  }

  convertUint(b) {
    return b.readInt16BE(3)
  }

  convertFloat(b) {
    console.log('Converting')
    console.log(b)
    var tmp = b.slice(3, -2)
    tmp = tmp.swap16()
    return tmp.readFloatLE(0)
  }

  basicCommandString({address, length = 1, value}) {
    if (address === undefined) {
      console.log('UNDEFINED ADDRESS FOR BASIC COMMAND')
      return ''
    }

    address = address - 1 // must subtract 1 per the manual :(
    // console.log('address')
    // console.log(address)
    // console.log('length')
    // console.log(length)
    var ret
    if (value === undefined) {
      // read
      ret = this.mb.readHoldingRegisters(this.mb._unitID, address, length)
    } else {
      // write
      ret = this.mb.writeHoldingRegisters(this.mb._unitID, address, length, value)
    }

    if (this.testFlag) {
      console.log('ret')
      console.log(ret)
    }
    return ret
  }

  findString(uint, range) {
    var ret
    Object.entries(range).forEach(([key, value]) => {
      if (uint === value) {
        ret = key
      }
    })
    return ret
  }

  findUint(str, range) {
    var ret
    Object.entries(range).forEach(([key, value]) => {
      if (str === key) {
        ret = value
      }
    })
    return ret
  }

  settingsObj({obj}) {
    var services = []
    var page = false
    var pageObj
    Object.entries(obj).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(value, 'Type')) {
        if (!Object.prototype.hasOwnProperty.call(pageObj, 'hidden')) {
          Object.defineProperty(pageObj, 'hidden', {
            enumerable: false,
            value: {},
          })
        }
        // e.g. 'Analog Input Value'
        // build a page
        page = true
        value.Modbus.forEach((item, i) => {
          pageObj.hidden[key + ' ' + i.toString()] = new ad.DataPoint({})
          Object.defineProperty(pageObj, key + ' ' + i.toString(), {
            enumerable: true,
            get: () => {
              var ret
              var val
              var io
              // var register = item
              if (value.Type[1] === 'R') {
                // input (read-only)
                io = 'input'
              } else if (value.Type[1] === 'W') {
                // output (read/write)
                io = 'output'
              } else {
                console.log('UNKNOWN TYPE: R/W')
                console.log(value)
              }

              if (value.Type[0] === 'float') {
                this.readFloatProperty(key + ' ' + i.toString(), item, pageObj)
                ret = new ui.ShowUser({value: pageObj.hidden[key + ' ' + i.toString()].value, type: [io, 'datapoint']})
              } else if (value.Type[0] === 'uint') {
                this.readUintProperty(key + ' ' + i.toString(), item, pageObj, value.Range)
                if (typeof val === 'number') {
                  // if val is NOT a number, I assume there is a list of strings that map the uints
                  // a uint is nearly *always* a list, but this is for diagnostic in case
                  // someone doesn't enter the object correctly
                  ret = new ui.ShowUser({value: pageObj.hidden[key + ' ' + i.toString()].value, type: [io, 'number']})
                } else {
                  ret = new ui.ShowUser({value: pageObj.hidden[key + ' ' + i.toString()].value, type: [io, 'list']})
                  // add proper list object
                }
              } else {
                console.log('UNKNOWN TYPE: float/uint')
                console.log(value)
              }

              return ret
            },
            set: val => {
              // var io
              // var register = item
              if (value.Type[1] === 'R') {
                // input (read-only)
                // io = 'input'
                // therefore, nothing to set
                return
              } else if (value.Type[1] === 'W') {
                // output (read/write)
                // io = 'output'
              } else {
                console.log('UNKNOWN TYPE: R/W')
                console.log(value)
              }

              if (value.Type[0] === 'float') {
                this.writeFloatProperty(key + ' ' + i.toString(), item, pageObj, val)
              } else if (value.Type[0] === 'uint') {
                this.writeUintProperty(key + ' ' + i.toString(), item, pageObj, value.Range, val)
              } else {
                console.log('UNKNOWN TYPE: float/uint')
                console.log(value)
              }
              return
            },
          })
        })

        Object.entries(value).forEach(([subkey, subvalue]) => {
          if (subkey !== 'Modbus' && subkey !== 'Type') {
            if (subkey === 'Range' && Object.keys(subvalue).length === 1) {
              Object.defineProperty(pageObj, subkey, {
                enumerable: true,
                get: () => {
                  return new ui.ShowUser({value: subvalue})
                },
                // set: val => {
                //
                // },
              })
            }
          }
        })
      } else {
        // build array for buttons
        services.push(key)
      }
    })

    if (page) {
      return pageObj
    } else {
      return services
    }
  }

  async readFloatProperty(hiddenKey, mbAddr, obj) {
    // console.log(i)
    var command = this.basicCommandString({address: mbAddr, length: 2})
    // command = 'getPV'
    var time
    var resp
    resp = await this.serialControl.serial(command)
    time = Date.now()
    // console.log(this.resp)
    if (resp !== undefined) {
      obj.hidden[hiddenKey].value = this.convertFloat(resp[0])
      obj.hidden[hiddenKey].time = time
    }
  }

  async readUintProperty(hiddenKey, mbAddr, obj, range) {
    // console.log(i)
    var command = this.basicCommandString({address: mbAddr, length: 1})
    // command = 'getPV'
    var time
    var resp
    resp = await this.serialControl.serial(command)
    time = Date.now()
    // console.log(this.resp)
    if (resp !== undefined) {
      obj.hidden[hiddenKey].value = this.findString(resp, range)
      obj.hidden[hiddenKey].time = time
    }
  }

  async writeFloatProperty(hiddenKey, mbAddr, obj, val) {
    var command = this.basicCommandString({address: mbAddr, length: 2, value: val})
    await this.serialControl.serial(command)
  }

  async writeUintProperty(hiddenKey, mbAddr, obj, range, val) {
    // console.log(i)
    var command = this.basicCommandString({address: mbAddr, length: 1, value: val})
    await this.serialControl.serial(command)
  }

  async getAinput(i) {
    // console.log(i)
    var command = this.commandString({loc: ['Setup', 'Analog Input Menu', 'Sensor Type'], index: i, obj: this.obj})
    // command = 'getPV'
    // console.log('Getting analog input type')
    // console.log(command)
    var time
    var resp
    try {
      resp = await this.serialControl.serial(command.buf)
      time = Date.now()
    } catch (error) {
      console.log(error)
      return
    }
    // console.log(resp)
    if (resp !== undefined) {
      if (this.crcCheck(resp[0])) {
        this.hidden.inputType[i].value = command.convert(resp[0])
        this.hidden.inputType[i].time = time
      }
    }
  }

  async setAinput(i, val) {
    // console.log('Setting SP'+i+' to '+val)
    var command = this.commandString({loc: ['Setup', 'Analog Input Menu', 'Sensor Type'], index: i, obj: this.obj, val: val})
    // console.log(command.buf)
    // var time
    var resp
    try {
      resp = await this.serialControl.serial(command.buf)
      // time = Date.now()
    } catch (error) {
      console.log(error)
      return
    }
    // console.log(this.resp)
    if (resp !== undefined) {
      // if (this.crcCheck(resp[0])) {
      //
      // }
    }
  }

  async getPV(i) {
    // console.log(i)
    var command = this.commandString({loc: ['Operations', 'Analog Input Menu', 'Analog Input Value'], index: i, obj: this.obj})
    // command = 'getPV'
    var time
    var resp
    try {
      resp = await this.serialControl.serial(command.buf)
      time = Date.now()
    } catch (error) {
      console.log(error)
      return
    }
    // console.log(this.resp)
    if (resp !== undefined) {
      if (this.crcCheck(resp[0])) {
        this.hidden.processValue[i].value = command.convert(resp[0])
        this.hidden.processValue[i].time = time
      }
    }
  }

  async getSP(i) {
    var command = this.commandString({loc: ['Operations', 'Control Loop Menu', 'Set Point'], index: i, obj: this.obj})
    // command = 'getSP'
    var time
    var resp
    try {
      resp = await this.serialControl.serial(command.buf)
      time = Date.now()
    } catch (error) {
      console.log(error)
      return
    }
    // console.log(this.resp)
    if (resp !== undefined) {
      if (this.crcCheck(resp[0])) {
        this.hidden.setPoint[i].value = command.convert(resp[0])
        this.hidden.setPoint[i].time = time
      }
    }
  }

  async setSP(i, val) {
    // console.log('Setting SP'+i+' to '+val)
    var command = this.commandString({loc: ['Operations', 'Control Loop Menu', 'Set Point'], index: i, obj: this.obj, val: val})
    // console.log(command.buf)
    // var time
    var resp
    try {
      resp = await this.serialControl.serial(command.buf)
      // time = Date.now()
    } catch (error) {
      console.log(error)
    }
    // console.log(this.resp)
    if (resp !== undefined) {
      // if (this.crcCheck(resp[0])) {
      //
      // }
    }
  }

  crcCheck(b) {
    // console.log('crc check')
    // console.log(b)
    var crc = crc16(b.slice(0, -2))
    // console.log(crc.toString(16))
    if (crc === b.readUInt16LE(b.length - 2)) {
      // console.log('Good CRC')
      return true
    } else {
      // console.log('Bad CRC')
      return false
    }
  }

  async getTest() {
    // console.log(i)
    var command = this.basicCommandString({address: this.obj.Test['Text string'].Modbus[0], length: 4})
    // command = 'getPV'
    var time
    var resp
    resp = await this.serialControl.serial(command)
    // time = Date.now()
    console.log(resp)
    // console.log(this.convertUint(resp[0]))
    // console.log(this.convertFloat(resp[0]))
    console.log(resp[0].toString('ascii', 3, 11))
    // if (resp !== undefined) {
    //   obj.hidden[hiddenKey].value = this.convertFloat(resp[0])
    //   obj.hidden[hiddenKey].time = time
    // }
  }

  test() {
    this.getTest().catch(error => {
      console.log('test error')
      console.log(error)
    })
  }

  initialize({router, testFlag, units}) {
    if (router !== undefined) {
      this.router = router
    }
    if (this.router !== undefined) {
      console.log('controller init')
      console.log(testFlag)
      this.serialControl = new ad.SerialControl({router: this.router, testFlag: testFlag, debugTest: false})
    }

    if (testFlag !== undefined)
      this.testFlag = testFlag

    // console.log('initializing')
  }
}

module.exports = {
  Device: VaisalaHPP272C,
}

// for actual physical device testing

async function f() {
  var router = new ad.Router({
    portPath: '/dev/ttyUSB3',
    testFlag: false,
    maxQueueLength: 100,
    baud: 19200,
    stopBits: 2,
    // manufacturer: 'FTDI',
    manufacturer: 'FTDI',
    seriallineSerial: 'A603J5JA',
    timing: true,
    timeInterval: 25,
  })

  try {
    await router.openPort()
  } catch (error) {
    console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
    throw error
  }

  var vaisala = new VaisalaHPP272C({rtuAddress: 240, router: router, testFlag: true, debugTest: true})

  setInterval(() => {
    console.log('vaisala.PV0')
    console.log(vaisala.PV0)
    console.log('vaisala.PV1')
    console.log(vaisala.PV1)
    console.log('vaisala.PV2')
    console.log(vaisala.PV2)
  }, 1000)


  // setInterval(() => {
  //   console.log(pump.diameter)
  //   // pump.rate = 3
  //   // console.log(pump.rate)
  //     // pump.getWithdrawalRate().then(() => {
  //     //   console.log('success')
  //     // }).catch((error) => {
  //     //   console.log('error')
  //     //   console.log(error)
  //     // })
  // }, 1000)

}

// console.log('Waiting 4 seconds for serial')
// setTimeout(() => {
//   f()
// }, 4000)
