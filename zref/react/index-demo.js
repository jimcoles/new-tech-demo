import React from "react";
import { render } from "react-dom";
import { Stage, Layer, Text } from "react-konva";

class MyComponent extends React.Component {
  constructor() {
    super();
    this.stageRef = React.createRef();
  }

  componentDidMount() {
    console.info(this.stageRef.current);
  }

  render() {
    return (
      <>
        <Stage
          id="canvas-text"
          width={400}
          height={163}
          className="stage"
          ref={this.stageRef}
        >
          <Layer>
            <Text
              fontFamily="Karla"
              fontSize={24}
              align="center"
              width={400}
              y={30}
              text={"Hello"}
            />
          </Layer>
        </Stage>
      </>
    );
  }
}

render(<MyComponent />, document.getElementById("root"));
