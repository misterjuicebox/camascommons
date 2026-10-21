// Sets the password for the dev site (dev.camascommons.org).
//
//   npm run set-dev-password
//
// Asks for the new password twice with hidden typing, then writes only a random salt,
// a slow salted hash (PBKDF2) and a cookie check into functions/_middleware.js. The
// password itself is never printed, saved to a file or put in the (public) repo.
// Changing it signs out every browser that saved the old one.
import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE = 'functions/_middleware.js';
const ITERATIONS = 10000; // must match PBKDF2_ITERATIONS in the middleware
const MIN_LENGTH = 12;

// Shows the prompt, then reads keys directly so nothing typed or pasted is shown
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    let typed = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.off('data', onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(typed);
          return;
        }
        if (ch === '\u0003') {
          // Ctrl+C
          process.stdout.write('\nCancelled. Nothing was changed.\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          typed = typed.slice(0, -1);
          continue;
        }
        if (ch >= ' ') typed += ch;
      }
    };
    stdin.on('data', onData);
  });
}

if (!process.stdin.isTTY) {
  console.error('Run this in a terminal: npm run set-dev-password');
  process.exit(1);
}

const password = await askHidden('New dev site password (hidden): ');
if (password.length < MIN_LENGTH) {
  console.error(`Use at least ${MIN_LENGTH} characters. A few unrelated words works well. Nothing was changed.`);
  process.exit(1);
}
const again = await askHidden('Type it again: ');
if (again !== password) {
  console.error("The two passwords didn't match. Nothing was changed.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const cookieCheck = sha256(sha256(`cookie:${salt}:${password}`));

let source = fs.readFileSync(FILE, 'utf8');
const set = (name, value) => {
  const pattern = new RegExp(`const ${name} = '[0-9a-f]+';`);
  if (!pattern.test(source)) throw new Error(`Couldn't find ${name} in ${FILE}`);
  source = source.replace(pattern, `const ${name} = '${value}';`);
};
set('DEV_PASSWORD_SALT', salt);
set('DEV_PASSWORD_PBKDF2', hash);
set('DEV_COOKIE_CHECK', cookieCheck);
fs.writeFileSync(FILE, source);

// Remove the old generated-password note, if it's still around
if (fs.existsSync('.env.dev-password')) fs.unlinkSync('.env.dev-password');

console.log(`Done. ${FILE} now holds a salted hash of your new password (not the password).`);
console.log('To use it on dev.camascommons.org, commit and push:');
console.log(`  git add ${FILE} && git commit -m "Change dev site password" && git push origin dev`);
