/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Buffer } from 'buffer';

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    globalThis.Buffer = globalThis.Buffer || Buffer;
  }
});
