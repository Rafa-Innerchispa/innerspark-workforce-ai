export const generateDeterministicPayroll = (employees: any[], logs: any[]) => {
  return employees.map(emp => {
    // Count true logs for this employee
    const empLogs = logs.filter(log => log.user_id === emp.id);
    const logsCount = empLogs.length;

    const baseSalary = emp.baseSalary || 500;
    
    // Deterministic logic based purely on real logs count
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
