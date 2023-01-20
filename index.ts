// A single transition handler.
// This will be invoked when a particular state sees a particular action,
// and is responsible for transitioning to a new state.
// It is allowed to invoke side effects during that process.
type Transition<D, S> = (data: D) => S | Promise<S>;

// For a given state, a transition map defines the transition handler invoked for each action.
type TransitionMap<A extends number, S> = Partial<
  Record<A, Transition<any, S>>
>;

// A state map defines all of the states, and their actions/handlers.
type StateMap<S extends number, A extends number> = Record<
  S,
  TransitionMap<A, S>
>;

/**
 * The state manager runs an FSM.
 * It tracks state and handles transitions.
 *
 * @param {Enum} S Possible states.
 * @param {Enum} A Possible actions.
 */
export class StateManager<S extends number, A extends number> {
  private states: StateMap<S, A>;
  private currentState: S;
  private actionQueue: { action: A; data: any }[] = [];

  private running: boolean = false;
  private stopCallback?: () => void = undefined;
  private queuedProcessing?: NodeJS.Timeout = undefined;

  constructor(states: StateMap<S, A>, initialState: S) {
    this.states = states;
    this.currentState = initialState;
  }

  /** Return the current state. */
  public getCurrentState(): S {
    return this.currentState;
  }

  /** Push an action onto the queue. */
  public pushAction(action: A, data: any = undefined): void {
    this.actionQueue.push({ action, data });
    if (this.running) {
      this.queueProcessing();
    }
  }

  /** Start the state machine. */
  public async start(): Promise<void> {
    this.running = true;
    this.queueProcessing();
  }

  /** Run a single pass of the state machine. */
  private async process(): Promise<void> {
    // If there are actions queued, execute them.
    const action = this.actionQueue.shift();
    if (!action) {
      return;
    }

    // We only execute a transition if the state we are in transitions from this action.
    const transition = this.states[this.currentState][action.action];
    if (!transition) {
      return;
    }

    this.currentState = await transition(action.data);
  }

  private queueProcessing(): void {
    if (this.queuedProcessing) {
      return;
    }

    setTimeout(async () => {
      this.queuedProcessing = undefined;
      // If a stop was requested at some point during this execution,
      // Stop immediately without considering other actions.
      if (this.stopCallback) {
        this.stopCallback();
        this.stopCallback = undefined;
        return;
      }

      await this.process();

      // It is only worth queuing more processing if there are backlogged actions.
      // In the event one is added while paused, it will be handled separately.
      if (!this.actionQueue.length) {
        return;
      }

      this.queueProcessing();
    }, 0);
  }

  /**
   * Stop the state machine.
   * Returns when the machine actually stops,
   * Since any in-progress transition will be allowed to complete.
   * */
  public async stop(): Promise<void> {
    this.running = false;
    return new Promise((resolve) => {
      this.stopCallback = resolve;
      this.queueProcessing();
    });
  }
}
