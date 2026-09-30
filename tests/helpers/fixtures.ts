/**
 * Static API payloads used by the tests.
 *
 * These objects are what the real API is expected to return (all documented
 * fields present), so they double as a documentation of the response shape.
 */

export const giftResponse = {
  type: "gift",
  id: "Abc123Xyz0",
  userId: "123456789012345678",
  status: "unused",
  receiverId: null,
  amount: 1000,
  boughtAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
} as const;

export const taxResponse = {
  benefitTax: [
    { threshold: 0, rate: 0.05 },
    { threshold: 1000000, rate: 0.1 },
  ],
  companyBenefitTax: [{ threshold: 0, rate: 0.03 }],
  debtInterestRate: 0.02,
  depositInterestRate: 0.01,
  depositTaxRate: 0.2,
  exchangeTaxRate: 0.03,
  giftTaxRate: 0.1,
  idleTax: 50000,
  incomeTaxRate: 0.15,
  tradeTaxRate: 0.05,
} as const;

export const shardResponse = {
  data: [
    { shardId: "0", guildCount: "120", userCount: "3400", ping: "42" },
    { shardId: "1", guildCount: "118", userCount: "3310", ping: "39" },
  ],
  loggedAt: "2024-01-01T00:00:00.000Z",
} as const;

export const statisticsResponse = {
  user: {
    totalEarn: 1000000,
    totalUse: 500000,
    totalTax: 50000,
    totalWork: 20000,
    totalCommand: 300000,
  },
  company: { totalEarn: 400000, totalUse: 200000, totalTax: 20000 },
  economy: { treasury: 9000000, debt: 1000000 },
  event: {
    total: 1000,
    totalOnlyUser: 800,
    messageCreate: {
      oneDay: 100,
      difference: 10,
      oneDayOnlyUser: 80,
      differenceOnlyUser: 8,
    },
    interactionCreate: {
      oneDay: 50,
      difference: -5,
      oneDayOnlyUser: 40,
      differenceOnlyUser: -4,
    },
    guildMemberAdd: { oneDay: 5, difference: 1 },
    guildMemberRemove: { oneDay: 2, difference: -1 },
    guildCreate: { oneDay: 1, difference: 0 },
    guildDelete: { oneDay: 0, difference: -2 },
  },
} as const;

export const historyEntries = [
  {
    id: 1,
    userId: "123456789012345678",
    amount: 500,
    reason: "work",
    tradedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    userId: "123456789012345678",
    amount: -200,
    reason: "shop",
    tradedAt: "2024-01-02T00:00:00.000Z",
  },
] as const;

export const profileResponse = {
  assets: 1234567,
  chips: 89,
  jobType: "engineer",
} as const;

export const rankingEntries = [
  {
    id: "123456789012345678",
    username: "alice",
    avatarURL: "https://cdn.discordapp.com/avatars/1/a.png",
    assets: 9999999,
    chips: 10,
    jobType: "engineer",
  },
  {
    id: "223456789012345678",
    username: "bob",
    avatarURL: null,
    assets: 5000000,
    chips: 0,
    jobType: "fisher",
  },
] as const;

export const companyListEntries = [
  {
    id: "Abc123Xyz0",
    name: "Takasumi Inc.",
    description: "A company",
    assets: 1000000,
    salary: 5000,
    jobType: "engineer",
    ownerId: "123456789012345678",
    updatedAt: "2024-01-02T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
] as const;

export const companyDetailResponse = {
  ...companyListEntries[0],
  statistics: {
    companyId: "Abc123Xyz0",
    totalEarn: 300000,
    totalUse: 100000,
    totalTax: 15000,
    updatedAt: "2024-01-03T00:00:00.000Z",
  },
  employees: [
    {
      userId: "123456789012345678",
      companyId: "Abc123Xyz0",
      updatedAt: "2024-01-02T00:00:00.000Z",
      joinedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
} as const;

/** Two stocks; `JTTI` has 4 prices, `KENTAI` has none. */
export const stockEntries = [
  {
    name: "JTTI",
    id: "JTTI",
    description: "The flagship stock",
    dividendAmount: 120,
    dividendRate: 0.04,
    prices: [100, 101, 102, 103],
  },
  {
    name: "KENTAI",
    id: "KENTAI",
    description: "No price history yet",
    dividendAmount: 0,
    dividendRate: 0,
    prices: [],
  },
] as const;

export const discordUserSearchResponse = {
  accentColor: 16711680,
  avatar: "abcdef",
  banner: null,
  bot: false,
  flags: 0,
  globalName: "Takasumi",
  id: "123456789012345678",
  username: "takasumi",
} as const;

export const companyHistoryEntries = [
  {
    id: 10,
    companyId: "Abc123Xyz0",
    userId: "123456789012345678",
    amount: 5000,
    reason: "salary",
    tradedAt: "2024-01-02T00:00:00.000Z",
  },
] as const;

export const statusEntries = [
  {
    id: 1,
    ping: 42,
    totalUser: 3400,
    totalGuild: 238,
    totalCommand: 98765,
    cpuUsage: 12,
    memoryUsage: 34,
    loggedAt: "2024-01-01T00:00:00.000Z",
  },
] as const;
