import React, {useState} from "react"
import {Stage, Layer, Rect, Text} from 'react-konva';

class MyComponent extends React.Component {

  constructor() {
    super()
    this.stageRef = React.createRef()
  }

  componentDidMount() {
    // this.stageRef.current is null here!
  }


  render() {
    return (
      <>
        <Stage id="canvas-text"
               width={400} height={163}
               className="stage"
               ref={this.stageRef}>
          <Layer>
            <Text fontFamily='Karla' fontSize={24} align='center' width={400} y={30} text={"Hello"}/>
          </Layer>
        </Stage>
      </>
    )
  }
}

export default MyComponent;
