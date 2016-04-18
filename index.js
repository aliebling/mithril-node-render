'use strict';

var VOID_TAGS = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr',
  'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track',
  'wbr', '!doctype'];

var reactIdArray = [0];

function isArray(thing) {
  return Object.prototype.toString.call(thing) === '[object Array]';
}

function camelToDash(str) {
  return str.replace(/\W+/g, '-')
      .replace(/([a-z\d])([A-Z])/g, '$1-$2');
}

function removeEmpties(n) {
  return n != '';
}

// shameless stolen from https://github.com/punkave/sanitize-html
function escapeHtml(s, replaceDoubleQuote) {
  if (s === 'undefined') {
    s = '';
  }
  if (typeof(s) !== 'string') {
    s = s + '';
  }
  s =  s.replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/\>/g, '&gt;');
  if (replaceDoubleQuote) {
    return s.replace(/\"/g, '&quot;');
  }
  return s;
}

function createAttrString(attrs, escapeAttributeValue) {
  if (!attrs || !Object.keys(attrs).length) {
    return '';
  }

  return Object.keys(attrs).map(function(name) {
    var value = attrs[name];
    if (typeof value === 'undefined' || value === null || typeof value === 'function') {
      return;
    }
    if (typeof value === 'boolean') {
      return value ? ' ' + name : '';
    }
    if (name === 'style') {
      if (!value) {
        return;
      }
      var styles = attrs.style;
      if (typeof styles === 'object') {
        styles = Object.keys(styles).map(function(property) {
          return styles[property] != '' ? [camelToDash(property).toLowerCase(), styles[property]].join(':') : '';
        }).filter(removeEmpties).join(';');
      }
      return styles != '' ? ' style="' + escapeAttributeValue(styles, true) + '"' : '';
    }
    return ' ' + (name === 'className' ? 'class' : name) + '="' + escapeAttributeValue(value, true) + '"';
  }).join('');
}

function createChildrenContent(view, reactId, isParentComponent) {
  if(isArray(view.children) && !view.children.length) {
    return '';
  }

  return render(view.children, null, reactId, false, isParentComponent);
}

function createReactIdString(reactId) {
  //return ' data-reactId="' + reactId + '"';
  return ' data-reactId="' + reactIdArray.join('.') + '"';
}

function render(view, options, reactId, isComponent, isFirstChildOfComponent) {
  options = options || {};

  var defaultOptions = {
    escapeAttributeValue: escapeHtml,
    escapeString: escapeHtml
  };

  Object.keys(defaultOptions).forEach(function(key) {
    if (!options.hasOwnProperty(key)) options[key] = defaultOptions[key];
  });

  var type = typeof view;

  if (type === 'string') {
    return options.escapeString(view);
  }

  if (type === 'number' || type === 'boolean') {
    return view;
  }

  if (!view) {
    return '';
  }

  if (isArray(view)) {
    if (isFirstChildOfComponent) {
      reactIdArray.push(0);
    }

    var childrenHTML = view.map(function(view, index) { return render(view, options, reactId + '.' + index, false, isComponent && index === 0 ? true : false) }).join('');

    if (isFirstChildOfComponent) {
      reactIdArray.pop();
    }

    return childrenHTML;
  }

  //compontent
  if (view.view) {
    reactId = reactIdArray[reactIdArray.length-1] + 1;
    reactIdArray[reactIdArray.length-1] = reactId;

    //registerComponent(reactId, );

    var scope = view.controller ? new view.controller : {};

    var result = render(view.view(scope), options, reactId, true, false);
    if (scope.onunload) {
      scope.onunload();
    }

    return result;
  }

  if (view.$trusted) {
    return '' + view;
  }

  var reactIdString =  (isComponent ? createReactIdString(reactId) : '');

  var children = createChildrenContent(view, reactId, isComponent);
  if (!children && VOID_TAGS.indexOf(view.tag.toLowerCase()) >= 0) {
    return '<' + view.tag + createAttrString(view.attrs, options.escapeAttributeValue) + reactIdString + '>';
  }
  return [
    '<', view.tag, createAttrString(view.attrs, options.escapeAttributeValue), reactIdString, '>',
    children,
    '</', view.tag, '>'
  ].join('');
}

render.escapeHtml = escapeHtml;

module.exports = render;
