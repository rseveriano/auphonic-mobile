var History = require('History');

var API = require('../API');
var Controller = require('./');
var View = require('../View');
var UI = require('../UI');

var LocalStorage = require('Utility/LocalStorage');

var Chapter = require('App/Chapter');
var Data = require('App/Data');
var ListFiles = require('App/ListFiles');
var MainForm = require('App/MainForm');
var Metadata = require('App/Metadata');
var OutputFiles = require('App/OutputFiles');
var Service = require('App/Service');
var Source = require('App/Source');

var Form = require('App/Form');

var form;
var productions = {};

var createForm = function(options) {
  return new Form({
    use: [
      new MainForm(Object.append({
        displayName: 'Production',
        displayType: 'production',
        baseURL: '/production/',
        saveURL: 'productions',
        getObjectName: function(object) {
          return object && object.metadata && object.metadata.title;
        },
        onSave: function(object) {
          API.invalidate('productions');
          productions[object.uuid] = object;
          History.push('/production/' + object.uuid);
        }
      }, options)),
      Chapter,
      Metadata,
      Source,
      Service,
      ListFiles,
      OutputFiles
    ]
  });
};

var addPlaceholder = function() {
  var stack = View.getMain().getStack();
  if (stack.getLength() > 1 || stack.getByURL('/production')) return;

  View.getMain().push('production', new View.Object({
    url: '/production',
    title: 'Productions'
  }).invalidate());
};

Controller.define('/production', function() {
  productions = {};

  var options = {
    offset: 0,
    limit: 20
  };

  var load = function(options, onSuccess) {
    API.call('productions', 'get', options).on({success: onSuccess});
  };

  var add = function(data) {
    data.each(function(item) {
      productions[item.uuid] = item;
    });
  };

  View.getMain().showIndicator({stack: 'production'});

  load(options, function(response) {
    add(response.data);

    View.getMain().push('production', new View.Object.LoadMore({
      title: 'Productions',
      content: UI.render('production', {production: response.data}),
      action: {
        title: 'New',
        url: '/production/source'
      },
      loadMoreFunction: load,
      loadMoreOptions: options,
      loadedItems: response.data.length,
      addItemsFunction: add,
      itemContainer: '.production_container',
      templateId: 'production-single'
    }));
  });
});

var click = function(event) {
  event.preventDefault();

  var url = this.get('data-api-url');
  var method = this.get('data-method');
  if (url && method) API.call(url, method, 'null');

  this.dispose();
};

Controller.define('/production/{uuid}', function(req) {
  var production = Data.prepare(productions[req.uuid], 'production');

  UI.register('a.startProduction', function(elements) {
    elements.addEvent('click', click);
  });

  addPlaceholder();

  View.getMain().push('production', new View.Object({
    title: production.metadata.title,
    content: UI.render('data-detail', production),
    action: {
      title: 'Edit',
      url: '/production/edit/' + production.uuid
    }
  }));
});

Controller.define('/production/{uuid}/summary', function(req) {
  var production = productions[req.uuid];
  View.getMain().push('production', new View.Object({
    title: production.metadata.title,
    content: UI.render('data-detail-summary', production)
  }));
});

var getPresets = function(callback) {
  API.call('presets').on({
    success: function(response) {
      var presets = {};
      response.data.each(function(preset) {
        presets[preset.uuid] = preset;
      });
      callback(presets);
    }
  });
};

var edit = function(production) {
  View.getMain().showIndicator({stack: 'production'});

  var show = function() {
    form = createForm(production ? {saveURL: 'production/' + production.uuid} : null);

    if (production.service) Source.setData(form, production.service);

    // Check if we are currently uploading
    if (!production.input_file) {
      var currentUpload = LocalStorage.get('currentUpload');
      if (currentUpload && currentUpload.uuid == production.uuid)
        production.input_file = currentUpload.input_file;
    }

    ListFiles.setFile(form, production.input_file);

    getPresets(function(presets) {
      form.show('main', production, presets);
    });
  };

  if (production.service) Source.fetch(show);
  else show();
};

Controller.define('/production/edit/{uuid}', function(req) {

  var production = productions[req.uuid];
  if (production) {
    edit(production);
    return;
  }

  View.getMain().showIndicator({stack: 'production'});

  // Maybe we haven't loaded productions yet
  API.call('production/{uuid}'.substitute(req)).on({
    success: function(response) {
      // We are not bothering with the list of productions
      edit(response.data);
    }
  });

});

Controller.define('/production/new', {priority: 1, isGreedy: true}, function() {
  getPresets(function(presets) {
    form.show('main', null, presets);
  });
});

Controller.define('/production/source', {priority: 1, isGreedy: true}, function() {
  addPlaceholder();
  form = createForm();
  form.show('source');
});

Controller.define('/production/source/{service}', function(req) {
  var service = Source.setData(form, req.service);
  if (!service) return;

  form.show('listFiles');
});

Controller.define('/production/selectFile/{index}', function(req) {
  ListFiles.setData(form, req.index);
  History.push('/production/new');
});

Controller.define('/production/new/metadata', function() {
  form.show('metadata');
});

Controller.define('/production/new/output_file/:id:', function(req) {
  form.show('output_files', req.id);
});

Controller.define('/production/new/chapter/:id:', function(req) {
  form.show('chapters', req.id);
});

Controller.define('/production/new/outgoing_services', function() {
  form.show('outgoing_services');
});
