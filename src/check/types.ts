export type Severity = "error" | "warning" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  /** Path relative to the project root, forward slashes. */
  file: string;
  selector: string;
  line?: number;
  message: string;
  /** One-line suggestion of how to fix it. */
  fix: string;
}

export interface CheckReport {
  projectDir: string;
  filesChecked: number;
  findings: Finding[];
  errors: number;
  warnings: number;
}
