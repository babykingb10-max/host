import { Injectable } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import type { AnalysisResult, DetectedEnvVar } from './dto/repository-analyzer.dto';

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: { node?: string };
  packageManager?: string;
}

@Injectable()
export class RepositoryAnalyzerService {
  constructor(private readonly github: GithubService) {}

  async analyze(userId: string, owner: string, repo: string, branch: string): Promise<AnalysisResult> {
    const warnings: string[] = [];
    const rootFiles = await this.github.listRootFiles(userId, owner, repo, branch);

    const hasDockerfile = rootFiles.includes('Dockerfile');
    if (hasDockerfile) {
      return this.analyzeDocker(userId, owner, repo, branch, rootFiles, warnings);
    }

    if (rootFiles.includes('package.json')) {
      return this.analyzeNode(userId, owner, repo, branch, rootFiles, warnings);
    }

    if (rootFiles.includes('requirements.txt') || rootFiles.includes('pyproject.toml')) {
      return this.analyzePython(userId, owner, repo, branch, rootFiles, warnings);
    }

    if (rootFiles.some((f) => f.match(/\.(html?)$/i)) || rootFiles.includes('index.html')) {
      return {
        runtime: 'STATIC', hasDockerfile: false, environmentVariables: [],
        warnings: ['Detected a static site (index.html found at the repository root).'],
      };
    }

    return {
      runtime: 'UNKNOWN', hasDockerfile: false, environmentVariables: [],
      warnings: ['Could not automatically detect a runtime. You can set the start command manually.'],
    };
  }

  private async analyzeDocker(userId: string, owner: string, repo: string, branch: string, rootFiles: string[], warnings: string[]): Promise<AnalysisResult> {
    const dockerfile = await this.github.getFileContent(userId, owner, repo, 'Dockerfile', branch);
    const exposeMatch = dockerfile?.match(/^EXPOSE\s+(\d+)/m);
    const envVars = this.extractDockerfileEnvVars(dockerfile ?? '');

    return {
      runtime: 'DOCKER',
      hasDockerfile: true,
      port: exposeMatch ? Number(exposeMatch[1]) : undefined,
      environmentVariables: envVars,
      warnings: rootFiles.includes('package.json') || rootFiles.includes('requirements.txt')
        ? [...warnings, 'A Dockerfile was found alongside other runtime files — deploying as Docker takes priority.']
        : warnings,
    };
  }

  private async analyzeNode(userId: string, owner: string, repo: string, branch: string, rootFiles: string[], warnings: string[]): Promise<AnalysisResult> {
    const raw = await this.github.getFileContent(userId, owner, repo, 'package.json', branch);
    let pkg: PackageJson = {};
    try {
      pkg = raw ? (JSON.parse(raw) as PackageJson) : {};
    } catch {
      warnings.push('package.json could not be parsed — it may be malformed.');
    }

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const framework = this.detectNodeFramework(deps, rootFiles);
    const packageManager = rootFiles.includes('pnpm-lock.yaml')
      ? 'pnpm'
      : rootFiles.includes('yarn.lock')
        ? 'yarn'
        : 'npm';

    const startCommand = pkg.scripts?.start
      ? `${packageManager} run start`
      : pkg.scripts?.dev
        ? `${packageManager} run dev`
        : undefined;
    const buildCommand = pkg.scripts?.build ? `${packageManager} run build` : undefined;

    if (!startCommand) warnings.push('No "start" or "dev" script found in package.json — set a start command manually.');

    return {
      runtime: 'NODE',
      runtimeVersion: pkg.engines?.node,
      packageManager,
      framework,
      startCommand,
      buildCommand,
      outputDirectory: framework === 'next' ? '.next' : framework === 'vite' || framework === 'react' ? 'dist' : undefined,
      port: 3000,
      hasDockerfile: false,
      environmentVariables: await this.extractEnvExample(userId, owner, repo, branch, rootFiles),
      warnings,
    };
  }

  private async analyzePython(userId: string, owner: string, repo: string, branch: string, rootFiles: string[], warnings: string[]): Promise<AnalysisResult> {
    const requirements = await this.github.getFileContent(userId, owner, repo, 'requirements.txt', branch);
    const lower = (requirements ?? '').toLowerCase();

    let framework: string | undefined;
    let startCommand: string | undefined;
    let port = 8000;

    if (lower.includes('fastapi')) {
      framework = 'fastapi';
      startCommand = 'uvicorn main:app --host 0.0.0.0 --port $PORT';
    } else if (lower.includes('flask')) {
      framework = 'flask';
      startCommand = 'gunicorn app:app --bind 0.0.0.0:$PORT';
    } else if (lower.includes('django')) {
      framework = 'django';
      startCommand = 'gunicorn config.wsgi --bind 0.0.0.0:$PORT';
      port = 8000;
    } else {
      warnings.push('Could not detect a specific Python framework — set a start command manually.');
    }

    return {
      runtime: 'PYTHON',
      packageManager: rootFiles.includes('pyproject.toml') ? 'poetry' : 'pip',
      framework,
      startCommand,
      port,
      hasDockerfile: false,
      environmentVariables: await this.extractEnvExample(userId, owner, repo, branch, rootFiles),
      warnings,
    };
  }

  private detectNodeFramework(deps: Record<string, string | undefined>, rootFiles: string[]): string | undefined {
    if (deps.next) return 'next';
    if (deps.vite || rootFiles.includes('vite.config.ts') || rootFiles.includes('vite.config.js')) return 'vite';
    if (deps['react-scripts']) return 'react';
    if (deps.express) return 'express';
    if (deps.fastify) return 'fastify';
    if (deps['@nestjs/core']) return 'nestjs';
    return undefined;
  }

  private async extractEnvExample(userId: string, owner: string, repo: string, branch: string, rootFiles: string[]): Promise<DetectedEnvVar[]> {
    const envFile = rootFiles.find((f) => f === '.env.example' || f === '.env.sample');
    if (!envFile) return [];
    const content = await this.github.getFileContent(userId, owner, repo, envFile, branch);
    if (!content) return [];

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=').trim();
        return { key: key.trim(), required: value.length === 0, defaultValue: value || undefined };
      });
  }

  private extractDockerfileEnvVars(dockerfile: string): DetectedEnvVar[] {
    const matches = [...dockerfile.matchAll(/^ENV\s+([A-Z0-9_]+)(?:\s+(.*))?$/gm)];
    return matches.map((m) => ({ key: m[1]!, required: !m[2], defaultValue: m[2]?.trim() }));
  }
}
