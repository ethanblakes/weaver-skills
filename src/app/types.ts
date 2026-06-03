export interface GiteaRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  stars_count: number;
  updated_at: string;
  topics: string[];
}

export interface SkillMeta {
  name: string;
  description: string;
  version?: string;
  category?: string;
}

export interface Skill extends GiteaRepo {
  meta: SkillMeta | null;
  subdirs?: string[];
  author?: string;
}
