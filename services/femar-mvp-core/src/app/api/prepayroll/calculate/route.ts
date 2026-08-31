import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/sessionAuth';

export async function POST(request: Request) {
  try {
    const user = await requireModuleAccess('workforce-ai');
    if (user instanceof NextResponse) return user;

    const data = await request.json();
    const rows = data.rows || [];

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: 'El formato de datos debe ser un array de filas.' }, { status: 400 });
    }

    // Calcular horas básicas matemáticamente (Sin usar IA para ahorrar recursos)
    // Suponemos que cada fila representa un empleado en un día
    const processedPayroll = rows.map((row: any, index) => {
      // Reglas de negocio duras (Ejemplo básico)
      let hoursWorked = Number(row['Horas Trabajadas'] || row['hours'] || 8);
      let hourlyRate = Number(row['Tarifa'] || row['rate'] || 5);
      
      let basePay = hoursWorked * hourlyRate;
      let overtimePay = 0;

      if (hoursWorked > 8) {
        const extraHours = hoursWorked - 8;
        overtimePay = extraHours * (hourlyRate * 1.5);
        basePay = 8 * hourlyRate; // Cap base hours
      }

      const totalBruto = basePay + overtimePay;

      return {
        id: row.id || row['ID'] || index,
        empleado: row.empleado || row['Nombre'] || `Empleado ${index + 1}`,
        horasTrabajadas: hoursWorked,
        horasExtras: hoursWorked > 8 ? hoursWorked - 8 : 0,
        sueldoBase: basePay,
        pagoExtras: overtimePay,
        totalBruto: totalBruto,
        estado: 'procesado'
      };
    });

    const totalNominaBruta = processedPayroll.reduce((acc, curr) => acc + curr.totalBruto, 0);

    return NextResponse.json({
      success: true,
      message: 'Nómina calculada matemáticamente con éxito.',
      summary: {
        empleadosProcesados: processedPayroll.length,
        totalNominaBruta: totalNominaBruta
      },
      data: processedPayroll
    });
  } catch (error: any) {
    console.error('Error procesando prepayroll:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
