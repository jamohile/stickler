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

enum StateManagerStatus {
  /** The state machine is not running. */
  STOPPED,
  /** The state machine is currently running and processing states. */
  RUNNING,
  /** The state machine has been requested to stop, but has not yet stopped. */
  STOP_PENDING,
}

/**
 * The state manager runs an FSM.
 * It tracks state and handles transitions.
 *
 * @param {Enum} S Possible states.
 * @param {Enum} A Possible actions.
 */
export class StateManager<S extends number, A extends number> {
  // A specification of states, actions, and transitions that this manager will execute.
  private states: StateMap<S, A>;
  private currentState: S;

  // Buffered, unprocessed actions.
  private actionQueue: { action: A; data: any }[] = [];

  // Whether the state machine is currently running.
  // If it is not, then actions will be added but not processed.
  private status: StateManagerStatus = StateManagerStatus.STOPPED;

  // If a stop is requested, the manager won't actually stop until the current transition is complete.
  // This callback lets us defer that event.
  // If our status is STOP_PENDING, this is gauranteed to exist. (if only TS had enum-properties like rust)
  private stopCallback?: () => void = undefined;

  // A pointer to the next execution callback, if it exists.
  // Each execution runs one step of the FSM.
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
    if (this.status == StateManagerStatus.RUNNING) {
      this.queueProcessing();
    }
  }

  /** Start the state machine. */
  public async start(): Promise<void> {
    if (this.status == StateManagerStatus.STOPPED) {
      this.status = StateManagerStatus.RUNNING;
      this.queueProcessing();
    }
  }

  /**
   * Stop the state machine.
   * Returns when the machine actually stops,
   * Since any in-progress transition will be allowed to complete.
   * */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.status = StateManagerStatus.STOP_PENDING;
      this.stopCallback = resolve;
      this.queueProcessing();
    });
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

  /**
   * Queue a unit of processing.
   * When the unit executes, it will run a single step of the FSM, if conditions allow.
   */
  private queueProcessing(): void {
    // If there is already a processing run coming, don't add another one.
    if (this.queuedProcessing) {
      return;
    }

    // Create a deferred processing run.
    // We defer to allow the user's own tasks to run concurrently with the state machine.
    // This will execute immediately, but unlike a while loop, won't block the main thread.
    setTimeout(async () => {
      this.queuedProcessing = undefined;

      // If a stop was requested at some point during this execution,
      // Stop immediately without considering other actions.
      if (this.status == StateManagerStatus.STOP_PENDING) {
        this.status = StateManagerStatus.STOPPED;
        this.stopCallback!();
        this.stopCallback = undefined;
        return;
      }

      await this.process();

      // It is only worth queuing more processing if there are backlogged actions.
      // In the event one is added while not, it will be handled separately.
      if (!this.actionQueue.length) {
        return;
      }

      // We are running, and there are more actions to process.
      // Keep going.
      this.queueProcessing();
    }, 0);
  }
}
