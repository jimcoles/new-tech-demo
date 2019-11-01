//
var ReactDOM = require('react-dom')
var React = require('react')

class HomePage extends React.Component {
  render() {
    return (
        React.createElement('MyTable')
    );
  }
}

class MyTable extends React.Component {

  renderCell(i) {
    return React.createElement('CellDiv')
  }

  render() {
    var topDiv = React.createElement('div', {className: 'table'})
    return topDiv
  }
}

class Game extends React.Component {
  render() {
    return React.createElement('div', {className: 'game'})
  }

//      <div className="game">
//        <div className="game-board">
//          <Board />
//        </div>
//        <div className="game-info">
//          <div>{/* status */}</div>
//          <ol>{/* TODO */}</ol>
//        </div>
//      </div>
//    );
}

// ========================================

ReactDOM.render(
  React.createElement('HomePage'),
  document.getElementById('root')
);

