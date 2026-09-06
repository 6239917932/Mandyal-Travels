import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { connect, type TLSSocket } from 'node:tls';

type SmtpMessage = { from: string; html: string; subject: string; text: string; to: string };

function rejectHeaderInjection(value: string) {
  if (!value || /[\r\n]/.test(value)) throw new Error('SMTP_HEADER_INVALID');
  return value;
}

function mailbox(value: string) {
  const match = value.match(/<([^<>]+)>\s*$/);
  const address = (match?.[1] ?? value).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('SMTP_MAILBOX_INVALID');
  return address;
}

function createReader(socket: TLSSocket) {
  let buffer = '';
  const waiters: Array<() => void> = [];
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (waiters.length) waiters.shift()?.();
  });
  return async function readResponse() {
    while (true) {
      const lines = buffer.split('\r\n');
      const completeLines = lines.slice(0, -1);
      const finalIndex = completeLines.findIndex((line) => /^\d{3} /.test(line));
      if (finalIndex >= 0) {
        const responseLines = completeLines.slice(0, finalIndex + 1);
        buffer = `${completeLines.slice(finalIndex + 1).join('\r\n')}${lines.at(-1) ? `\r\n${lines.at(-1)}` : ''}`;
        return { code: Number(responseLines.at(-1)?.slice(0, 3)), text: responseLines.join('\n') };
      }
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('SMTP_RESPONSE_TIMEOUT')), 10_000);
        waiters.push(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  };
}

function expect(response: { code: number; text: string }, codes: number[]) {
  if (!codes.includes(response.code)) throw new Error(`SMTP_REJECTED_${response.code}`);
}

function body(message: SmtpMessage) {
  const boundary = `mandyal-${randomBytes(12).toString('hex')}`;
  const headers = [
    `From: ${rejectHeaderInjection(message.from)}`,
    `To: ${rejectHeaderInjection(message.to)}`,
    `Subject: ${rejectHeaderInjection(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(16).toString('hex')}@mandyaltravels.com>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const content = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    `--${boundary}--`,
  ]
    .join('\r\n')
    .replace(/\r?\n/g, '\r\n')
    .replace(/(^|\r\n)\./g, '$1..');
  return `${content}\r\n.\r\n`;
}

export async function sendTlsSmtpMessage(input: {
  host: string;
  password: string;
  port: number;
  user: string;
  message: SmtpMessage;
}) {
  const socket = connect({
    host: input.host,
    minVersion: 'TLSv1.2',
    port: input.port,
    rejectUnauthorized: true,
    servername: input.host,
  });
  socket.setTimeout(10_000, () => socket.destroy(new Error('SMTP_SOCKET_TIMEOUT')));
  try {
    await once(socket, 'secureConnect');
    const read = createReader(socket);
    const command = async (value: string, expected: number[]) => {
      socket.write(`${value}\r\n`);
      const response = await read();
      expect(response, expected);
    };
    expect(await read(), [220]);
    await command('EHLO mandyaltravels.com', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(input.user).toString('base64'), [334]);
    await command(Buffer.from(input.password).toString('base64'), [235]);
    await command(`MAIL FROM:<${mailbox(input.message.from)}>`, [250]);
    await command(`RCPT TO:<${mailbox(input.message.to)}>`, [250, 251]);
    await command('DATA', [354]);
    socket.write(body(input.message));
    expect(await read(), [250]);
    socket.write('QUIT\r\n');
    return { providerMessageId: randomBytes(16).toString('hex') };
  } finally {
    socket.destroy();
  }
}
