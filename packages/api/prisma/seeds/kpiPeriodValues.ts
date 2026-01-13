import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PeriodDefinition {
  type: 'monthly' | 'quarterly';
  year: number;
  month?: number;
  quarter?: number;
  label: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

// Base values for Jan 2026 (professional services firm - MONTHLY period)
// All parent values are calculated from their children using formulas
// Annual costs are divided by 12 for monthly view
const BASE_VALUES: Record<string, number> = {
  // Layer 1 - North Star (calculated: (revenue - costs) / revenue * 100)
  gross_margin: 47.5, // percent = (1050000 - 550900) / 1050000 * 100

  // Layer 2 - Primary Financial Drivers
  revenue: 1050000, // calculated: billable_hours * avg_realised_price = 840 * 1250
  costs: 550900, // calculated: delivery_costs + non_delivery_costs = 375000 + 175900

  // Layer 3 - Structural Drivers
  billable_hours: 840, // calculated: total_capacity_hours * utilisation_rate = 1050 * 0.8
  avg_realised_price: 1250, // calculated: list_rate * (1 - price_leakage/100) = 1500 * 0.833
  delivery_costs: 375000, // calculated: delivery_headcount * cost_per_fte = 50 * 7500
  non_delivery_costs: 175900, // calculated: sum of mgmt + tools + shared = 70833 + 50900 + 54167

  // Layer 4 - Operational Drivers (input values)
  total_capacity_hours: 1050, // Available Man Days = delivery_headcount * 21 working days = 50 * 21
  utilisation_rate: 80, // percent
  list_rate: 1500, // €/day (Day Rate)
  price_leakage: 16.7, // percent (Average Discount)
  delivery_headcount: 50, // count
  cost_per_fte: 7500, // €/month (annual 90000 / 12)
  mgmt_ops_costs: 70833, // €/month (annual 850000 / 12)
  tools_facilities: 50900, // €/month (annual 610800 / 12)
  shared_corporate: 54167, // €/month (annual 650000 / 12)

  // Layer 5 - Behavioural Levers (under Utilisation Rate)
  bench_time: 5.2, // percent
  ramp_time: 3.1, // percent
  planning_accuracy: 84.5, // percent
  unbilled_internal: 7.8, // percent
  sick_leave_pto: 3.9, // percent

  // Layer 5 - Behavioural Levers (under Price Leakage)
  discounting: 8.2, // percent
  scope_creep: 4.8, // percent
  over_delivery: 3.5, // percent
  write_offs: 52000, // €/month
  renewal_mix: 62, // percent

  // Layer 5 - Behavioural Levers (under Delivery Headcount)
  hiring_vs_demand: 91.5, // percent
  attrition_rate: 11.8, // percent
  skill_mix: 44, // percent (senior ratio)
  contractor_ratio: 14.5, // percent

  // Layer 5 - Behavioural Levers (under Mgmt & Ops Costs)
  span_of_control: 7.5, // ratio
  mgmt_layers: 4, // count

  // Layer 5 - Behavioural Levers (under Tools, Facilities, Travel)
  tool_sprawl: 145000, // €/month
  travel_adherence: 87.5, // percent
};

// Monthly periods (Oct-Dec 2025, Jan 2026)
const PERIODS: PeriodDefinition[] = [
  {
    type: 'monthly',
    year: 2025,
    month: 10,
    label: 'Oct 2025',
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-10-31'),
    isCurrent: false,
  },
  {
    type: 'monthly',
    year: 2025,
    month: 11,
    label: 'Nov 2025',
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-11-30'),
    isCurrent: false,
  },
  {
    type: 'monthly',
    year: 2025,
    month: 12,
    label: 'Dec 2025',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    isCurrent: false,
  },
  {
    type: 'monthly',
    year: 2026,
    month: 1,
    label: 'Jan 2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    isCurrent: true,
  },
  // Quarterly periods
  {
    type: 'quarterly',
    year: 2025,
    quarter: 3,
    label: 'Q3 2025',
    startDate: new Date('2025-07-01'),
    endDate: new Date('2025-09-30'),
    isCurrent: false,
  },
  {
    type: 'quarterly',
    year: 2025,
    quarter: 4,
    label: 'Q4 2025',
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-12-31'),
    isCurrent: false,
  },
];

/**
 * Generate a value with random variance
 * @param baseValue The base value
 * @param variancePercent Maximum variance percentage (e.g., 15 for +/-15%)
 * @param favorable 'up' or 'down' - affects whether historical values trend lower or higher
 */
function generateHistoricalValue(
  baseValue: number,
  variancePercent: number,
  favorable: string,
  monthsBack: number
): number {
  // Historical values should generally be slightly worse than current
  // If favorable is 'up', historical should be lower; if 'down', historical should be higher
  const trendFactor = favorable === 'up' ? -1 : 1;
  const trendAdjustment = (monthsBack * 0.5 * trendFactor) / 100; // 0.5% per month

  // Random variance
  const randomVariance =
    ((Math.random() - 0.5) * 2 * variancePercent) / 100;

  return baseValue * (1 + trendAdjustment + randomVariance);
}

export async function seedKpiPeriodValues(): Promise<void> {
  console.log('Seeding KPI periods and values...');

  // First, clear existing data
  await prisma.kpiMetricValue.deleteMany({});
  await prisma.kpiPeriod.deleteMany({});

  // Create periods
  const createdPeriods: Record<string, number> = {};
  for (const period of PERIODS) {
    const created = await prisma.kpiPeriod.create({
      data: {
        type: period.type,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
        label: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
        isCurrent: period.isCurrent,
      },
    });
    createdPeriods[period.label] = created.id;
    console.log(`Created period: ${period.label}`);
  }

  // Get all metrics
  const metrics = await prisma.kpiMetric.findMany();
  const metricMap = new Map(metrics.map((m) => [m.key, m]));

  // Metrics that should scale with period length (monthly base values × 3 for quarterly)
  const SCALABLE_METRICS = new Set([
    'revenue',
    'costs',
    'billable_hours',
    'delivery_costs',
    'non_delivery_costs',
    'total_capacity_hours',
    'cost_per_fte',
    'mgmt_ops_costs',
    'tools_facilities',
    'shared_corporate',
    'write_offs',
    'tool_sprawl',
  ]);

  // Metrics that should remain constant (no historical variance)
  const CONSTANT_METRICS = new Set([
    'list_rate', // Day Rate always €1,500
  ]);

  // Create values for each period
  for (const period of PERIODS) {
    const periodId = createdPeriods[period.label];
    if (!periodId) continue;

    // Period multiplier: 1 for monthly, 3 for quarterly
    const periodMultiplier = period.type === 'quarterly' ? 3 : 1;

    // Calculate months back from Jan 2026
    let monthsBack = 0;
    if (period.type === 'monthly') {
      if (period.year === 2025) {
        monthsBack = 13 - (period.month || 1); // Oct=3, Nov=2, Dec=1
      }
    } else if (period.type === 'quarterly') {
      if (period.year === 2025 && period.quarter === 3) {
        monthsBack = 5; // Q3 2025 is ~5 months before Jan 2026
      } else if (period.year === 2025 && period.quarter === 4) {
        monthsBack = 2; // Q4 2025 is ~2 months before Jan 2026
      }
    }

    for (const [metricKey, baseValue] of Object.entries(BASE_VALUES)) {
      const metric = metricMap.get(metricKey);
      if (!metric) {
        console.warn(`Metric not found: ${metricKey}`);
        continue;
      }

      let value: number;

      // Apply period scaling for scalable metrics
      const scaledBaseValue = SCALABLE_METRICS.has(metricKey)
        ? baseValue * periodMultiplier
        : baseValue;

      if (CONSTANT_METRICS.has(metricKey)) {
        // Constant metrics: no variance, no scaling
        value = baseValue;
      } else if (period.isCurrent) {
        // Current period uses base values (with scaling)
        value = scaledBaseValue;
      } else {
        // Historical periods get variance (with scaling)
        value = generateHistoricalValue(
          scaledBaseValue,
          12, // +/-12% variance
          metric.favorable,
          monthsBack
        );
      }

      // Round appropriately based on unit
      if (metric.unit === 'percent') {
        value = Math.round(value * 10) / 10; // 1 decimal
      } else if (metric.unit === 'currency') {
        value = Math.round(value); // Whole numbers for currency
      } else if (metric.unit === 'ratio') {
        value = Math.round(value * 10) / 10; // 1 decimal
      } else if (metric.unit === 'count') {
        value = Math.round(value); // Whole numbers
      } else if (metric.unit === 'hours') {
        value = Math.round(value); // Whole numbers
      } else if (metric.unit === 'days') {
        value = Math.round(value); // Whole numbers for days
      }

      await prisma.kpiMetricValue.create({
        data: {
          metricId: metric.id,
          periodId: periodId,
          value: value,
        },
      });
    }

    console.log(`Created values for period: ${period.label}`);
  }

  console.log(
    `Seeded ${PERIODS.length} periods with ${Object.keys(BASE_VALUES).length} metrics each.`
  );
}

// Allow running directly
if (require.main === module) {
  seedKpiPeriodValues()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
