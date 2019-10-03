var React = require('react');
//var App = require('./components/App.jsx');
// the 'page' (JSON object) var is set via server-side logic in the URL filter and stub.jsp
var pageComp = require('./components/' + page.name + ".jsx");

// {page {name: "", }
// React.render( <Home />, document.getElementById('root-div') )
React.render( pageComp, document.getElementById('root-div') )
