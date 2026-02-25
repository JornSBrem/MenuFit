import { createPublicKey, verify as cryptoVerify } from "node:crypto";

import type { JwksClient } from "./jwks-client.ts";
import { JwksClientError } from "./jwks-client.ts";
import type { JwtClaims, JwtHeader, JwtVerifyOptions, VerifiedJwt } from "./types.ts";

export class JwtVerificationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JwtVerificationError";
    this.code = code;
  }
}

const SUPPORTED_ALGORITHMS: Record<string, { name: string; hash: string }> = {
  RS256: { name: "RSA-SHA256", hash: "SHA-256" },
  RS384: { name: "RSA-SHA384", hash: "SHA-384" },
  RS512: { name: "RSA-SHA512", hash: "SHA-512" },
  ES256: { name: "EC-SHA256", hash: "SHA-256" },
  ES384: { name: "EC-SHA384", hash: "SHA-384" },
  ES512: { name: "EC-SHA512", hash: "SHA-512" },
};

const decodeBase64Url = (str: string): Buffer =>
  Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const parseSegment = <T>(segment: string, label: string): T => {
  try {
    const decoded = decodeBase64Url(segment).toString("utf8");
    return JSON.parse(decoded) as T;
  } catch {
    throw new JwtVerificationError("JWT_MALFORMED", `Cannot decode JWT ${label}`);
  }
};

const splitToken = (token: string): [string, string, string] => {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new JwtVerificationError("JWT_EMPTY", "JWT token is empty");
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new JwtVerificationError(
      "JWT_MALFORMED",
      `JWT must have 3 segments, got ${parts.length}`,
    );
  }

  return [parts[0]!, parts[1]!, parts[2]!];
};

const verifyRsaSignature = (
  signingInput: Buffer,
  signature: Buffer,
  jwk: object,
  algorithm: string,
): boolean => {
  try {
    const keyObject = createPublicKey({ key: jwk, format: "jwk" });
    const hashAlg = algorithm.replace("RSA-", "");
    return cryptoVerify(hashAlg, signingInput, keyObject, signature);
  } catch {
    return false;
  }
};

const verifyEcSignature = (
  signingInput: Buffer,
  signature: Buffer,
  jwk: object,
  algorithm: string,
): boolean => {
  try {
    const keyObject = createPublicKey({ key: jwk, format: "jwk" });
    const hashAlg = algorithm.replace("EC-", "");
    // ECDSA signatures in JWTs are IEEE P1363 format (r||s), not DER
    // Convert from P1363 to DER for Node.js crypto
    const derSignature = p1363ToDer(signature);
    return cryptoVerify(hashAlg, signingInput, { key: keyObject, dsaEncoding: "der" }, derSignature);
  } catch {
    return false;
  }
};

/** Convert IEEE P1363 ECDSA signature (r||s) to DER format */
const p1363ToDer = (signature: Buffer): Buffer => {
  const len = signature.length;
  const half = len / 2;
  const r = signature.subarray(0, half);
  const s = signature.subarray(half);

  const encodeDerInt = (bytes: Buffer): Buffer => {
    // Remove leading zeros but ensure at least one byte
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) {
      start++;
    }
    const trimmed = bytes.subarray(start);
    // Add leading 0x00 if high bit is set (to prevent sign bit interpretation)
    const needsPad = (trimmed[0]! & 0x80) !== 0;
    const result = Buffer.alloc(needsPad ? trimmed.length + 1 : trimmed.length);
    if (needsPad) {
      result[0] = 0x00;
      trimmed.copy(result, 1);
    } else {
      trimmed.copy(result);
    }
    return result;
  };

  const rDer = encodeDerInt(r);
  const sDer = encodeDerInt(s);

  const seqLen = 2 + rDer.length + 2 + sDer.length;
  const der = Buffer.alloc(2 + seqLen);
  let offset = 0;
  der[offset++] = 0x30; // SEQUENCE
  der[offset++] = seqLen;
  der[offset++] = 0x02; // INTEGER
  der[offset++] = rDer.length;
  rDer.copy(der, offset);
  offset += rDer.length;
  der[offset++] = 0x02; // INTEGER
  der[offset++] = sDer.length;
  sDer.copy(der, offset);

  return der;
};

const verifyClaims = (
  claims: JwtClaims,
  options: JwtVerifyOptions,
): void => {
  const now = options.nowEpochSeconds ? options.nowEpochSeconds() : Math.floor(Date.now() / 1000);
  const tolerance = options.clockToleranceSeconds ?? 30;

  if (claims.iss !== options.issuer) {
    throw new JwtVerificationError(
      "JWT_INVALID_ISSUER",
      `JWT issuer '${claims.iss}' does not match expected '${options.issuer}'`,
    );
  }

  const audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
  const tokenAud = Array.isArray(claims.aud) ? claims.aud : [claims.aud ?? ""];
  const hasAudience = audiences.some((aud) => tokenAud.includes(aud));
  if (!hasAudience) {
    throw new JwtVerificationError(
      "JWT_INVALID_AUDIENCE",
      `JWT audience does not include expected audience`,
    );
  }

  if (typeof claims.exp !== "number") {
    throw new JwtVerificationError("JWT_MISSING_EXP", "JWT missing exp claim");
  }
  if (claims.exp + tolerance < now) {
    throw new JwtVerificationError("JWT_EXPIRED", "JWT has expired");
  }

  if (typeof claims.iat === "number" && claims.iat - tolerance > now) {
    throw new JwtVerificationError("JWT_NOT_VALID_YET", "JWT issued in the future");
  }
};

export interface JwtVerifierConfig {
  jwksClient: JwksClient;
}

export class JwtVerifier {
  private readonly jwksClient: JwksClient;

  constructor(config: JwtVerifierConfig) {
    this.jwksClient = config.jwksClient;
  }

  /**
   * Verify a JWT against the configured JWKS.
   * Supports RS256/RS384/RS512 and ES256/ES384/ES512.
   * Validates iss, aud, exp claims.
   */
  async verify(token: string, options: JwtVerifyOptions): Promise<VerifiedJwt> {
    const [headerSegment, payloadSegment, signatureSegment] = splitToken(token);

    const header = parseSegment<JwtHeader>(headerSegment, "header");
    const claims = parseSegment<JwtClaims>(payloadSegment, "payload");

    if (!header.alg) {
      throw new JwtVerificationError("JWT_MISSING_ALG", "JWT header missing alg");
    }

    const algSpec = SUPPORTED_ALGORITHMS[header.alg];
    if (!algSpec) {
      throw new JwtVerificationError(
        "JWT_UNSUPPORTED_ALG",
        `JWT algorithm '${header.alg}' is not supported`,
      );
    }

    if (!header.kid) {
      throw new JwtVerificationError("JWT_MISSING_KID", "JWT header missing kid");
    }

    let jwk = await this.jwksClient.getKey(header.kid);
    if (!jwk) {
      // Key not found — try a forced JWKS refresh (rotation scenario)
      await this.jwksClient.refreshKeys();
      jwk = await this.jwksClient.getKey(header.kid);
    }

    if (!jwk) {
      throw new JwtVerificationError(
        "JWT_UNKNOWN_KID",
        `JWKS contains no key with kid '${header.kid}'`,
      );
    }

    const signingInput = Buffer.from(`${headerSegment}.${payloadSegment}`);
    const signature = decodeBase64Url(signatureSegment);

    const isRsa = header.alg.startsWith("RS");
    const isEc = header.alg.startsWith("ES");

    let valid = false;
    if (isRsa) {
      valid = verifyRsaSignature(signingInput, signature, jwk as object, algSpec.name);
    } else if (isEc) {
      valid = verifyEcSignature(signingInput, signature, jwk as object, algSpec.name);
    }

    if (!valid) {
      throw new JwtVerificationError("JWT_INVALID_SIGNATURE", "JWT signature verification failed");
    }

    verifyClaims(claims, options);

    return { header, claims };
  }
}
