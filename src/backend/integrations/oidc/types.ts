export interface Jwk {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  /** RSA public key modulus (base64url) */
  n?: string;
  /** RSA public key exponent (base64url) */
  e?: string;
  /** EC x-coordinate (base64url) */
  x?: string;
  /** EC y-coordinate (base64url) */
  y?: string;
  /** EC curve name */
  crv?: string;
}

export interface Jwks {
  keys: Jwk[];
}

export interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

export interface JwtClaims {
  /** Subject (user identifier) */
  sub?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** Expiry (unix epoch seconds) */
  exp?: number;
  /** Issued at (unix epoch seconds) */
  iat?: number;
  /** JWT ID */
  jti?: string;
  [key: string]: unknown;
}

export interface VerifiedJwt {
  header: JwtHeader;
  claims: JwtClaims;
}

export interface JwtVerifyOptions {
  /** Expected issuer */
  issuer: string;
  /** Expected audience (string or list) */
  audience: string | string[];
  /** Allowed clock skew in seconds (default 30) */
  clockToleranceSeconds?: number;
  /** Override current time for testing */
  nowEpochSeconds?: () => number;
}
