// store.js
import {action, makeAutoObservable, makeObservable, observable, ObservableMap} from "mobx";

interface Person {
    ssn: string
    name: string
    last: string
    salary: number
}

class AppStore {

    value = "(change me)"; // Initial value
    objMap = new ObservableMap<string, Person>();

    constructor() {
        // annotations
        makeObservable(this, {
            value: observable,
            setValue: action
        });
    }

    setValue(newValue: string) {
        this.value = newValue;
    }
}

const store = new AppStore();

export default store;
