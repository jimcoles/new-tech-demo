var React = require('react');
var Greet = require('./Greet.jsx');

// TODO
// 1. Server-side WS call to get JSON data
// 2. Dynamics React child creation
// 3. Use event polling model to get all data

var App = React.createClass({

    eventQueue: function () {
    }
    render: function () {
        return (
            <div>
                <Home />
            </div>
        );
    }
}
);

module.exports = App;