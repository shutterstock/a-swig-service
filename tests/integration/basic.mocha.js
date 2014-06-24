var proxyquire = require('proxyquire');
var fs = require('fs');
var armrest = require('armrest');
var assert = require("assert");

//Do not allow server to override console logging functions
//Overriding console logging is good for production but is not so good
//for testing
var log4js = require('log4js');
log4js.replaceConsole = function() {};

var file_path_base = './tests/integration/';
var templates_path = file_path_base + 'templates';
//We have a tilda there so git ignores that file
//We write this file at test startup, different tests should use
//different files since they are loaded by mocha at once
var translations_path = file_path_base + 'translations-basic.json~';
var server_port = process.env.HTTP_PORT || 8004;

describe('Basic tests', function() {
  it('should throw exception if template dir is not provided', function(done) {
    assert.throws(function() {
      proxyquire('../../app');
    }, "Template dir not specified", "no template dir produces error");
    done();
  });

  it('should start up simple server', function(done) {
    var server = proxyquire('../../app', {
      'optimist': {
        argv: {
          templates: templates_path,
          translations: translations_path,
          port: server_port
        }
      }
    });
    var listener = server.run();
    listener.close();
    done();
  });

  describe('Real template', function() {
    var server = proxyquire('../../app', {
      'optimist': {
        argv: {
          templates: templates_path,
          translations: translations_path,
          port: server_port
        }
      }
    });

    var client = armrest.client({
      base: 'http://localhost:' + server_port,
      serializer: {
        contentType: 'application/json',
        serialize: JSON.stringify,
        deserialize: function(data) { return data; }
      }
    });

    var translations = {
      HELLO: {
        en: 'Hello',
        ru: 'Привет'
      }
    };
    fs.writeFileSync(translations_path, JSON.stringify(translations));

    var listener;
    before(function(callback) {
      listener = server.run();
      callback();
    });

    after(function(callback) {
      listener.close();
      callback();
    });

    it('should render simple tmeplate', function(done) {
      client.post({
        url: '/template/hello_world.html',
        body: { name: "John Smith" },
        success: function(html) {
          assert.equal(html, "<html><title>Hello, John Smith</title></html>\n");
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });

    it('Should render template with i18n tag', function(done) {
      client.post({
        url: '/template/translation.html',
        body: { i18n: { language: "ru" } },
        success: function(html) {
          console.log(html);
          assert.ok(html.match(/<title>Привет<\/title>/));
          assert.ok(html.match(/<body>default-goodbye<\/body>/));
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });
    it('Should render template with i18n filter', function(done) {
      client.post({
        url: '/template/translation-filter.html',
        body: { i18n: { language: "ru" } },
        success: function(html) {
          console.log(html);
          assert.ok(html.match(/<title>Привет - 2<\/title>/));
          assert.ok(html.match(/<body>default-goodbye - 2<\/body>/));
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });
    it('Should render isString filter', function(done) {
      client.post({
        url: '/template/filter.html',
        body: { i18n: { language: "ru" }, foo: 'I am a string', bar:["i am not a string"] },
        success: function(html) {
          assert.ok(html.match(/IS_STRING/));
          assert.ok(html.match(/IS_ARRAY/));
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });
  });
});
