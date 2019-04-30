/* eslint-disable no-fallthrough */
import { BigInteger } from "jsbn";
import { range } from "ramda";
import { test } from "../../../test/util";
import { SRPConfig } from "../config";
import { SRPParameters } from "../parameters";
import { SRPRoutines } from "../routines";
import { SRPSession } from "../session";
import { SRPClientSession } from "../session-client";
import { SRPServerSession } from "../session-server";
import {
  bigIntegerToWordArray,
  createVerifier,
  generateRandomBigInteger,
  generateRandomString,
  hash,
  wordArrayToBigInteger,
} from "../utils";

const TestConfig = new SRPConfig(
  new SRPParameters(),
  (p) => new SRPRoutines(p),
);

class TestSRPSession extends SRPSession {
  constructor(timeoutMillis?: number) {
    super(TestConfig, timeoutMillis);
  }
}

test('#SRPSession canary for password that is "uneven" as hex string', (t) => {
  t.plan(2);
  const testUsername = "peppapig";
  const testPassword = "edge00044bc49a26"; // problematic as reported by https://midobugs.atlassian.net/browse/ISS-325

  // salt is generated during signup, and sent to client.step2
  const salt = new BigInteger("99830900279124036031422484022515311814");

  // verifier is generated during signup, and read from storage to server.step1
  const verifier = createVerifier(TestConfig, testUsername, salt, testPassword);

  const verifierExpected = new BigInteger(
    "178562055003946915616288416183950560880175291647374906172196005828739793423130057138448557472796429057819212014" +
      "4114935584475633589713081017567690708669637848379136792476825170841578549100791737447582125876753901554573933" +
      "8667640603805500045440488046479293037121037880926546495644470644370531564026094560765922188514892916676817675" +
      "1700937138435898497110083289317944474559572995934674830428142920649062311891412787734495424754159472009938334" +
      "3222059032274510862728323448600730355383444838443223455907492540308650768601338619602737301031438936911752125" +
      "3184029489262122079238259800200292396832028759867302637151706175160538",
  );
  t.true(verifier.equals(verifierExpected));

  const serverSession = new SRPServerSession(TestConfig);
  // server gets identifier from client, salt+verifier from db (from signup)
  const B = serverSession.step1(testUsername, salt, verifier);

  const clientSession = new SRPClientSession(TestConfig);
  clientSession.step1(testUsername, testPassword);
  const { A, M1 } = clientSession.step2(salt, B);

  const M2 = serverSession.step2(A, M1);
  clientSession.step3(M2);
  t.pass("Canary test passes");
});

/**
 * Preconditions:
 * * Server has 'v' and 's' in storage associated with 'I'
 * Step 1:
 * * User --(I, P)--> Client
 * * Client --(I)--> Server
 * * Server calculates 'B' and retrieves 's'
 * * Client <--(B, s)-- Server
 * Step 2:
 * * Client calculates 'A' and 'M1'
 * * Client --(A, M1)--> Server
 * * Server validates client using 'A' and 'M1' and calculates 'M2'
 * * Client <--(M2)-- Server
 * Step 3:
 * * Client validates server using 'M2'
 */
test("#SRPSession success", (t) => {
  const TEST_COUNT = 20;
  t.plan(TEST_COUNT);
  range(0, TEST_COUNT).forEach((i) => {
    const testUsername = generateRandomString(10);
    const testPassword = generateRandomString(15);

    // salt is generated during signup, and sent to client.step2
    const salt = TestConfig.routines.generateRandomSalt(16);

    // verifier is generated during signup, and read from storage to server.step1
    const verifier = createVerifier(
      TestConfig,
      testUsername,
      salt,
      testPassword,
    );

    const serverSession = new SRPServerSession(TestConfig);
    // server gets identifier from client, salt+verifier from db (from signup)
    const B = serverSession.step1(testUsername, salt, verifier);

    const clientSession = new SRPClientSession(TestConfig);
    clientSession.step1(testUsername, testPassword);
    const { A, M1 } = clientSession.step2(salt, B);

    const M2 = serverSession.step2(A, M1);
    clientSession.step3(M2);
    t.pass(
      `Random test #${i} user:${testUsername}, password:${testPassword}, salt: ${salt}`,
    );
  });
});

test("error - wrong password", (t) => {
  t.plan(1);
  const testUsername = generateRandomString(10);
  const testPassword = generateRandomString(15);
  const diffPassword = `${testPassword}-diff`;

  const routines = TestConfig.routines;

  const salt = routines.generateRandomSalt(16);

  const verifier = createVerifier(TestConfig, testUsername, salt, testPassword);

  const serverSession = new SRPServerSession(TestConfig);
  const B = serverSession.step1(testUsername, salt, verifier);

  const clientSession = new SRPClientSession(TestConfig);
  clientSession.step1(testUsername, diffPassword);
  const { A, M1 } = clientSession.step2(salt, B);

  t.throws(() => {
    serverSession.step2(A, M1);
  }, /bad client credentials/i);
});

test("error - not in step 1", (t) => {
  t.plan(1);

  const serverSession = new SRPServerSession(TestConfig);

  t.throws(() => {
    serverSession.step2(BigInteger.ONE, BigInteger.ONE);
  }, /step2 not from step1/i);
});

test('error - not in step "init"', (t) => {
  t.plan(1);
  const testUsername = generateRandomString(10);
  const testPassword = generateRandomString(15);

  const routines = TestConfig.routines;

  const salt = routines.generateRandomSalt(16);

  const verifier = createVerifier(TestConfig, testUsername, salt, testPassword);

  const serverSession = new SRPServerSession(TestConfig);
  serverSession.step1(testUsername, salt, verifier);

  t.throws(() => {
    serverSession.step1(testUsername, salt, verifier);
  }, /step1 not from init/i);
});

test("error - bad/empty A or M1", (t) => {
  t.plan(5);

  const someBigInteger = generateRandomBigInteger();

  t.throws(() => {
    const serverSession = new SRPServerSession(TestConfig);
    serverSession.step1("pepi", someBigInteger, someBigInteger);
    serverSession.step2(null!, BigInteger.ONE);
  }, /Client public value \(A\) must not be null/i);
  t.throws(() => {
    const serverSession = new SRPServerSession(TestConfig);
    serverSession.step1("pepi", someBigInteger, someBigInteger);
    serverSession.step2(null as any, someBigInteger);
  }, /Client public value \(A\) must not be null/i);
  t.throws(() => {
    const serverSession = new SRPServerSession(TestConfig);
    serverSession.step1("pepi", someBigInteger, someBigInteger);
    serverSession.step2(someBigInteger, null!);
  }, /Client evidence \(M1\) must not be null/i);
  t.throws(() => {
    const serverSession = new SRPServerSession(TestConfig);
    serverSession.step1("pepi", someBigInteger, someBigInteger);
    serverSession.step2(someBigInteger, null as any);
  }, /Client evidence \(M1\) must not be null/i);
  t.throws(() => {
    const serverSession = new SRPServerSession(TestConfig);
    serverSession.step1("pepi", someBigInteger, someBigInteger);
    serverSession.step2(BigInteger.ZERO, someBigInteger);
  }, /Invalid Client public value \(A\): /i);
});

test("#SRPSessionGetters success (set values)", (t) => {
  const session = new TestSRPSession();

  session.S = generateRandomBigInteger();

  t.doesNotThrow(() => session.S);
  t.equals(session.sharedKey, session.S);
  t.true(
    session.hashedSharedKey.equals(
      wordArrayToBigInteger(
        hash(session.config.parameters, bigIntegerToWordArray(session.S)),
      ),
    ),
  );
  t.end();
});

test("#SRPSessionGetters failure (not-set values)", (t) => {
  const session = new TestSRPSession();

  t.throws(() => session.S, /shared key.*not set/i);
  t.end();
});

test("#SRPSessionSetters success (not set yet)", (t) => {
  const session = new TestSRPSession();

  const S = generateRandomBigInteger();

  t.doesNotThrow(() => {
    session.S = S;
  });
  t.end();
});

test("#SRPSessionSetters failure (already set)", (t) => {
  const session = new TestSRPSession();

  const S = generateRandomBigInteger();

  session.S = S;

  t.throws(() => {
    session.S = S;
  }, /shared key.*already set/i);
  t.end();
});
