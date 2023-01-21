# Stickler

A simple FSM for typescript.

> DRAFT: These docs are a work in progress.

## Motivation

Code becomes complicated, quickly. This is especially true when interacting with other systems, and asynchronous behaviour gets involved.

A technique that can help make sense of this, is to think of the system as a finite state machine (FSM). At any given time, the system is in a single, defined state. When it recieves an event, assuming that event is supported in the current state, it will undergo a transition to another state.

Stickler provides a simple mechanisms for implementing any part of your system as an FSM.

## Usage
The core of a Stickler FSM is states and actions. States are a finite set of conditions that our system can be in, and Actions are a finite set of events that cause us to change state.

For example, let's say our application maintains a connection to a server. While connected, we may receive data from the server (to send to our app), and data from our app (to send to the server). We could use these states and actions to represent this.

```ts
enum States {
  DISCONNECTED,
  CONNECTED
}

enum Actions {
  CONNECT,
  DISCONNECT,
  DATA_APP,
  DATA_SERVER
}
```

### Basic Idea
In Stickler, developing a state machine looks like this.
1. Create a StateMachine, specifying each of our states as a key.
2. For each state, specify the responses (transitions) to a set of actions.
    - Every state does not have to handle every action.
    - Actions can be asynchronous and have side effects.
    - Actions return the next state for the machine.
3. Anywhere in your code, including inside transitions, call `pushAction(action, data)` to queue another action.
    - This will **not** be executed immediately. 

Stickler guarantees that actions will be processed in order, and one at a time.

### Simple Example
Now, let's implement a simple state machine around the situation we described above. 
```ts
import { StateMachine } from "stickler";

const sm = new StateMachine<State, Actions>({
  [States.DISCONNECTED]: {
    [Actions.CONNECT]: async () => {
      await connect({
        onData: d => sm.pushAction(Actions.DATA_SERVER, d)
      });
      return States.CONNECTED;
    }
  },
  [States.CONNECTED]: {
    [Actions.DISCONNECT]: async () => {
      return States.DISCONNECTED;
    },
    [Actions.DATA_SERVER]: (data) => {
      app.send(data);
      return States.CONNECTED;
    },
    [Actions.DATA_APP]: async (data) => {
      server.send(data);
      return States.CONNECTED;
    }
  }
});

sm.start();
```

### Benefits
While this is a simple example, we get the following benefits.
1. Decouple events from state and validation.
2. Decouple the code that generates an event, from the code that handles it.
3. Maintain the system in a single well defined state at every moment in time.
4. Enable debuggability by tracking every state and transition (TODO), without manual logging.
