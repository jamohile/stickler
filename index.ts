// A single transition handler.
// This will be invoked when a particular state sees a particular action,
// and is responsible for transitioning to a new state.
// It is allowed to invoke side effects during that process.
type Transition<D, S> = (data: D) => (S | Promise<S>);

// For a given state, a transition map defines the transition handler invoked for each action.
type TransitionMap<A extends number, S> = Partial<Record<A, Transition<any, S>>>;

// A state map defines all of the states, and their actions/handlers.
type StateMap<S extends number, A extends number> = Record<S, TransitionMap<A, S>>;

/**
 * The state manager runs an FSM.
 * It tracks state and handles transitions.
 * 
 * @param {Enum} S Possible states.
 * @param {Enum} A Possible actions.
 */
class StateManager<S extends number, A extends number> {
  private states: StateMap<S, A>;

  constructor(states: StateMap<S, A>, initialState: S) {
    this.states = states;
  }

  /** Return the current state. */
  public getCurrentState(): S {}

  /** Push an action onto the queue. */
  public pushAction(action: A, data: any): void {}

  /** Start the state machine. */
  public start(): void {}

  /** Stop the state machine. */
  public stop(): void {}
}