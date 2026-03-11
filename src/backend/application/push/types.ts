export interface PushDeviceToken {
  userId: string;
  token: string;
  platform: "ios";
  registeredAt: string;
}

export interface ApnsPayload {
  aps: {
    alert?: { title: string; body: string } | string;
    badge?: number;
    sound?: string;
    "content-available"?: number;
  };
  [key: string]: unknown;
}
