import { SRPRoutines } from "./routines";
export declare class SRPClientSession {
    private readonly routines;
    constructor(routines: SRPRoutines);
    step1(
    /**
     * User identity
     */
    userId: string, 
    /**
     * User password (not kept in state)
     */
    userPassword: string): Promise<SRPClientSessionStep1>;
}
declare class SRPClientSessionStep1 {
    private readonly routines;
    /**
     * User identity
     */
    private readonly I;
    /**
     * User identity/password hash
     */
    readonly IH: ArrayBuffer;
    constructor(routines: SRPRoutines, 
    /**
     * User identity
     */
    I: string, 
    /**
     * User identity/password hash
     */
    IH: ArrayBuffer);
    step2(
    /**
     * Some generated salt (see createVerifierAndSalt)
     */
    salt: bigint, 
    /**
     * Server public key "B"
     */
    B: bigint): Promise<SRPClientSessionStep2>;
}
declare class SRPClientSessionStep2 {
    private readonly routines;
    /**
     * Client public value "A"
     */
    readonly A: bigint;
    /**
     * Client evidence message "M1"
     */
    readonly M1: bigint;
    /**
     * Shared session key "S"
     */
    readonly S: bigint;
    constructor(routines: SRPRoutines, 
    /**
     * Client public value "A"
     */
    A: bigint, 
    /**
     * Client evidence message "M1"
     */
    M1: bigint, 
    /**
     * Shared session key "S"
     */
    S: bigint);
    step3(M2: bigint): Promise<void>;
}
export {};
