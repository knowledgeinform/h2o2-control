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

// dictionary of vaisala Modbus comms
var vaisala = {
  Measurement: {
    'H2O2 Vapor Concentration': {
      Description: 'Vaporized hydrogen peroxide concentration by volume',
      Range: 'Unknown',
      Units: 'ppm',
      Modbus: [1],
      Type: ['float', 'R'],
    },
    'H2O+H2O2 Relative Saturation': {
      Description: 'H2O+H2O2 Relative Saturation',
      Range: 'Unknown',
      Units: '%RS',
      Modbus: [3],
      Type: ['float', 'R'],
    },
    'Temperature for calculation': {
      Description: 'Temperature used for calculation. By default, shows the temperature from the temperature probe (register 0016hex). If temperature compensation is turned ON (register 0505hex), this register shows the volatile value for given temperature reading (register 0302hex).',
      Range: 'Unknown',
      Units: 'C',
      Modbus: [5],
      Type: ['float', 'R'],
    },
    'Relative humidity': {
      Description: 'Relative humidity',
      Range: 'Unknown',
      Units: '%RH',
      Modbus: [7],
      Type: ['float', 'R'],
    },
    'Absolute H2O2': {
      Description: 'Absolute hydrogen peroxide',
      Range: 'Unknown',
      Units: 'mg/m3',
      Modbus: [9],
      Type: ['float', 'R'],
    },
    'H2O+H2O2 dew point temperature': {
      Description: 'H2O+H2O2 dew point temperature',
      Range: 'Unknown',
      Units: 'C',
      Modbus: [11],
      Type: ['float', 'R'],
    },
    'Water Vol. Concentration': {
      Description: 'Water concentration by volume',
      Range: 'Unknown',
      Units: 'ppm',
      Modbus: [15],
      Type: ['float', 'R'],
    },
    'Water Vapor Pressure': {
      Description: 'Water Vapor Pressure',
      Range: 'Unknown',
      Units: 'hPa',
      Modbus: [17],
      Type: ['float', 'R'],
    },
    'Absolute humidity (water)': {
      Description: 'Absolute humidity (water)',
      Range: 'Unknown',
      Units: 'g/m3',
      Modbus: [19],
      Type: ['float', 'R'],
    },
    'Temperature': {
      Description: 'Temperature from the temperature probe',
      Range: 'Unknown',
      Units: 'C',
      Modbus: [23],
      Type: ['float', 'R'],
    },
    'H2O2 Vapor Pressure': {
      Description: 'H2O2 Vapor Pressure',
      Range: 'Unknown',
      Units: 'hPa',
      Modbus: [25],
      Type: ['float', 'R'],
    },
    'Saturation Pressure (H2O+H2O2)': {
      Description: 'Water vapor saturation pressure (H2O+H2O2)',
      Range: 'Unknown',
      Units: 'hPa',
      Modbus: [27],
      Type: ['float', 'R'],
    },

  },
  Configuration: {
    'Pressure Compensation Value': {
      Description: 'Volatile value for pressure compensation (value cleared at probe reset). Used for compensating the measurement for pressure if pressure compensation is turned ON (register 0504hex). (default 1013.25 hPa) (Init copied from power- up value)',
      Range: '813.25 ... 1213.25 hPa',
      Units: 'hPa',
      Modbus: [769],
      Type: ['float', 'W'],
    },
    'Temperature Compensation Value': {
      Description: 'Volatile value for given temperature reading (value cleared at probe reset). Used for calculations instead of the temperature from the temperature probe if temperature compensation is turned ON (register 0505hex). (Init copied from power- up value)',
      Range: '-40 ... +80',
      Units: 'C',
      Modbus: [771],
      Type: ['float', 'W'],
    },
    'Power Up Pressure Compensation Value': {
      Description: 'Power-up value for pressure compensation (default 1013.25 hPa)',
      Range: '813.25 ... 1213.25',
      Units: 'hPa',
      Modbus: [773],
      Type: ['float', 'W'],
    },
    'Power Up Temperature Compensation Value': {
      Description: 'Power-up value for given temperature reading (uncertain of meaning here)',
      Range: '-40 ... +80',
      Units: 'C',
      Modbus: [775],
      Type: ['float', 'W'],
    },
    'Purge Interval': {
      Description: 'Purge interval (1 hour ... 1 week) (default: 1440 (= 24 hours))',
      Range: '60 ... 10080',
      Units: 'min',
      Modbus: [777],
      Type: ['int', 'W'],
    },
    'Measurement Filtering Factor': {
      Description: 'Measurement filtering factor (does not affect temperature, water, or RH measurement) 1 = Filter is disabled < 1 = Reading is a combination of latest measurement and the earlier reading. The value of the register defines the portion of the latest measurement, for example, 0.9 means the reading consists 90 % of the latest measurement and 10 % of the earlier reading.',
      Range: '0.01 ... 1',
      Units: '',
      Modbus: [779],
      Type: ['float', 'W'],
    },
    'Low H2O2 Threshold Enable': {
      Description: 'Low H2O2 threshold on/off (default = 0) When enabled, the Low H2O2 threshold feature remains in use also after probe reset.',
      Range: {
        '0': 'Off',
        '1': 'On',
      },
      Units: '',
      Modbus: [783],
      Type: ['int', 'W'],
    },
    'Low H2O2 Threshold Value': {
      Description: 'Low H2O2 threshold activation level (default: 3)',
      Range: 'Unknown',
      Units: 'ppm',
      Modbus: [785],
      Type: ['float', 'W'],
    },
    'Low H2O2 Threshold Delay': {
      Description: 'Low H2O2 threshold activation delay (default: 10)',
      Range: 'Unknown',
      Units: 's',
      Modbus: [787],
      Type: ['float', 'W'],
    },
    'Low H2O2 Deactivation Threshold Value': {
      Description: 'Low H2O2 threshold deactivation level (default: 10)',
      Range: 'Unknown',
      Units: 'ppm',
      Modbus: [789],
      Type: ['float', 'W'],
    },
    'Low H2O2 Deactivation Threshold Delay': {
      Description: 'Low H2O2 threshold deactivation delay (default: 10)',
      Range: 'Unknown',
      Units: 's',
      Modbus: [791],
      Type: ['float', 'W'],
    },
    'Purge Status': {
      Description: 'Purge status / manual start When reading from register: 1 ... 100 = Purge is in progress (progress shown as 1 ... 100%) 0 = Previous purge completed successfully, purge is not in progress ... -1 = Previous purge has failed Note: After starting the purge by writing 1, only read from the register until the purge has completed. See the related section in Problems and their possible solutions (page 61).',
      Range: 'Unknown',
      Units: '%',
      Modbus: [1283],
      Type: ['int', 'R'],
    },
    'Pressure Compensation Mode': {
      Description: 'Pressure compensation on/off',
      Range: {
        '0': 'Off',
        '1': 'On',
      },
      Units: '',
      Modbus: [1285],
      Type: ['int', 'W'],
    },
    'Temperature Compensation Mode': {
      Description: 'Temperature compensation mode. (default: 1 = Use a setpoint value) 0 = Use temperature measured by temperature probe in the calculation of other measurement parameters. 1 = Use a setpoint temperature value in the calculation of other measurement parameters instead of the temperature measured by the temperature probe. Define the setpoint value in registers 0302hex (volatile value) and 0306hex (power-up value).',
      Range: {
        '0': 'Off',
        '1': 'On',
      },
      Units: '',
      Modbus: [1286],
      Type: ['uint', 'W'],
    },
    'Manual Purge Trigger Mode': {
      Description: 'Manual purge trigger in analog mode on/off',
      Range: {
        '0': 'Off',
        '1': 'On',
      },
      Units: '',
      Modbus: [1287],
      Type: ['int', 'W'],
    },
    'Interval Purge Mode': {
      Description: 'Allow interval purge during H2O2 exposure (default: 0 = Off)',
      Range: {
        '0': 'Off',
        '1': 'On',
      },
      Units: '',
      Modbus: [1288],
      Type: ['int', 'W'],
    },
    'Modbus Address': {
      Description: 'Modbus address (default: 240)',
      Range: '1 ... 255',
      Units: '',
      Modbus: [1537],
      Type: ['int', 'W'],
    },
    'Baudrate': {
      Description: 'Bit rate (default: 6 = 19200)',
      Range: {
        '5': 9600,
        '6': 19200,
        '7': 38400,
        '8': 57600,
        '9': 115200,
      },
      Units: '',
      Modbus: [1538],
      Type: ['uint', 'W'],
    },
    'Parity': {
      Description: 'Parity, number of data bits, number of stop bits (default: 1 = None, 8, 2)',
      Range: {
        '0': 'None, 8, 1',
        '1': 'None, 8, 2',
        '2': 'Even, 8, 1',
        '3': 'Even, 8, 2',
        '4': 'Odd, 8, 1',
        '5': 'Odd, 8, 2',
      },
      Units: '',
      Modbus: [1539],
      Type: ['uint', 'W'],
    },
    'Response Delay': {
      Description: 'Response delay',
      Range: '0 ... 1000',
      Units: 'ms',
      Modbus: [1540],
      Type: ['int', 'W'],
    },
    'Restart': {
      Description: 'Restart device When writing to register: 1 = Restart the device',
      Range: {
        '1': 'Restart the device'
      },
      Units: '',
      Modbus: [1541],
      Type: ['int', 'W'],
    },
    'Factory Reset': {
      Description: 'Restore factory settings When writing to register: 1 = Restore factory settings (cancel all changes made by the user) and remove all field adjustments. Resets the device.',
      Range: {
        '1': 'Restore factory settings',
      },
      Units: '',
      Modbus: [7937],
      Type: ['int', 'W'],
    },
  },
  Status: {
    'Device Status': {
      Description: 'Device status',
      Range: {
        '0': 'Status OK.',
        '1': 'Critical error, maintenance needed.',
        '2': 'Error, device may recover automatically.',
        '4': 'Warning.',
        '8': 'Notification.',
        '16': 'Calibration enabled.',
      },
      Units: '',
      Modbus: [513],
      Type: ['uint', 'R'],
    },
    'H2O2 Vol. Concentration Status': {
      Description: 'Status of Hydrogen peroxide concentration by volume',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [529],
      Type: ['uint', 'R'],
    },
    'H2O2 Vapor Concentration': {
      Description: 'Status of H2O+H2O2 relative saturation',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [530],
      Type: ['uint', 'R'],
    },
    'Temperature Status': {
      Description: 'Status of Temperature',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [531],
      Type: ['uint', 'R'],
    },
    'Relative Humidity Status': {
      Description: 'Status of Relative humidity',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [532],
      Type: ['uint', 'R'],
    },
    'Absolute H2O2 Status': {
      Description: 'Status of Absolute hydrogen peroxide',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [533],
      Type: ['uint', 'R'],
    },
    'H2O+H2O2 dewpoint temperature status': {
      Description: 'Status of H2O+H2O2 dewpoint temperature',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [534],
      Type: ['uint', 'R'],
    },
    'H2O Vol. Concentration': {
      Description: 'Status of Water concentration by volume',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [536],
      Type: ['uint', 'R'],
    },
    'H2O Vapor Pressure Status': {
      Description: 'Status of Water vapor pressure',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [537],
      Type: ['uint', 'R'],
    },
    'Absolute Humidity Status': {
      Description: 'Status of Absolute humidity',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [538],
      Type: ['uint', 'R'],
    },
    'Water Vapor Saturation Pressure Status': {
      Description: 'Status of Water vapor saturation pressure',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [539],
      Type: ['uint', 'R'],
    },
    'Temperature Probe Status': {
      Description: 'Status of Temperature from the temperature probe',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [540],
      Type: ['uint', 'R'],
    },
    'H2O2 Pressure Status': {
      Description: 'Status of H2O2 pressure',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [541],
      Type: ['uint', 'R'],
    },
    'H2O+H2O2 Vapor Pressure Status': {
      Description: 'Status of H2O+H2O2 vapor pressure',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Units: '',
      Modbus: [542],
      Type: ['uint', 'R'],
    },
    'Sensor Vitality': {
      Description: 'Sensor Vitality',
      Range: {
        '0': 'Status OK.',
        '2': 'Reading is not reliable.',
        '32': 'Reading is locked during purge.',
        '64': 'Calibration has expired.',
        '128': 'Sensor failure.',
        '256': 'Measurement not ready',
      },
      Modbus: [547],
      Type: ['float', 'R'],
    },
  },
  'Device ID': {
    'Vendor Name': {
      Description: 'VendorName',
      Range: 'Unknown',
      Units: '',
      Modbus: [0],
      Type: ['string', 'R'],
    },
    'Product Code': {
      Description: 'ProductCode',
      Range: 'Unknown',
      Units: '',
      Modbus: [1],
      Type: ['string', 'R'],
    },
    'Major Minor Version': {
      Description: 'MajorMinorVersion',
      Range: 'Unknown',
      Units: '',
      Modbus: [2],
      Type: ['string', 'R'],
    },
    'Vendor Url': {
      Description: 'VendorUrl',
      Range: 'Unknown',
      Units: '',
      Modbus: [3],
      Type: ['string', 'R'],
    },
    'Product Name': {
      Description: 'ProductName',
      Range: 'Unknown',
      Units: '',
      Modbus: [4],
      Type: ['string', 'R'],
    },
    'Serial Number': {
      Description: 'SerialNumber',
      Range: 'Unknown',
      Units: '',
      Modbus: [128],
      Type: ['string', 'R'],
    },
    'Calibration Date': {
      Description: 'CalibrationDate',
      Range: 'Unknown',
      Units: '',
      Modbus: [129],
      Type: ['string', 'R'],
    },
    'Calibration Text': {
      Description: 'CalibrationText',
      Range: 'Unknown',
      Units: '',
      Modbus: [130],
      Type: ['string', 'R'],
    },
  },
  Test: {
    'Signed integer': {
      Description: 'Signed integer',
      Range: -12345,
      Units: '',
      Modbus: [7937],
      Type: ['int', 'R'],
    },
    'Floating point': {
      Description: 'Floating point',
      Range: 'Unknown',
      Units: -123.45,
      Modbus: [7938],
      Type: ['float', 'R'],
    },
    'Text string': {
      Description: 'Text string',
      Range: '-123.45',
      Units: '',
      Modbus: [7940],
      Type: ['string', 'R'],
    },
  },
}

// little endian for ints

// for floats
// minimalmodbus.BYTEORDER_LITTLE_SWAP = 3
// Use litte endian byteorder, with swap

// for ascii reads, be sure that the number of registers don't exceed the
// allowable addresses
// for example, from the python library: instrument.read_string(reg, 4) works
// BUT instrument.read_string(reg, 5) fails with an illegal address error

module.exports = {
  obj: vaisala,
  manual: 'M211972EN-F',
  revision: 'Unknown',
  date: '2020',
}
