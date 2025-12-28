import { prisma, notFoundError, conflictError } from '../lib/index.js';
import type { Company, AtsType, CompanyStage } from '@pa/shared';

// ============================================
// Transform Functions
// ============================================

function transformCompany(company: {
  id: number;
  name: string;
  careerPageUrl: string;
  atsType: string | null;
  active: boolean;
  description?: string | null;
  headquarters?: string | null;
  foundedYear?: number | null;
  revenueEstimate?: string | null;
  stage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Company {
  return {
    id: company.id,
    name: company.name,
    careerPageUrl: company.careerPageUrl,
    atsType: company.atsType as AtsType | null,
    active: company.active,
    description: company.description ?? null,
    headquarters: company.headquarters ?? null,
    foundedYear: company.foundedYear ?? null,
    revenueEstimate: company.revenueEstimate ?? null,
    stage: (company.stage as CompanyStage | null) ?? null,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

// ============================================
// ATS Detection
// ============================================

export function detectAtsType(url: string): AtsType | null {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('greenhouse.io') || urlLower.includes('boards.greenhouse')) {
    return 'greenhouse';
  }
  if (urlLower.includes('lever.co') || urlLower.includes('jobs.lever')) {
    return 'lever';
  }
  if (urlLower.includes('ashbyhq.com') || urlLower.includes('jobs.ashby')) {
    return 'ashby';
  }
  if (urlLower.includes('smartrecruiters.com')) {
    return 'smartrecruiters';
  }
  if (urlLower.includes('workday.com') || urlLower.includes('myworkdayjobs.com')) {
    return 'workday';
  }

  return 'custom';
}

// ============================================
// Service Functions
// ============================================

export async function getCompanies(
  userId: number,
  options?: { activeOnly?: boolean }
): Promise<{ companies: Company[]; total: number }> {
  const where: { userId: number; active?: boolean } = { userId };

  if (options?.activeOnly) {
    where.active = true;
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: 'asc' },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    companies: companies.map(transformCompany),
    total,
  };
}

export async function getCompany(userId: number, id: number): Promise<Company> {
  const company = await prisma.company.findFirst({
    where: { id, userId },
  });

  if (!company) {
    throw notFoundError('Company', id);
  }

  return transformCompany(company);
}

export async function createCompany(
  userId: number,
  data: { name: string; careerPageUrl: string }
): Promise<Company> {
  // Check for duplicate name
  const existing = await prisma.company.findFirst({
    where: { userId, name: data.name },
  });

  if (existing) {
    throw conflictError(`Company "${data.name}" already exists`);
  }

  // Auto-detect ATS type
  const atsType = detectAtsType(data.careerPageUrl);

  const company = await prisma.company.create({
    data: {
      userId,
      name: data.name,
      careerPageUrl: data.careerPageUrl,
      atsType,
    },
  });

  return transformCompany(company);
}

export async function updateCompany(
  userId: number,
  id: number,
  data: {
    name?: string;
    careerPageUrl?: string;
    active?: boolean;
    description?: string | null;
    headquarters?: string | null;
    foundedYear?: number | null;
    revenueEstimate?: string | null;
    stage?: string | null;
  }
): Promise<Company> {
  // Verify ownership
  const existing = await prisma.company.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw notFoundError('Company', id);
  }

  // Check for duplicate name if changing
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.company.findFirst({
      where: { userId, name: data.name },
    });
    if (duplicate) {
      throw conflictError(`Company "${data.name}" already exists`);
    }
  }

  // Re-detect ATS type if URL changed
  const updateData: {
    name?: string;
    careerPageUrl?: string;
    active?: boolean;
    atsType?: string;
    description?: string | null;
    headquarters?: string | null;
    foundedYear?: number | null;
    revenueEstimate?: string | null;
    stage?: string | null;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.careerPageUrl !== undefined) {
    updateData.careerPageUrl = data.careerPageUrl;
    updateData.atsType = detectAtsType(data.careerPageUrl) || undefined;
  }
  if (data.active !== undefined) updateData.active = data.active;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.headquarters !== undefined) updateData.headquarters = data.headquarters;
  if (data.foundedYear !== undefined) updateData.foundedYear = data.foundedYear;
  if (data.revenueEstimate !== undefined) updateData.revenueEstimate = data.revenueEstimate;
  if (data.stage !== undefined) updateData.stage = data.stage;

  const company = await prisma.company.update({
    where: { id },
    data: updateData,
  });

  return transformCompany(company);
}

export async function deleteCompany(userId: number, id: number): Promise<void> {
  const existing = await prisma.company.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw notFoundError('Company', id);
  }

  await prisma.company.delete({ where: { id } });
}
