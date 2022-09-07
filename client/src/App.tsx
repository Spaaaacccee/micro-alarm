import {
  BluetoothConnectedOutlined,
  BluetoothOutlined,
} from "@mui/icons-material";
import {
  Button,
  createTheme,
  CssBaseline,
  Input,
  Stack,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import * as uBit from "microbit-web-bluetooth";
import { useState } from "react";
import "./App.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      paper: "#282a2e",
      default: "#1f2125",
    },
  },
  typography: {
    allVariants: {
      fontFamily: "Inter, Helvetica, Arial, sans-serif",
    },
    button: {
      textTransform: "none",
    },
  },
});

type Device = {
  services: uBit.Services;
  bluetooth: BluetoothDevice;
  disconnect: () => void;
};

type Time = {
  h: number;
  m: number;
  s: number;
};

function toTime(t: Dayjs) {
  return {
    h: t.hour(),
    m: t.minute(),
    s: t.second(),
  };
}

function toDayJs({ h, m, s }: Time) {
  return dayjs()
    .startOf("day")
    .add(h, "hour")
    .add(m, "minute")
    .add(s, "second");
}

function App() {
  const [device, setDevice] = useState<Device | undefined>(undefined);
  const [time, setTime] = useState<Time | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  async function connect() {
    if (window.navigator["bluetooth"]) {
      const m1 = await uBit.requestMicrobit(window.navigator.bluetooth);
      if (!m1) throw new Error("No device");
      const services = await uBit.getServices(m1);
      await services.uartService?.sendText("c,");
      // Sync
      await services.uartService?.sendText(`s:${dayjs().format("H-m-s")},`);
      const receive = ({ detail }: any) => {
        const [e, v] = detail.split(":");
        switch (e) {
          case "s1":
            const [h, m, s] = v.split("-").map((i: string) => parseInt(i));
            setTime({ h, m, s });
            break;
          case "m":
            setPlaying(v === "1");
        }
      };
      services.uartService?.on("receiveText", receive);
      return {
        bluetooth: m1,
        services,
        disconnect: () => {
          services.uartService?.removeListener("receiveText", receive);
        },
      };
    }
  }

  async function disconnect() {
    send("d");
    device?.bluetooth?.forget?.();
    setPlaying(false);
    setDevice(undefined);
  }

  async function send(s: string) {
    await device?.services?.uartService?.sendText(`${s},`);
  }

  const ready = !!device && time;

  const CLOCK_SIZE = "min(120vw, 50vh)";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack
            height="100vh"
            direction="column"
            gap={4}
            alignItems="center"
            justifyContent="center"
          >
            <Button
              color={playing ? "error" : "primary"}
              disabled={!device}
              onClick={() => setOpen(true)}
              sx={(t) => ({
                height: CLOCK_SIZE,
                width: CLOCK_SIZE,
                borderRadius: CLOCK_SIZE,
                background: t.palette.background.paper,
              })}
            >
              <Typography variant="h1">
                {ready ? toDayJs(time).format("hh:mm") : "00:00"}
                <Typography variant="overline" fontSize="2rem">
                  {` ${ready ? toDayJs(time).format("a") : "am"}`}
                </Typography>
              </Typography>
            </Button>
            <Button
              startIcon={
                ready ? <BluetoothConnectedOutlined /> : <BluetoothOutlined />
              }
              onClick={async () => {
                if (!device) {
                  try {
                    setDevice(await connect());
                  } catch (e) {
                    console.error(e);
                  }
                } else {
                  disconnect();
                }
              }}
            >
              {device ? "Disconnect" : "Connect to micro:bit"}
            </Button>
            <TimePicker
              onClose={() => setOpen(false)}
              label="Time"
              value={time ? toDayJs(time) : dayjs()}
              onChange={(e) => {
                if (e) {
                  setTime(toTime(e));
                  send(`s1:${e.format("H-m-s")}`);
                }
              }}
              open={open}
              renderInput={() => <Input sx={{ display: "none" }} />}
            />
          </Stack>
        </LocalizationProvider>
      </CssBaseline>
    </ThemeProvider>
  );
}

export default App;
