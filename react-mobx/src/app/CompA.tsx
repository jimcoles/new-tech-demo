// ComponentA.js
import React, {useState} from 'react';
import {observer} from 'mobx-react';
import {useStore} from "./utils";

function ComponentA() {

    const appStore = useStore();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
        appStore.setValue(e.target.value);
    };

    const [editValue, setEditValue] = useState(appStore.value)
    const [objNum, setObjNum] = useState(0);
    const person = appStore.objMap.get("1234");

    function handleMakePerson() {
        appStore.objMap.set("1234", {ssn: "1234", name: "Jim", last: "Coles", salary: 100000});
    }

    function handleMakeMoney() {
        if (person) person.salary = person.salary + (10000);
    }

    return (
        <div className={"border"}>
            <h2>The Editor</h2>
            <div><input type="text"
                        onChange={handleChange}
                        value={editValue}/></div>
            <div>
                <button onClick={handleMakePerson}>Make Person</button>
            </div>
            <div>
                <button onClick={handleMakeMoney}>Make Money</button>
            </div>
        </div>
    );
}

export default observer(ComponentA);
