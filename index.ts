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
  private currentState: S;
  private actionQueue: {action: A, data: any}[];
  private running: boolean = false;

  constructor(states: StateMap<S, A>, initialState: S) {
    this.states = states;
    this.currentState = initialState;
  }

  /** Return the current state. */
  public getCurrentState(): S {
    return this.currentState;
  }

  /** Push an action onto the queue. */
  public pushAction(action: A, data: any): void {}

  /** Start the state machine. */
  public async start(): Promise<void> {
    // TODO: replace with a non-polling solution.
    while (true) {
      // If the state machine has been stopped externally, ignore anything else.
      if (!this.running) {
        return;
      }

      // If there are actions queued, execute them.
      const action = this.actionQueue.shift();
      if (!action) {
        continue;
      }

      // We only execute a transition if the state we are in transitions from this action.
      const transition = this.states[this.currentState][action.action];
      if (!transition) {
        continue;
      }
      this.currentState = await transition(action.data);
    }
  }

  /** Stop the state machine. */
  public stop(): void {
    this.running = false;
  }
}