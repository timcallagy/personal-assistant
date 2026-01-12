import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MetricDefinition {
  key: string;
  name: string;
  layer: number;
  parentKey: string | null;
  unit: 'percent' | 'currency' | 'ratio' | 'count' | 'hours';
  favorable: 'up' | 'down';
  formula?: string;
  sortOrder: number;
}

const METRICS: MetricDefinition[] = [
  // Layer 1 - North Star Outcome
  {
    key: 'gross_margin',
    name: 'Gross Margin',
    layer: 1,
    parentKey: null,
    unit: 'percent',
    favorable: 'up',
    formula: '((revenue - costs) / revenue) * 100',
    sortOrder: 1,
  },

  // Layer 2 - Primary Financial Drivers
  {
    key: 'revenue',
    name: 'Revenue',
    layer: 2,
    parentKey: 'gross_margin',
    unit: 'currency',
    favorable: 'up',
    formula: 'billable_hours * avg_realised_price',
    sortOrder: 10,
  },
  {
    key: 'costs',
    name: 'Costs',
    layer: 2,
    parentKey: 'gross_margin',
    unit: 'currency',
    favorable: 'down',
    formula: 'delivery_costs + non_delivery_costs',
    sortOrder: 11,
  },

  // Layer 3 - Structural Drivers (Revenue)
  {
    key: 'billable_hours',
    name: 'Billable Hours Delivered',
    layer: 3,
    parentKey: 'revenue',
    unit: 'hours',
    favorable: 'up',
    formula: 'total_capacity_hours * (utilisation_rate / 100)',
    sortOrder: 20,
  },
  {
    key: 'avg_realised_price',
    name: 'Avg Realised Price/Day',
    layer: 3,
    parentKey: 'revenue',
    unit: 'currency',
    favorable: 'up',
    formula: 'list_rate - price_leakage',
    sortOrder: 21,
  },

  // Layer 3 - Structural Drivers (Costs)
  {
    key: 'delivery_costs',
    name: 'Delivery Costs',
    layer: 3,
    parentKey: 'costs',
    unit: 'currency',
    favorable: 'down',
    formula: 'delivery_headcount * cost_per_fte',
    sortOrder: 22,
  },
  {
    key: 'non_delivery_costs',
    name: 'Non-Delivery Costs',
    layer: 3,
    parentKey: 'costs',
    unit: 'currency',
    favorable: 'down',
    formula: 'mgmt_ops_costs + tools_facilities + shared_corporate',
    sortOrder: 23,
  },

  // Layer 4 - Operational Drivers (under Billable Hours)
  {
    key: 'total_capacity_hours',
    name: 'Total Capacity Hours',
    layer: 4,
    parentKey: 'billable_hours',
    unit: 'hours',
    favorable: 'up',
    sortOrder: 30,
  },
  {
    key: 'utilisation_rate',
    name: 'Utilisation Rate',
    layer: 4,
    parentKey: 'billable_hours',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 31,
  },

  // Layer 4 - Operational Drivers (under Avg Realised Price)
  {
    key: 'list_rate',
    name: 'List/Contract Rate',
    layer: 4,
    parentKey: 'avg_realised_price',
    unit: 'currency',
    favorable: 'up',
    sortOrder: 32,
  },
  {
    key: 'price_leakage',
    name: 'Price Leakage',
    layer: 4,
    parentKey: 'avg_realised_price',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 33,
  },

  // Layer 4 - Operational Drivers (under Delivery Costs)
  {
    key: 'delivery_headcount',
    name: 'Delivery Headcount',
    layer: 4,
    parentKey: 'delivery_costs',
    unit: 'count',
    favorable: 'down',
    sortOrder: 34,
  },
  {
    key: 'cost_per_fte',
    name: 'Fully Loaded Cost/FTE',
    layer: 4,
    parentKey: 'delivery_costs',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 35,
  },

  // Layer 4 - Operational Drivers (under Non-Delivery Costs)
  {
    key: 'mgmt_ops_costs',
    name: 'Management & Ops Costs',
    layer: 4,
    parentKey: 'non_delivery_costs',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 36,
  },
  {
    key: 'tools_facilities',
    name: 'Tools, Facilities, Travel',
    layer: 4,
    parentKey: 'non_delivery_costs',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 37,
  },
  {
    key: 'shared_corporate',
    name: 'Shared Corporate Costs',
    layer: 4,
    parentKey: 'non_delivery_costs',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 38,
  },

  // Layer 5 - Behavioural Levers (under Utilisation Rate)
  {
    key: 'bench_time',
    name: 'Bench Time',
    layer: 5,
    parentKey: 'utilisation_rate',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 50,
  },
  {
    key: 'ramp_time',
    name: 'Ramp-Up/Ramp-Down Time',
    layer: 5,
    parentKey: 'utilisation_rate',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 51,
  },
  {
    key: 'planning_accuracy',
    name: 'Project Planning Accuracy',
    layer: 5,
    parentKey: 'utilisation_rate',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 52,
  },
  {
    key: 'unbilled_internal',
    name: 'Unbilled Internal Work',
    layer: 5,
    parentKey: 'utilisation_rate',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 53,
  },
  {
    key: 'sick_leave_pto',
    name: 'Sick Leave / PTO',
    layer: 5,
    parentKey: 'utilisation_rate',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 54,
  },

  // Layer 5 - Behavioural Levers (under Price Leakage)
  {
    key: 'discounting',
    name: 'Discounting at Sale',
    layer: 5,
    parentKey: 'price_leakage',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 60,
  },
  {
    key: 'scope_creep',
    name: 'Scope Creep',
    layer: 5,
    parentKey: 'price_leakage',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 61,
  },
  {
    key: 'over_delivery',
    name: 'Over-delivery vs SOW',
    layer: 5,
    parentKey: 'price_leakage',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 62,
  },
  {
    key: 'write_offs',
    name: 'Write-offs / Write-ups',
    layer: 5,
    parentKey: 'price_leakage',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 63,
  },
  {
    key: 'renewal_mix',
    name: 'Renewals vs New Business Mix',
    layer: 5,
    parentKey: 'price_leakage',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 64,
  },

  // Layer 5 - Behavioural Levers (under Delivery Headcount)
  {
    key: 'hiring_vs_demand',
    name: 'Hiring Plan vs Demand',
    layer: 5,
    parentKey: 'delivery_headcount',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 70,
  },
  {
    key: 'attrition_rate',
    name: 'Attrition / Backfill Rate',
    layer: 5,
    parentKey: 'delivery_headcount',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 71,
  },
  {
    key: 'skill_mix',
    name: 'Skill Mix (Senior vs Junior)',
    layer: 5,
    parentKey: 'delivery_headcount',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 72,
  },
  {
    key: 'contractor_ratio',
    name: 'Contractors vs FTEs',
    layer: 5,
    parentKey: 'delivery_headcount',
    unit: 'percent',
    favorable: 'down',
    sortOrder: 73,
  },

  // Layer 5 - Behavioural Levers (under Management & Ops Costs)
  {
    key: 'span_of_control',
    name: 'Span of Control',
    layer: 5,
    parentKey: 'mgmt_ops_costs',
    unit: 'ratio',
    favorable: 'up',
    sortOrder: 80,
  },
  {
    key: 'mgmt_layers',
    name: 'Management Layers',
    layer: 5,
    parentKey: 'mgmt_ops_costs',
    unit: 'count',
    favorable: 'down',
    sortOrder: 81,
  },

  // Layer 5 - Behavioural Levers (under Tools, Facilities, Travel)
  {
    key: 'tool_sprawl',
    name: 'Tool Sprawl',
    layer: 5,
    parentKey: 'tools_facilities',
    unit: 'currency',
    favorable: 'down',
    sortOrder: 82,
  },
  {
    key: 'travel_adherence',
    name: 'Travel Policy Adherence',
    layer: 5,
    parentKey: 'tools_facilities',
    unit: 'percent',
    favorable: 'up',
    sortOrder: 83,
  },
];

export async function seedKpiMetrics(): Promise<void> {
  console.log('Seeding KPI metrics...');

  for (const metric of METRICS) {
    await prisma.kpiMetric.upsert({
      where: { key: metric.key },
      update: {
        name: metric.name,
        layer: metric.layer,
        parentKey: metric.parentKey,
        unit: metric.unit,
        favorable: metric.favorable,
        formula: metric.formula,
        sortOrder: metric.sortOrder,
      },
      create: {
        key: metric.key,
        name: metric.name,
        layer: metric.layer,
        parentKey: metric.parentKey,
        unit: metric.unit,
        favorable: metric.favorable,
        formula: metric.formula,
        sortOrder: metric.sortOrder,
      },
    });
  }

  console.log(`Seeded ${METRICS.length} KPI metrics.`);
}

// Allow running directly
if (require.main === module) {
  seedKpiMetrics()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
