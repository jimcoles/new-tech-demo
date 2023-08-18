import React from 'react';
import './App.css';

function App() {
  const dum : React.CSSProperties = {height: "auto"}
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Jim's app</h1>
      </header>
      <section className={"App-header"}>

        <div style={{}}>
          <UserListHtml/>
        </div>

      </section>
      <footer>

      </footer>
    </div>
  );
}

/* A React JSX component. */
function MyButton() {
  return (
    <button>Click Me!</button>
  )
}

class User {

  constructor(name: string, id: number, age: number) {
    this.name = name;
    this.id = id;
    this.age = age;
  }

  id: number
  name: string;
  age: number;

}

function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <p>Hello there.<br/>How do you do?</p>
    </>
  );
}

// Data render pseudo-component
class UserListData extends React.Component {
  render() {
    const userList: User[] = [
      {id: 1, name: 'John Doe', age: 25},
      {id: 2, name: 'Jim Boe', age: 59}
    ];

    // Render the children by passing the data through render props
    // @ts-ignore
    return this.props.children(userList);
  }
}

// HTML Render component
class UserListHtml extends React.Component {
  render() {
    return (
      <div>
        <h2>Data Driven User List:</h2>
        <UserListData>
          <>
            <div>
            </div>
          </>
        </UserListData>
      </div>
    );
  }
}

export default App;
