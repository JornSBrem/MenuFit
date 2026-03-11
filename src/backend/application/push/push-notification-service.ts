import { createSign } from "node:crypto";
import { connect } from "node:http2";
import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { ApnsPayload, PushDeviceToken } from "./types.ts";

export class PushNotificationServiceError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PushNotificationServiceOptions {
  stateStore: PersistentStateStore;
  env?: Record<string, string | undefined>;
}

export class PushNotificationService {
  private readonly stateStore: PersistentStateStore;
  private readonly apnsKey: string | undefined;
  private readonly apnsKeyId: string | undefined;
  private readonly apnsTeamId: string | undefined;
  private readonly apnsBundleId: string | undefined;
  private readonly apnsEnvironment: "sandbox" | "production";

  constructor(options: PushNotificationServiceOptions) {
    this.stateStore = options.stateStore;
    const env = options.env ?? process.env;
    this.apnsKey = env["APNS_KEY"]?.trim() || undefined;
    this.apnsKeyId = env["APNS_KEY_ID"]?.trim() || undefined;
    this.apnsTeamId = env["APNS_TEAM_ID"]?.trim() || undefined;
    this.apnsBundleId = env["APNS_BUNDLE_ID"]?.trim() || undefined;
    this.apnsEnvironment = env["APNS_ENVIRONMENT"] === "production" ? "production" : "sandbox";
  }

  isConfigured(): boolean {
    return !!(this.apnsKey && this.apnsKeyId && this.apnsTeamId && this.apnsBundleId);
  }

  registerToken(userId: string, token: string): void {
    if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
      throw new PushNotificationServiceError(
        "INVALID_TOKEN",
        "Device token must be a 64-character hex string.",
      );
    }
    this.stateStore.update((draft) => {
      draft.pushDeviceTokens = draft.pushDeviceTokens.filter(
        (t) => !(t.userId === userId && t.token === token),
      );
      const entry: PushDeviceToken = {
        userId,
        token,
        platform: "ios",
        registeredAt: new Date().toISOString(),
      };
      draft.pushDeviceTokens.push(entry);
    });
    console.info(`[PushNotificationService] Token registered for user ${userId}`);
  }

  unregisterToken(userId: string, token: string): void {
    this.stateStore.update((draft) => {
      draft.pushDeviceTokens = draft.pushDeviceTokens.filter(
        (t) => !(t.userId === userId && t.token === token),
      );
    });
    console.info(`[PushNotificationService] Token unregistered for user ${userId}`);
  }

  async sendNotification(userId: string, payload: ApnsPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn(
        `[PushNotificationService] APNs not configured — skipping notification for user ${userId}. ` +
        `Set APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID to enable.`,
      );
      return;
    }

    const state = this.stateStore.read();
    const tokens = state.pushDeviceTokens.filter(
      (t) => t.userId === userId && t.platform === "ios",
    );

    if (tokens.length === 0) {
      console.info(`[PushNotificationService] No registered tokens for user ${userId}`);
      return;
    }

    const jwt = this.buildJwt();
    const host =
      this.apnsEnvironment === "production"
        ? "apns.push.apple.com"
        : "api.sandbox.push.apple.com";
    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(
      tokens.map((t) => this.sendToToken(host, jwt, t.token, body)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(
          `[PushNotificationService] Failed to send to token:`,
          result.reason instanceof Error ? result.reason.message : result.reason,
        );
      }
    }
  }

  private buildJwt(): string {
    const header = Buffer.from(
      JSON.stringify({ alg: "ES256", kid: this.apnsKeyId }),
    ).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const claims = Buffer.from(
      JSON.stringify({ iss: this.apnsTeamId, iat: now }),
    ).toString("base64url");
    const unsigned = `${header}.${claims}`;

    const sign = createSign("SHA256");
    sign.update(unsigned);
    const signature = sign
      .sign({ key: this.apnsKey!, dsaEncoding: "ieee-p1363" })
      .toString("base64url");

    return `${unsigned}.${signature}`;
  }

  private sendToToken(
    host: string,
    jwt: string,
    deviceToken: string,
    body: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = connect(`https://${host}`);
      client.on("error", (err) => {
        reject(err);
      });

      const req = client.request({
        ":method": "POST",
        ":scheme": "https",
        ":authority": host,
        ":path": `/3/device/${deviceToken}`,
        authorization: `bearer ${jwt}`,
        "apns-topic": this.apnsBundleId!,
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
      });

      let status: number | undefined;
      req.on("response", (headers) => {
        status = Number(headers[":status"]);
      });

      req.write(body);
      req.end();

      let responseData = "";
      req.on("data", (chunk: Buffer) => {
        responseData += chunk.toString();
      });
      req.on("end", () => {
        client.close();
        if (status === 200) {
          resolve();
        } else {
          reject(new Error(`APNs responded with status ${status}: ${responseData}`));
        }
      });
      req.on("error", (err: Error) => {
        client.close();
        reject(err);
      });
    });
  }
}
