export interface RawJobItem {
  externalId: string;
  title: string;
  description: string;
  company?: string;
  location?: string;
  categories?: string[];
  employmentType?: string;
  publishDate?: Date;
  sourceUrl: string;
  link?: string;
  imageUrl?: string;
  raw: any;
}

export interface ImportJobData {
  runId: string;
  sourceUrl: string;
  job: RawJobItem;
}
