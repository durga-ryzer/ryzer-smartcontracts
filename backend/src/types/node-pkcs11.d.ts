declare module 'node-pkcs11' {
  export class PKCS11 {
    constructor();
    load(libraryPath: string): void;
    C_Initialize(): void;
    C_Finalize(): void;
    C_GetSlotList(tokenPresent: boolean): number[];
    C_OpenSession(slotId: number, flags: number): Session;
    C_CloseSession(session: Session): void;
    C_Login(session: Session, userType: number, pin: string): void;
    C_Logout(session: Session): void;
    C_FindObjectsInit(session: Session, template: any[]): void;
    C_FindObjects(session: Session): any;
    C_FindObjectsFinal(session: Session): void;
    C_GetAttributeValue(session: Session, object: any, template: any[]): any[];
    C_GenerateKeyPair(session: Session, mechanism: any, publicKeyTemplate: any[], privateKeyTemplate: any[]): [any, any];
    C_Sign(session: Session, keyHandle: any, mechanism: any, data: Buffer): Buffer;
    C_DestroyObject(session: Session, object: any): void;
  }

  export interface Session {
    handle: number;
  }

  // Constants
  export const CKF_RW_SESSION: number;
  export const CKF_SERIAL_SESSION: number;
  export const CKU_USER: number;
  export const CKO_PUBLIC_KEY: number;
  export const CKO_PRIVATE_KEY: number;
  export const CKA_CLASS: number;
  export const CKA_KEY_TYPE: number;
  export const CKA_LABEL: number;
  export const CKA_ID: number;
  export const CKA_TOKEN: number;
  export const CKA_PRIVATE: number;
  export const CKA_SIGN: number;
  export const CKA_VERIFY: number;
  export const CKA_EC_PARAMS: number;
  export const CKA_EC_POINT: number;
  export const CKA_MODULUS: number;
  export const CKA_MODULUS_BITS: number;
  export const CKK_EC: number;
  export const CKK_RSA: number;
  export const CKM_EC_KEY_PAIR_GEN: number;
  export const CKM_RSA_PKCS_KEY_PAIR_GEN: number;
  export const CKM_ECDSA: number;
}
