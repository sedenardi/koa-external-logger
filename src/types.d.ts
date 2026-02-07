declare module 'passthrough-counter' {
  import { Transform } from 'stream';

  interface CounterStream extends Transform {
    length: number;
  }

  function Counter (): CounterStream;

  export = Counter;
}

declare module 'humanize-number' {
  function humanize (value: number | string): string;
  export = humanize;
}
