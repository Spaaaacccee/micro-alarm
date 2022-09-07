const state = {
  calibration: { h: 0 },
  date: { h: 0, m: 0, s: 0 },
  calibrated: false,
};

bluetooth.startUartService();

bluetooth.onUartDataReceived(",", () => {
  const c = bluetooth.uartReadUntil(",");
  const [e, v] = c.split(":");
  switch (e) {
    case "s":
      {
        const [h, m, s] = v.split("-").map((i) => parseInt(i));
        timeanddate.set24HourTime(h, m, s);
        bluetooth.uartWriteString(
          `s1:${state.date.h}-${state.date.m}-${state.date.s}`
        );
        state.calibrated = true;
      }
      break;
    case "s1":
      {
        const [h, m, s] = v.split("-").map((i) => parseInt(i));
        state.date = { h, m, s };
        bluetooth.uartWriteString(`s1:${h}-${m}-${s}`);
      }
      break;
    case "c":
      {
        p(Note.C5, 200, 10);
        p(Note.G5, 200, 10);
      }
      break;
    case "d":
      {
        p(Note.G5, 200, 10);
        p(Note.C5, 200, 10);
      }
      break;
  }
});

function p(
  note: Note,
  duration: number,
  slope: number = 4,
  samples: number = 10
) {
  for (let v = 255; v > 255 - (duration / samples) * slope; v -= slope) {
    music.setVolume(v);
    music.playTone(note, samples);
  }
}

const playbackState = {
  playing: false,
  i: 0,
};

input.onGesture(Gesture.ThreeG, () => {
  bluetooth.uartWriteString(`m:0`);
  playbackState.playing = false;
  playbackState.i = 0;
});

/**
 * Canon in C
 */
const notes = [
  // C
  Note.C4,
  Note.E4,
  Note.A4,
  Note.C5,
  // G
  Note.B3,
  Note.D4,
  Note.A4,
  Note.B4,
  // Am
  Note.A3,
  Note.E4,
  Note.A4,
  Note.C5,
  // Em
  Note.B3,
  Note.E4,
  Note.G4,
  Note.B4,
  // F
  Note.C4,
  Note.F4,
  Note.A4,
  Note.C5,
  // C
  Note.C4,
  Note.E4,
  Note.A4,
  Note.C5,
  // F
  Note.C4,
  Note.F4,
  Note.A4,
  Note.C5,
  // G
  Note.D4,
  Note.G4,
  Note.B4,
  Note.D5,
];

timeanddate.onMinuteChanged(() => {
  timeanddate.numericTime((h, m) => {
    if (
      h === state.date.h &&
      m === state.date.m &&
      state.calibrated &&
      !playbackState.playing
    ) {
      playbackState.playing = true;
      bluetooth.uartWriteString(`m:1`);
    }
  });
});

loops.everyInterval(300, () => {
  if (playbackState.playing) {
    p(notes[playbackState.i % notes.length], 300);
    playbackState.i++;
  }
});

input.onButtonPressed(Button.A, () => {
  playbackState.playing = true;
  bluetooth.uartWriteString(`m:1`);
});
