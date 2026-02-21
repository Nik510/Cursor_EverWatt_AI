import { randomUUID } from 'node:crypto';

import type { ProjectRecord } from '../../types/change-order';
import { createOrOverwriteProjectForOrg } from './projectRepository';

export async function createProjectShellIntakeOnlyV1(args: {
  orgId: string;
  reportId: string;
  name?: string;
  address?: string;
  utilityCompany?: string;
}): Promise<{ projectId: string; project: ProjectRecord & { status?: string } }> {
  const orgId = String(args.orgId || '').trim();
  if (!orgId) throw new Error('orgId is required');
  const reportId = String(args.reportId || '').trim();
  if (!reportId) throw new Error('reportId is required');

  const now = new Date().toISOString();
  const projectId = randomUUID();
  const name = String(args.name || '').trim() || `Intake ${reportId}`;
  const address = String(args.address || '').trim();
  const utilityCompany = String(args.utilityCompany || '').trim();

  const project: any = {
    id: projectId,
    driveFolderLink: 'INTAKE_ONLY',
    status: 'INTAKE_ONLY',
    intakeOnly: { reportId },
    customer: {
      projectNumber: `INTAKE-${now.slice(0, 10).replace(/-/g, '')}`,
      companyName: name,
      projectName: name,
      ...(address ? { siteLocation: address } : {}),
      ...(utilityCompany ? { utilityCompany } : {}),
    },
    createdAt: now,
    updatedAt: now,
  } satisfies ProjectRecord;

  await createOrOverwriteProjectForOrg(orgId, project as ProjectRecord);
  return { projectId, project };
}

