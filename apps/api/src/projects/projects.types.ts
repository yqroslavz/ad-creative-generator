import type { AdNetwork } from '@prisma/client';

export interface CreateProjectInput {
  name: string;
  offerDescription: string;
  targetAudience: string;
  adNetwork: AdNetwork;
  landingPageUrl?: string | null;
}

export interface UpdateProjectInput {
  name?: string | null;
  offerDescription?: string | null;
  targetAudience?: string | null;
  adNetwork?: AdNetwork | null;
  landingPageUrl?: string | null;
}
