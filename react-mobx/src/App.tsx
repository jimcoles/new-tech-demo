import { observer } from "mobx-react";
import ComponentA from "./app/CompA";
import ComponentB from "./app/CompB";

const App = () => {

  return (
    <div>
      <h1>My React / MobX Test Stuff</h1>
      <div>
        <h1>MobX Editor-Viewer</h1>
        <ComponentA />
        <ComponentB />
      </div>
    </div>
  );
};

App.displayName = "App";
export default observer(App);
