import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { idNumber } = await req.json();

    if (!idNumber) {
      return NextResponse.json({ error: "Número de cédula/RUC requerido" }, { status: 400 });
    }

    // 1. Generate Token
    const tokenResponse = await fetch("https://consulta-ruc-token.azurewebsites.net/v1/deuna/creacion-token", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario: "deuna-ruc",
        pass: "BXQbDtMt"
      })
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "Error al autenticar con el SRI" }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData?.data?.response;

    if (!token) {
      return NextResponse.json({ error: "Token inválido del SRI" }, { status: 500 });
    }

    // 2. Fetch RUC/Cedula info
    // The API seems to require 13 digits (RUC). If the user provides a 10 digit ID, we can append 001.
    const rucQuery = idNumber.length === 10 ? `${idNumber}001` : idNumber;

    const rucResponse = await fetch(`https://consulta-ruc-token.azurewebsites.net/api/ruc/${rucQuery}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!rucResponse.ok) {
      return NextResponse.json({ error: "Identificación no encontrada o inválida" }, { status: 404 });
    }

    const rucData = await rucResponse.json();
    
    // Parse the data
    const entity = rucData?.data?.main?.[0];
    if (!entity) {
      return NextResponse.json({ error: "Datos no encontrados" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        numeroRuc: entity.numeroRuc,
        razonSocial: entity.razonSocial,
        nombreComercial: entity.nombreComercial,
        actividadContribuyente: entity.actividadContribuyente
      }
    });

  } catch (error) {
    console.error("API Validate ID Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
