// ComponentB.tsx
import React from 'react';
import {observer} from 'mobx-react';
import {useStore} from "./utils";


function ComponentB() {

    let appStore = useStore();

    const person = appStore.objMap.get("1234");

    return (
        <div>
            <div className="border">
                <h2>The View #1</h2>
                <p>Value from Component A: {appStore.value}</p>
            </div>
            <div className="border">
                <h2>Persons</h2>
                <table>
                    <thead>
                    <tr>
                        <th>PIN</th>
                        <th>Name</th>
                        <th>Moola</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>{person?.ssn}</td>
                        <td>{person?.name}</td>
                        <td>{person?.salary}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default observer(ComponentB);
//export default ComponentB;
