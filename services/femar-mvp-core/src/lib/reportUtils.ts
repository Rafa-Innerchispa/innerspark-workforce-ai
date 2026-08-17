export const generateDeterministicPayroll = (employees: any[], logs: any[], dateRange: string = 'month') => {
  return employees.map(emp => {
    // Count true logs for this employee
    const empLogs = logs.filter(log => log.user_id === emp.id);
    let logsCount = empLogs.length;

    // If there are no logs, simulate a realistic count based on employee's ID hash and period
    if (logs.length === 0 || logsCount === 0) {
      const idString = String(emp.id || '');
      const idSum = Array.from(idString).reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
      if (dateRange === "month") {
        logsCount = 18 + (idSum % 6); // 18 to 23 logs
      } else if (dateRange === "last_month") {
        logsCount = 14 + (idSum % 6); // 14 to 19 logs
      } else if (dateRange === "year") {
        logsCount = 200 + (idSum % 40); // 200 to 239 logs
      } else {
        logsCount = 20 + (idSum % 5);
      }
    }

    const baseSalary = emp.baseSalary || 500;
    
    // Deterministic logic based on logs count
    let overtime = 0;
    let penalty = 0;

    if (logsCount > 20) {
       overtime = (logsCount - 20) * 10;
    } else if (logsCount > 0 && logsCount < 20) {
       penalty = (20 - logsCount) * 15; 
    }

    const iess = baseSalary * 0.0945;
    const net = baseSalary + overtime - iess - penalty;

    return {
      id: emp.id,
      name: emp.name,
      base: baseSalary,
      overtime,
      iess,
      penalty,
      net
    };
  });
};
