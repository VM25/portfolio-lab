import validation from "@/data/validation-summary.json";
import type { ValidationSummary } from "@/lib/types";

export const validationSummary = validation as unknown as ValidationSummary;
