// Shared by the public report page and its OG image route.
import { API_URL } from '@/lib/api';

export interface PublicReport {
  kind: string;
  title: string;
  platform?: string | null;
  hook_score: number;
  retention_score: number;
  viral_score: number;
  verdict: string;
  hook_teaser: string;
  locked: {
    hook_rewrites?: number;
    title_suggestions?: number;
    caption?: boolean;
    retention_risks?: number;
    hashtags?: number;
    best_times?: number;
  };
  created_at: string;
}

// Same weighting the app uses everywhere: hook 40%, retention 30%, viral 30%.
export function overallScore(r: Pick<PublicReport, 'hook_score' | 'retention_score' | 'viral_score'>): number {
  return Math.round(0.4 * r.hook_score + 0.3 * r.retention_score + 0.3 * r.viral_score);
}

export function gradeFor(v: number): { grade: string; word: string } {
  if (v >= 85) return { grade: 'A+', word: 'Post-ready' };
  if (v >= 75) return { grade: 'A', word: 'Strong' };
  if (v >= 65) return { grade: 'B', word: 'Good' };
  if (v >= 55) return { grade: 'C', word: 'Needs work' };
  if (v >= 45) return { grade: 'D', word: 'Risky' };
  return { grade: 'F', word: 'Rework it' };
}

export async function getReport(shareId: string): Promise<PublicReport | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/report/${encodeURIComponent(shareId)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
