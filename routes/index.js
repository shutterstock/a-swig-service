
/*
 * Add the routes to the application
 */
exports.initialize = function(app) {
  var view_path = app.get("template_path");
  var swig = app.get("swig");

  app.get('/healthcheck', function(req, res) {
    var body = 'YESOK';
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.end(body);
  });

  app.all('/template/*', function(req, res) {
    var path = req.params[0];
    res.setHeader('Content-Type', 'text/html');
    res.send(swig.renderFile([view_path, path].join('/'), req.body));
  });

};
