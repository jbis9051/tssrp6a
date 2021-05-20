var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { modPow } = _import_1(globalThis["bigintModArith"], ["modPow"], "bigint-mod-arith", "globalThis.bigintModArith", false);
// Variable names match the RFC (I, IH, S, b, B, salt, b, A, M1, M2...)
export class SRPServerSession {
    constructor(routines) {
        this.routines = routines;
    }
    step1(
    /**
     * User identity
     */
    identifier, 
    /**
     * User salt
     */
    salt, 
    /**
     * User verifier
     */
    verifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const b = this.routines.generatePrivateValue();
            const k = yield this.routines.computeK();
            const B = computeServerPublicValue(this.routines.parameters, k, verifier, b);
            return new SRPServerSessionStep1(this.routines, identifier, salt, verifier, b, B);
        });
    }
}
class SRPServerSessionStep1 {
    constructor(routines, 
    /**
     * User identity
     */
    identifier, 
    /**
     * User salt
     */
    salt, 
    /**
     * User verifier
     */
    verifier, 
    /**
     * Server private key "b"
     */
    b, 
    /**
     * Serve public key "B"
     */
    B) {
        this.routines = routines;
        this.identifier = identifier;
        this.salt = salt;
        this.verifier = verifier;
        this.b = b;
        this.B = B;
    }
    /**
     * Compute the session key "S" without computing or checking client evidence
     */
    sessionKey(
    /**
     * Client public key "A"
     */
    A) {
        return __awaiter(this, void 0, void 0, function* () {
            if (A === null) {
                throw new Error("Client public value (A) must not be null");
            }
            if (!this.routines.isValidPublicValue(A)) {
                throw new Error(`Invalid Client public value (A): ${A.toString(16)}`);
            }
            const u = yield this.routines.computeU(A, this.B);
            const S = computeServerSessionKey(this.routines.parameters.primeGroup.N, this.verifier, u, A, this.b);
            return S;
        });
    }
    step2(
    /**
     * Client public key "A"
     */
    A, 
    /**
     * Client message "M1"
     */
    M1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!M1) {
                throw new Error("Client evidence (M1) must not be null");
            }
            const S = yield this.sessionKey(A);
            const computedM1 = yield this.routines.computeClientEvidence(this.identifier, this.salt, A, this.B, S);
            if (computedM1 !== M1) {
                throw new Error("Bad client credentials");
            }
            const M2 = this.routines.computeServerEvidence(A, M1, S);
            return M2;
        });
    }
}
const computeServerPublicValue = (parameters, k, v, b) => {
    return ((modPow(parameters.primeGroup.g, b, parameters.primeGroup.N) + v * k) %
        parameters.primeGroup.N);
};
const computeServerSessionKey = (N, v, u, A, b) => {
    return modPow(modPow(v, u, N) * A, b, N);
};
import { _import as _import_1 } from "https://cdn.jsdelivr.net/npm/@magic-works/ttypescript-browser-like-import-transformer@3.0.0/es/ttsclib.min.js";
//# sourceMappingURL=session-server.js.map