import { babbloQuery } from './babblo-db.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LifecycleStage =
  | 'trial_not_started'
  | 'trial_active'
  | 'trial_exhausted'
  | 'purchased';

export interface BabbloUserRow {
  userId: string;
  createdAt: string;
  displayName: string | null;
  lifecycleStage: LifecycleStage;
  bonusRequested: boolean;
  callsMade: number;
  minutesPurchased: number;
  minutesRemaining: number;
}

export interface BabbloStats {
  emailNotVerified: number;
  trialNotStarted: number;
  trialActive: number;
  trialExhausted: number;
  purchased: number;
  total: number;
}

export interface BabbloCorrection {
  original: string;
  corrected: string;
}

export interface BabbloCall {
  sessionId: string;
  createdAt: string;
  durationSeconds: number;
  language: string;
  personaName: string;
  corrections: BabbloCorrection[];
}

export interface BabbloPersonaMemory {
  personaName: string;
  memoryText: string;
  updatedAt: string;
}

export interface BabbloTransaction {
  id: string;
  type: string;
  amountSeconds: number;
  createdAt: string;
}

export interface BabbloUserProfile {
  profile: {
    userId: string;
    createdAt: string;
    displayName: string | null;
    email: string | null;
    nativeLanguage: string | null;
    targetLanguage: string | null;
    lifecycleStage: LifecycleStage;
    bonusRequested: boolean;
    minutesRemaining: number;
  };
  calls: BabbloCall[];
  personaMemory: BabbloPersonaMemory[];
  totalCostUsd: number;
  totalRevenueSeconds: number;
  transactions: BabbloTransaction[];
}

// ─── Lifecycle stage SQL expression ──────────────────────────────────────────

// Reusable CASE expression for lifecycle stage (requires ub alias for user_balance,
// p alias for profiles, fp alias for first_purchases subquery)
const LIFECYCLE_CASE = `
  CASE
    WHEN EXISTS (SELECT 1 FROM first_purchases fp WHERE fp.user_id = p.user_id) THEN 'purchased'
    WHEN (ub.free_trial_used IS NOT TRUE) AND COALESCE(ub.balance_seconds, 0) = 0 THEN 'email_not_verified'
    WHEN ub.balance_seconds = 0 THEN 'trial_exhausted'
    WHEN ub.balance_seconds BETWEEN 1 AND 599 THEN 'trial_active'
    ELSE 'trial_not_started'
  END
`;

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getBabbloUserList(
  page: number,
  pageSize: number,
  stageFilter?: string
): Promise<{ rows: BabbloUserRow[]; total: number }> {
  const offset = (page - 1) * pageSize;

  // Build optional WHERE clause for stage filter
  let stageWhere = '';
  const params: unknown[] = [pageSize, offset];

  if (stageFilter) {
    stageWhere = `HAVING (${LIFECYCLE_CASE}) = $3`;
    params.push(stageFilter);
  }

  // Use a subquery so we can filter on the computed stage
  const sql = `
    SELECT
      p.user_id                                                 AS "userId",
      p.created_at                                              AS "createdAt",
      p.info->>'display_name'                                   AS "displayName",
      ${LIFECYCLE_CASE}                                         AS "lifecycleStage",
      (
        ub.app_review_bonus_used = true
        OR EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_user_id = p.user_id)
      )                                                         AS "bonusRequested",
      COUNT(DISTINCT cs.id)::int                                AS "callsMade",
      COALESCE(SUM(CASE WHEN t.transaction_type = 'purchase'
                        THEN t.amount_seconds ELSE 0 END), 0)::int / 60
                                                                AS "minutesPurchased",
      COALESCE(ub.balance_seconds, 0) / 60                     AS "minutesRemaining"
    FROM profiles p
    LEFT JOIN user_balance ub ON ub.user_id = p.user_id
    LEFT JOIN conversation_sessions cs ON cs.user_id = p.user_id
    LEFT JOIN transactions t ON t.user_id = p.user_id
    GROUP BY p.user_id, p.created_at, ub.app_review_bonus_used, ub.balance_seconds, ub.free_trial_used
    ${stageWhere}
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const countSql = stageFilter
    ? `
      SELECT COUNT(*) AS total FROM (
        SELECT p.user_id,
          ${LIFECYCLE_CASE} AS stage
        FROM profiles p
        LEFT JOIN user_balance ub ON ub.user_id = p.user_id
        GROUP BY p.user_id, ub.app_review_bonus_used, ub.balance_seconds, ub.free_trial_used
      ) sub
      WHERE stage = $1
    `
    : `SELECT COUNT(*)::int AS total FROM profiles`;

  const countParams = stageFilter ? [stageFilter] : [];

  const [rows, countRows] = await Promise.all([
    babbloQuery<BabbloUserRow>(sql, params),
    babbloQuery<{ total: string }>(countSql, countParams),
  ]);

  return { rows, total: parseInt(countRows[0]?.total ?? '0', 10) };
}

export async function getBabbloStats(): Promise<BabbloStats> {
  const sql = `
    SELECT
      COUNT(*) FILTER (
        WHERE ${LIFECYCLE_CASE} = 'email_not_verified'
      )::int AS "emailNotVerified",
      COUNT(*) FILTER (
        WHERE ${LIFECYCLE_CASE} = 'trial_not_started'
      )::int AS "trialNotStarted",
      COUNT(*) FILTER (
        WHERE ${LIFECYCLE_CASE} = 'trial_active'
      )::int AS "trialActive",
      COUNT(*) FILTER (
        WHERE ${LIFECYCLE_CASE} = 'trial_exhausted'
      )::int AS "trialExhausted",
      COUNT(*) FILTER (
        WHERE ${LIFECYCLE_CASE} = 'purchased'
      )::int AS "purchased",
      COUNT(*)::int AS "total"
    FROM profiles p
    LEFT JOIN user_balance ub ON ub.user_id = p.user_id
  `;

  const rows = await babbloQuery<BabbloStats>(sql);
  return (
    rows[0] ?? {
      emailNotVerified: 0,
      trialNotStarted: 0,
      trialActive: 0,
      trialExhausted: 0,
      purchased: 0,
      total: 0,
    }
  );
}

export async function getBabbloUserProfile(userId: string): Promise<BabbloUserProfile | null> {
  // Profile
  const profileSql = `
    SELECT
      p.user_id                                                     AS "userId",
      p.created_at                                                  AS "createdAt",
      p.info->>'display_name'                                       AS "displayName",
      p.info->>'email'                                              AS "email",
      p.info->>'native_language'                                    AS "nativeLanguage",
      p.info->>'target_language'                                    AS "targetLanguage",
      ${LIFECYCLE_CASE}                                             AS "lifecycleStage",
      (
        ub.app_review_bonus_used = true
        OR EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_user_id = p.user_id)
      )                                                             AS "bonusRequested",
      COALESCE(ub.balance_seconds, 0) / 60                         AS "minutesRemaining"
    FROM profiles p
    LEFT JOIN user_balance ub ON ub.user_id = p.user_id
    WHERE p.user_id = $1
  `;

  const profileRows = await babbloQuery<BabbloUserProfile['profile']>(profileSql, [userId]);
  if (!profileRows.length) return null;

  // Calls (without corrections — fetched separately)
  const callsSql = `
    SELECT
      session_id       AS "sessionId",
      started_at       AS "createdAt",
      duration_seconds AS "durationSeconds",
      lang             AS "language",
      contact_name     AS "personaName"
    FROM conversation_sessions
    WHERE user_id = $1
    ORDER BY started_at DESC
  `;

  // Corrections for all sessions in one query
  const correctionsSql = `
    SELECT
      session_id              AS "sessionId",
      incorrect_sentence      AS "original",
      corrected_sentence      AS "corrected"
    FROM corrections
    WHERE user_id = $1
  `;

  // Persona memory
  const memorySql = `
    SELECT
      persona_id      AS "personaName",
      rolling_summary AS "memoryText",
      updated_at      AS "updatedAt"
    FROM persona_rolling_memory
    WHERE user_id = $1
    ORDER BY persona_id
  `;

  // Cost
  const costSql = `
    SELECT COALESCE(SUM(cost_usd), 0) AS "totalCostUsd"
    FROM token_usage
    WHERE user_id = $1
  `;

  // Transactions
  const txSql = `
    SELECT
      id,
      transaction_type  AS "type",
      amount_seconds    AS "amountSeconds",
      created_at        AS "createdAt"
    FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  // Revenue (purchase transactions only)
  const revSql = `
    SELECT COALESCE(SUM(amount_seconds), 0)::int AS "totalRevenueSeconds"
    FROM transactions
    WHERE user_id = $1
      AND transaction_type = 'purchase'
  `;

  const [callRows, correctionRows, memoryRows, costRows, txRows, revRows] = await Promise.all([
    babbloQuery<Omit<BabbloCall, 'corrections'>>(callsSql, [userId]),
    babbloQuery<{ sessionId: string; original: string; corrected: string }>(correctionsSql, [userId]),
    babbloQuery<BabbloPersonaMemory>(memorySql, [userId]),
    babbloQuery<{ totalCostUsd: string }>(costSql, [userId]),
    babbloQuery<BabbloTransaction>(txSql, [userId]),
    babbloQuery<{ totalRevenueSeconds: string }>(revSql, [userId]),
  ]);

  // Attach corrections to their calls
  const correctionsBySession = new Map<string, BabbloCorrection[]>();
  for (const row of correctionRows) {
    const list = correctionsBySession.get(row.sessionId) ?? [];
    list.push({ original: row.original, corrected: row.corrected });
    correctionsBySession.set(row.sessionId, list);
  }

  const calls: BabbloCall[] = callRows.map((c) => ({
    ...c,
    corrections: correctionsBySession.get(c.sessionId) ?? [],
  }));

  const profile = profileRows[0];
  if (!profile) return null;

  return {
    profile,
    calls,
    personaMemory: memoryRows,
    totalCostUsd: parseFloat(costRows[0]?.totalCostUsd ?? '0'),
    totalRevenueSeconds: parseInt(revRows[0]?.totalRevenueSeconds ?? '0', 10),
    transactions: txRows,
  };
}
