import React, {ReactNode, useEffect} from 'react';

const logComponentTree = (node: ReactNode) => {
    console.log(node);
    if (React.isValidElement(node))
        if (React.Children.count(node.props.children) > 0) {
            React.Children.forEach(node.props.children, (child) => {
                logComponentTree(child);
            });
        }
};

const App = () => {
    useEffect(() => {
        // Call the function here to traverse the component tree
        logComponentTree(<App/>);
    }, []);

    return (
        <div>
            <h1>App Component</h1>
            <ChildComponent/>
        </div>
    );
};

const ChildComponent = () => {
    return (
        <div>
            <h2>Child Component</h2>
            <GrandchildComponent/>
        </div>
    );
};

const GrandchildComponent = () => {
    return <h3>Grandchild Component</h3>;
};

export default App;
