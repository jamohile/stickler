import { StateManager } from "./index";

// A utility method to let us sleep for a bit.
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("basic state transitions", () => {
  it("starts in correct state.", async () => {
    enum states {
      S1,
      S2,
    }
    enum actions {
      A1,
      A2,
    }

    const s = new StateManager<states, actions>(
      {
        [states.S1]: {},
        [states.S2]: {},
      },
      states.S1
    );

    expect(s.getCurrentState()).toBe(states.S1);
  });

  it("correct handles a transition.", async () => {
    enum states {
      S1,
      S2,
    }
    enum actions {
      A1,
    }

    const s = new StateManager<states, actions>(
      {
        [states.S1]: {
          [actions.A1]: () => states.S2,
        },
        [states.S2]: {},
      },
      states.S1
    );

    // Run for a bit, and ensure we are still in original state.
    s.start();

    await sleep(100);
    await s.stop();
    expect(s.getCurrentState()).toBe(states.S1);


    // Now, issue our new action, and expect a transition.
    s.start();
    s.pushAction(actions.A1);
    await sleep(100);
    await s.stop();
    expect(s.getCurrentState()).toBe(states.S2);
  });
});
