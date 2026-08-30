import { createInterface } from 'readline';

// Control codes, built numerically so the source stays free of raw control
// characters: end-of-transmission, interrupt, and delete.
const CTRL_D = String.fromCharCode(4);
const CTRL_C = String.fromCharCode(3);
const BACKSPACE = String.fromCharCode(127);

/** Asks a question and returns the trimmed answer. */
export function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve =>
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

/**
 * Asks for a password without echoing it to the terminal.
 *
 * The password never reaches argv, so it stays out of shell history and out
 * of the process list, and it is never written to disk in plaintext.
 */
export function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(
        new Error(
          'A TTY is required to enter a password. Run this command in an interactive terminal.',
        ),
      );
      return;
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';

    function onData(chunk: string) {
      let outcome: 'submit' | 'cancel' | undefined;

      for (const char of chunk) {
        if (char === '\n' || char === '\r' || char === CTRL_D) {
          outcome = 'submit';
          break;
        }
        if (char === CTRL_C) {
          outcome = 'cancel';
          break;
        }
        if (char === BACKSPACE || char === '\b') {
          value = value.slice(0, -1);
        } else if (char >= ' ') {
          value += char;
        }
      }

      if (!outcome) {
        return;
      }

      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');

      if (outcome === 'submit') {
        resolve(value);
      } else {
        reject(new Error('Cancelled'));
      }
    }

    stdin.on('data', onData);
  });
}
