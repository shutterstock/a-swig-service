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
var translations_path = file_path_base + 'translations-footer.json~';
var server_port = process.env.HTTP_PORT || 8004;

describe('Basic tests', function() {
  it('should throw exception if template dir is not provided', function(done) {
    assert.throws(function() { require('../../app'); },
                  "Template dir not specified",
                  "no template dir produces error"
                 );
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
      "FOOTER_LINK_WEBSITE_TERMS" : {
        "fr" : "Termes de site web",
        "en" : "Website Terms of Use",
        "de" : "Website AGB"
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

    it('should show stats when aviable', function(done) {
      client.post({

        url: 'template/footer.html',
        body: { global: { photo_stats: { total: 200000 } } },
        success: function(html) {
          assert.ok(html.match(/stats/), "we pass in photo total we see stats");
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });

    it('should show not stats when unaviable', function(done) {
      client.post({

        url: 'template/footer.html',
        body: { global: { } },
        success: function(html) {
          assert.ifError(html.match(/stats/), "we pass in photo total we see stats");
          done();
        },
        error: function(error) {
          console.log(error);
          assert.fail("Got error from service");
          done();
        }
      });
    });

    it('should show render footer in a different language', function(done) {
      client.post({
        url: 'template/footer.html',
        body: { i18n: { language: 'fr' } },
        success: function(html) {
          assert.ok(html.match(/Termes de site web/), "display footer in fr");
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
