/**
 * The upstream boundary. Everything below this type is provider-specific;
 * everything above it aggregates and serves. Swapping Holodex for the YouTube
 * Data API means adding another module that produces `UpstreamStream[]`.
 */
export type UpstreamStream = {
  readonly videoId: string;
  readonly title: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly channelPhoto: string | null;
  /** Agency name as the upstream reports it. `null` means an independent. */
  readonly org: string | null;
  readonly viewers: number;
  readonly startedAt: string | null;
};

export type UpstreamClient = {
  readonly fetchLiveStreams: () => Promise<readonly UpstreamStream[]>;
  /**
   * Channel id -> agency name. Membership changes on the order of days, so this
   * is cached far longer than the live data and joined in locally.
   */
  readonly fetchChannelOrgs: () => Promise<ReadonlyMap<string, string>>;
};
