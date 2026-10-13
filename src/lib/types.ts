import type { Goal, Investment, Transaction } from "@prisma/client";

/**
 * Formas serializadas que as páginas (server) passam para os componentes
 * client: Decimal vira number e Date vira string ISO.
 */
export type SerializedTransaction = Omit<Transaction, "amount" | "date" | "createdAt"> & {
  amount: number;
  date: string;
  createdAt: string;
  category: { name: string; color: string; icon: string | null };
  account: { name: string };
};

export type SerializedGoal = Omit<Goal, "targetAmount" | "currentAmount" | "deadline" | "createdAt"> & {
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  createdAt: string;
};

export type SerializedInvestment = Omit<Investment, "investedAmount" | "currentAmount" | "date" | "createdAt"> & {
  investedAmount: number;
  currentAmount: number;
  date: string;
  createdAt: string;
};
