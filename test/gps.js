exports["GPS"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.board = newBoard();
    this.serialConfig = this.sandbox.spy(MockFirmata.prototype, "serialConfig");

    this.proto = [{
      name: "configure"
    }, {
      name: "initialize"
    }, {
      name: "sendCommand"
    }, {
      name: "listen"
    }, {
      name: "parseNmeaSentence"
    }];

    this.instance = [{
      name: "baud"
    }, {
      name: "fixed"
    }, {
      name: "latitude"
    }, {
      name: "longitude"
    }, {
      name: "altitude"
    }, {
      name: "course"
    }, {
      name: "speed"
    }];

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  shape: function(test) {
    test.expect(this.proto.length + this.instance.length);

    var gps = new GPS({
      pins: {
        tx: 10,
        rx: 11
      },
      board: this.board
    });

    this.proto.forEach(function(method) {
      test.equal(typeof gps[method.name], "function");
    });

    this.instance.forEach(function(property) {
      test.notEqual(typeof gps[property.name], "undefined");
    });

    test.done();
  },

  useCustomBaud: function(test) {
    test.expect(1);

    var gps = new GPS({
      pins: {
        tx: 10,
        rx: 11
      },
      baud: 4800,
      board: this.board
    });

    test.deepEqual(this.serialConfig.args[0][0], {
      portId: 8,
      baud: 4800,
      rxPin: 11,
      txPin: 10
    });

    gps = null;
    test.done();
  }

};

exports["Chip -- MT3339"] = {

  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.board = newBoard();
    this.clock = this.sandbox.useFakeTimers();
    this.serialConfig = this.sandbox.spy(MockFirmata.prototype, "serialConfig");
    this.serialWrite = this.sandbox.spy(MockFirmata.prototype, "serialWrite");
    this.serialRead = this.sandbox.spy(MockFirmata.prototype, "serialRead");

    this.gps = new GPS({
      chip: "MT3339",
      pins: {
        tx: 10,
        rx: 11
      },
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  useDefaultPort: function(test) {
    test.expect(1);

    test.deepEqual(this.serialConfig.args[0][0], {
      portId: 8,
      baud: 9600,
      rxPin: 11,
      txPin: 10
    });

    this.serialConfig.reset();
    test.done();
  },

  useHwSerial: function(test) {
    test.expect(1);

    // flush args from generated by setUp
    this.serialConfig.reset();

    this.gps = new GPS({
      device: "MT3339",
      port: this.board.io.SERIAL_PORT_IDs.HW_SERIAL1,
      board: this.board,
    });

    test.equal(this.serialConfig.args[0][0].portId, 1);

    this.serialConfig.reset();
    test.done();
  },

  frequency: function(test) {
    test.expect(2);

    this.gps.frequency = 5;
    test.equal(this.serialWrite.args[0][0], 8);
    test.deepEqual(this.serialWrite.args[0][1], [36, 80, 77, 84, 75, 50, 50, 48, 44, 49, 48, 48, 42, 50, 70, 13, 10]);

    this.serialConfig.reset();
    this.serialWrite.reset();
    test.done();
  },

  warmRestart: function(test) {
    test.expect(2);

    this.gps.restart();
    test.equal(this.serialWrite.args[0][0], 8);
    test.deepEqual(this.serialWrite.args[0][1], [36, 80, 77, 84, 75, 49, 48, 49, 42, 51, 50, 13, 10]);

    this.serialConfig.reset();
    this.serialWrite.reset();
    test.done();
  },

  coldRestart: function(test) {
    test.expect(2);

    this.gps.restart(true);
    test.equal(this.serialWrite.args[0][0], 8);
    test.deepEqual(this.serialWrite.args[0][1], [36, 80, 77, 84, 75, 49, 48, 51, 42, 51, 48, 13, 10]);

    this.serialConfig.reset();
    this.serialWrite.reset();
    test.done();
  },

  sendCommand: function(test) {
    test.expect(2);

    this.gps.sendCommand("Hey,laser,lips,your,mama,was,a,snow,blower\r\n");
    test.equal(this.serialWrite.args[0][0], 8);
    test.deepEqual(this.serialWrite.args[0][1], [72, 101, 121, 44, 108, 97, 115, 101, 114, 44, 108, 105, 112, 115, 44, 121, 111, 117, 114, 44, 109, 97, 109, 97, 44, 119, 97, 115, 44, 97, 44, 115, 110, 111, 119, 44, 98, 108, 111, 119, 101, 114, 13, 10, 42, 54, 53, 13, 10]);

    this.serialConfig.reset();
    this.serialWrite.reset();
    test.done();
  },

  listen: function(test) {

    test.expect(2);
    this.serialRead.reset();

    this.gps.listen();

    test.equal(this.serialRead.args[0][0], 8);
    test.equal(!!(this.serialRead.args[0][1] && this.serialRead.args[0][1].constructor && this.serialRead.args[0][1].call && this.serialRead.args[0][1].apply), true);

    this.serialRead.reset();
    test.done();
  },

  parseNmeaSentence: function(test) {

    test.expect(25);

    //GPGGA North and West Hemispheres
    this.gps.parseNmeaSentence("$GPGGA,172814.0,3723.46587704,N,12202.26957864,W,2,6,1.2,18.893,M,-25.669,M,2.0,0031*4F");
    test.equal(this.gps.latitude, 37.3910980);
    test.equal(this.gps.longitude, -122.037826);
    test.equal(this.gps.altitude, 18.893);
    test.equal(this.gps.time, "172814.0");

    //North and East Hemispheres
    this.gps.parseNmeaSentence("$GPGGA,172815.0,3723.46587704,N,12202.26957864,E,2,6,1.2,18.893,M,-25.669,M,2.0,0031*5C");
    test.equal(this.gps.latitude, 37.3910980);
    test.equal(this.gps.longitude, 122.037826);
    test.equal(this.gps.altitude, 18.893);
    test.equal(this.gps.time, "172815.0");

    //GPGGA South and West Hemispheres
    this.gps.parseNmeaSentence("$GPGGA,172816.0,3723.46587704,S,12202.26957864,W,2,6,1.2,18.893,M,-25.669,M,2.0,0031*50");
    test.equal(this.gps.latitude, -37.3910980);
    test.equal(this.gps.longitude, -122.037826);
    test.equal(this.gps.altitude, 18.893);
    test.equal(this.gps.time, "172816.0");

    //GPGGA South and East Hemispheres
    this.gps.parseNmeaSentence("$GPGGA,172816.0,3723.46587704,S,12202.26957864,E,2,6,1.2,18.893,M,-25.669,M,2.0,0031*42");
    test.equal(this.gps.latitude, -37.3910980);
    test.equal(this.gps.longitude, 122.037826);
    test.equal(this.gps.altitude, 18.893);
    test.equal(this.gps.time, "172816.0");

    //GPGSA
    this.gps.parseNmeaSentence("$GPGSA,A,3,19,28,14,18,27,22,31,39,,,,,1.7,1.0,1.3*34");
    test.deepEqual(this.gps.sat, {
      satellites: ["19", "28", "14", "18", "27", "22", "31", "39", "", "", "", ""],
      pdop: 1.7,
      hdop: 1.0,
      vdop: 1.3
    });

    //GPRMC
    this.gps.parseNmeaSentence("$GPRMC,220516,A,5133.82,N,00042.24,W,173.8,231.8,130694,004.2,W*70");
    test.equal(this.gps.latitude, 51.563667);
    test.equal(this.gps.longitude, -0.704000000);
    test.equal(this.gps.altitude, 18.893);
    test.equal(this.gps.course, 231.8);
    test.equal(this.gps.speed, 89.410367);
    test.equal(this.gps.time, "220516");

    //GPVTG
    this.gps.parseNmeaSentence("$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48");
    test.equal(this.gps.course, 54.7);
    test.equal(this.gps.speed, 2.829442);
    test.done();
  }

};
