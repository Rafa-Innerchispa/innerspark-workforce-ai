import { mockEmployees } from "./mockData";

export const getDeterministicRandom = (seed: string, min: number, max: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; 
  }
  const random = Math.abs(hash) / 2147483647;
  return Math.floor(random * (max - min + 1)) + min;
};

export const generatePayrollReport = (period: string = "") => {
  return mockEmployees.map(emp => {
    // Stable pseudo-random values based on employee ID AND period so they never change between renders for the same month
    const overtime = emp.status === "Liquidado" ? 0 : getDeterministicRandom(emp.id + period + "ot", 0, 50);
    const penalty = emp.status === "Vacaciones" ? 0 : getDeterministicRandom(emp.id + period + "pen", 0, 20);
    
    const iess = emp.baseSalary * 0.0945;
    const net = emp.baseSalary + overtime - iess - penalty;
    
    return {
      id: emp.id,
      name: emp.name,
      base: emp.baseSalary,
      overtime,
      iess,
      penalty,
      net
    };
  });
};

export const getPayrollSummary = (period: string = "") => {
  const report = generatePayrollReport(period);
  const totalBase = report.reduce((sum, r) => sum + r.base, 0);
  const totalIESS = report.reduce((sum, r) => sum + r.iess, 0);
  const totalPenalty = report.reduce((sum, r) => sum + r.penalty, 0);
  const totalOvertime = report.reduce((sum, r) => sum + r.overtime, 0);
  const totalNet = report.reduce((sum, r) => sum + r.net, 0);

  return {
    count: report.length,
    totalBase,
    totalIESS,
    totalPenalty,
    totalOvertime,
    totalNet
  };
};
