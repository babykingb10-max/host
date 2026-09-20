import { api } from './http-client';

export interface DetectedEnvVar {
  key: string;
  required: boolean;
  defaultValue?: string;
}

export interface AnalysisResult {
  runtime: 'NODE' | 'PYTHON' | 'DOCKER' | 'STATIC' | 'UNKNOWN';
  runtimeVersion?: string;
  packageManager?: string;
  framework?: string;
  startCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  port?: number;
  hasDockerfile: boolean;
  environmentVariables: DetectedEnvVar[];
  warnings: string[];
}

export const repositoryAnalyzerApi = {
  analyze: (owner: string, repo: string, branch: string) =>
    api.post<AnalysisResult>('/v1/repository-analyzer/analyze', { owner, repo, branch }),
};
